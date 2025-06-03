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

class KiteController extends BaseController {
  static async login(req, res, next) {
    try {
      const { request_token } = req.query;
      const { userId } = req.params;

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

      const brokerKey = await BrokerKeyService.getDoc({ userId });

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

      // Step 4: Get token and buffer based on day
      const isSpecialDay = isMondayOrFridayInIST();
      const token = isSpecialDay ? 265 : 256265;
      const buffer = isSpecialDay ? 45 : 15;

      // Optional: Fetch OHLC if needed
      const lastOhlc = await getLastTradingDayOHLC(token);
      brokerKey.token = accessToken;
      brokerKey.tokenDate = new Date();
      brokerKey.status = true;

      await brokerKey.save();

      // Step 5: Generate levels and store globally
      const todayData = await DailyLevelService.create(token);

      return res.status(200).json({
        message: "Login successful",
        profile,
        token,
        buffer,
        levels: todayData,
      });
    } catch (err) {
      console.error(err?.response?.data || err.message);
      return res.status(500).json({ error: "Login failed" });
    }
  }
}

export default KiteController;
