import axios from "axios";
import express from "express";
import crypto from "node:crypto";
import httpStatus from "http-status";
import AppError from "#utils/appError";
import sequelize from "#configs/database";
import AssetService from "#services/asset";
import asyncHandler from "#utils/asyncHandler";
import { sendResponse } from "#utils/response";
import BrokerKeyService from "#services/brokerKey";
import DailyAssetService from "#services/dailyAsset";
import DailyLevelService from "#services/dailyLevel";
import { session } from "#middlewares/requestSession";
import { isWithinTradingHoursIST } from "#utils/dayChecker";

const router = express.Router();

router.route("/login/:id?").get(
  asyncHandler(async function login(req, res, next) {
    const { request_token } = req.query;
    const { id } = req.params;

    // Validate trading hours
    if (!isWithinTradingHoursIST()) {
      return res.status(400).json({
        status: false,
        message: "Please login on a weekday after 8:30 AM and before 3:00 PM",
      });
    }

    if (!request_token) {
      return res.status(401).json({
        error: "Invalid or missing request token. Please login again",
      });
    }

    const brokerKey = await BrokerKeyService.getDoc({
      id,
    });

    // Step 1: Generate checksum for session exchange
    const checksum = crypto
      .createHash("sha256")
      .update(brokerKey.apiKey + request_token + brokerKey.apiSecret)
      .digest("hex");

    // Step 2: Exchange request_token for access_token
    const sessionResponse = await axios.post(
      "https://api.kite.trade/session/token",
      new URLSearchParams({
        api_key: brokerKey.apiKey,
        request_token,
        checksum,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    const sessionData = sessionResponse.data.data;
    const accessToken = sessionData.access_token;

    // Step 3: Fetch user profile
    const profileResponse = await axios.get(
      "https://api.kite.trade/user/profile",
      {
        headers: {
          Authorization: `token ${brokerKey.apiKey}:${accessToken}`,
        },
      },
    );

    const profile = profileResponse.data.data;

    if (!profile) {
      throw new AppError({
        status: false,
        message: "Zerodha is down",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    const dayMap = {
      1: "Monday",
      2: "Tuesday",
      3: "Wednesday",
      4: "Thursday",
      5: "Friday",
    };

    const now = new Date();
    const day = dayMap[now.getDay()];

    const asset = await DailyAssetService.getDoc(
      { day },
      {
        include: [
          {
            model: AssetService.Model,
          },
        ],
      },
    );

    const assetToken = asset.Asset.zerodhaToken;

    session.set("transaction", await sequelize.transaction());

    brokerKey.token = accessToken;
    brokerKey.tokenDate = new Date();
    brokerKey.status = true;

    await brokerKey.save();

    // Step 5: Generate levels and store globally
    const todayData = await DailyLevelService.create({
      instrumentToken: assetToken,
      apiKey: brokerKey.apiKey,
      accessToken,
    });

    sendResponse(200, res, { profile, accessToken }, "Login successful");
  }),
);

export default router;
