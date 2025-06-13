import express from "express";
import axios from "axios";
import sequelize from "#configs/database";
import asyncHandler from "#utils/asyncHandler";
import BrokerKeyService from "#services/brokerKey";
import { session } from "#middlewares/requestSession";
import { sendResponse } from "#utils/response";
import httpStatus from "http-status";
import { isWithinTradingHoursIST } from "#utils/dayChecker";

const router = express.Router();

router.route("/login/:id?").get(
  asyncHandler(async function (req, res, next) {
    const { code, state } = req.query;
    const { id } = req.params;

    if (!isWithinTradingHoursIST()) {
      return res.status(400).json({
        status: false,
        message: "Please login on a weekday after 8:30 AM and before 3:00 PM",
      });
    }

    const key = await BrokerKeyService.getDoc({
      id,
    });

    if (!code) return res.status(400).send("Authorization code not provided");

    session.set("transaction", await sequelize.transaction());

    const tokenRes = await axios.post(
      "https://api.upstox.com/v2/login/authorization/token",
      new URLSearchParams({
        code,
        client_id: key.apiKey,
        client_secret: key.apiSecret,
        redirect_uri: key.redirectUrl,
        grant_type: "authorization_code",
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          accept: "application/json",
        },
      },
    );

    const { access_token, refresh_token, expires_at } = tokenRes.data;
    key.token = access_token;
    key.status = true;

    await key.save();
    sendResponse(httpStatus.OK, res, null, "Logged in successfully");
  }),
);

export default router;
