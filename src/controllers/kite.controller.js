import kite from "#configs/kite";
import httpStatus from "http-status";
import BaseController from "#controllers/base";
import AppError from "#utils/appError";
import {
  isWithinTradingHoursIST,
  isMondayOrFridayInIST,
  isWorkingDay,
} from "#utils/dayChecker";
import axios from "axios";
import crypto from "crypto";
import BrokerKeyService from "#services/brokerKey";
import BrokerService from "#services/broker";
import TradeService from "#services/trade";
import { getLastTradingDayOHLC } from "#services/dailyLevel";
import AssetService from "#services/asset";
import DailyAsset from "#services/dailyAsset";
import DailyLevelService from "#services/dailyLevel";
import { sendResponse } from "#utils/response";

class KiteController extends BaseController {
  static async login(req, res, next) {
    try {
      const { request_token } = req.query;
      const { userId } = req.params;

      // Validate trading hours
      if (!!isWithinTradingHoursIST()) {
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

      const broker = await BrokerService.getDoc({ name: "Zerodha" });
      const brokerKey = await BrokerKeyService.getDoc({
        userId,
        brokerId: broker.id,
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

      const session = sessionResponse.data.data;
      const accessToken = session.access_token;

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
        return res.status(500).json({ error: "Failed to fetch profile" });
      }

      const now = new Date();

      const day = TradeService.dayMap[now.getDay()];

      const asset = await DailyAsset.getDoc(
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

      // Optional: Fetch OHLC if needed
      const lastOhlc = await getLastTradingDayOHLC({
        instrumentToken: assetToken,
        apiKey: brokerKey.apiKey,
        accessToken,
      });
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
    } catch (err) {
      console.error(err?.response?.data || err.message);
      return res.status(500).json({ error: "Login failed" });
    }
  }
}

export default KiteController;
