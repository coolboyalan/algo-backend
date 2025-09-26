import axios from "axios";
import express from "express";
import httpStatus from "http-status";
import AppError from "#utils/appError";
import sequelize from "#configs/database";
import asyncHandler from "#utils/asyncHandler";
import { sendResponse } from "#utils/response";
import BrokerKeyService from "#services/brokerKey";
import { session } from "#middlewares/requestSession";
import { isWithinTradingHoursIST } from "#utils/dayChecker";

const router = express.Router();

router.route("/login/:id?").get(
  asyncHandler(async function login(req, res, next) {
    const { auth_token, feed_token, state } = req.query;
    const { id } = req.params;

    // Validate trading hours
    if (!isWithinTradingHoursIST()) {
      return res.status(400).json({
        status: false,
      });
    }

    if (!auth_token || !feed_token) {
      return res.status(401).json({
        error: "Invalid or missing auth tokens. Please login again",
      });
    }

    const brokerKey = await BrokerKeyService.getDoc({
      id,
    });

    console.log(brokerKey);

    // Step 1: Get user profile using auth_token as JWT token
    const profileResponse = await axios.get(
      "https://apiconnect.angelone.in/rest/secure/angelbroking/user/v1/getProfile",
      {
        headers: {
          Authorization: `Bearer ${auth_token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-UserType": "USER",
          "X-SourceID": "WEB",
          "X-ClientLocalIP": req.ip || "127.0.0.1",
          "X-ClientPublicIP": req.ip || "127.0.0.1",
          "X-MACAddress": "MAC_ADDRESS",
          "X-PrivateKey": brokerKey.apiKey,
        },
      },
    );

    if (!profileResponse.data.status) {
      throw new AppError({
        status: false,
        message: "Failed to fetch user profile from AngelOne",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    const profile = profileResponse.data.data;

    if (!profile) {
      throw new AppError({
        status: false,
        message: "AngelOne is down or profile unavailable",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    async function getIntradayBalance({
      apiKey,
      token,
      clientLocalIP = "127.0.0.1",
      clientPublicIP = "127.0.0.1",
      macAddress = "AA:BB:CC:DD:EE:FF",
    }) {
      try {
        const res = await axios.get(`${BASE_URL}/user/v1/getRMS`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-PrivateKey": apiKey,
            "X-UserType": "USER",
            "X-SourceID": "WEB",
            "X-ClientLocalIP": clientLocalIP,
            "X-ClientPublicIP": clientPublicIP,
            "X-MACAddress": macAddress,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        return res.data?.data?.availablecash;
      } catch (err) {
        console.error(
          "Error fetching Intraday Balance:",
          err.response?.data || err.message,
        );
        return 0;
      }
    }

    const balance = await getIntradayBalance({
      apiKey: brokerKey.apiKey,
      token: auth_token,
    });

    // Step 2: Update broker key with new tokens
    session.set("transaction", await sequelize.transaction());
    brokerKey.token = auth_token; // JWT token for API calls
    brokerKey.tokenDate = new Date();
    brokerKey.status = true;
    brokerKey.balance = balance;

    await brokerKey.save();

    sendResponse(
      httpStatus.OK,
      res,
      {
        profile,
        accessToken: auth_token,
        feedToken: feed_token,
      },
      "Login successful",
    );
  }),
);

export default router;
