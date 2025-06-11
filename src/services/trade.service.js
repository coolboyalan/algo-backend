import cron from "node-cron";
import Asset from "#models/asset";
import Trade from "#models/trade";
import BaseService from "#services/base";
import BrokerKeyService from "#services/brokerKey";
import DailyAssetService from "#services/dailyAsset";
import Broker from "#models/broker";
import User from "#models/user";
import DailyLevelService from "#services/dailyLevel";
import { getSpecificCachedOption } from "#utils/assetChecker";

class TradeService extends BaseService {
  static Model = Trade;

  static dayMap = {
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
  };

  static dailyAsset = null;
  static keys = null;
  static adminKey = null;
  static dailyAssetToken = null;
  static dailyLevel = null;
  static lastTrade = null;
}

cron.schedule("* * * * * *", async () => {
  const now = new Date();
  try {
    console.log(new Date());
    // Get IST time by adding offset to UTC
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);

    const hour = istNow.getUTCHours();
    const minute = istNow.getUTCMinutes();
    const second = istNow.getUTCSeconds();

    // Only run every 3 minutes at 00 second, between 09:18 and 15:30 IS
    const isInRange =
      (hour === 7 && minute >= 30) ||
      (hour > 7 && hour < 15) ||
      (hour === 15 && minute <= 30);
    //

    const preRange =
      (hour === 7 && minute >= 30) ||
      (hour > 7 && hour < 15) ||
      (hour === 15 && minute <= 30);

    // NOTE: Change this to minute
    if (preRange && second % 1 === 0 /*&& second === 40*/) {
      if (!TradeService.dailyAsset) {
        const day = TradeService.dayMap[now.getDay()];

        const dailyAsset = await DailyAssetService.getDoc(
          { day },
          {
            include: [
              {
                model: Asset,
                attributes: ["id", "name", "zerodhaToken"],
              },
            ],
            allowNull: false,
          },
        );

        TradeService.dailyAsset = dailyAsset.Asset.name;
        TradeService.dailyAssetToken = dailyAsset.Asset.zerodhaToken;
        TradeService.lastTrade = await TradeService.getDoc(
          { type: "exit" },
          { allowNull: true },
        );
      }

      const keys = await BrokerKeyService.Model.findAll({
        where: { status: true },
        include: [
          {
            model: Broker,
            attributes: ["id", "name"],
          },
          {
            model: User,
            attributes: ["id", "role"],
          },
        ],
      });

      TradeService.keys = keys;

      TradeService.adminKey = keys.find((ele) => {
        return ele.Broker.name === "Zerodha" && ele.User.role === "admin";
      });

      TradeService.dailyLevel = await DailyLevelService.getDoc(
        {},
        { raw: true },
      );
    }
    if (isInRange /**&& minute % 3 === 0 && second === 0*/) {
      const formatDate = (dateObj) => {
        const y = dateObj.getUTCFullYear();
        const m = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
        const d = String(dateObj.getUTCDate()).padStart(2, "0");
        const h = String(dateObj.getUTCHours()).padStart(2, "0");
        const min = String(dateObj.getUTCMinutes()).padStart(2, "0");
        return `${y}-${m}-${d} ${h}:${min}:00`;
      };

      const toTime = formatDate(istNow);
      const fromTime = formatDate(new Date(istNow.getTime() - 3 * 60 * 1000));

      const instrumentToken = TradeService.dailyAssetToken;
      const interval = "3minute";
      const apiKey = TradeService.adminKey.apiKey;
      const accessToken = TradeService.adminKey.token;

      const url = `https://api.kite.trade/instruments/historical/${instrumentToken}/${interval}?from=${encodeURIComponent(fromTime)}&to=${encodeURIComponent(toTime)}&continuous=false`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "X-Kite-Version": "3",
          Authorization: `token ${apiKey}:${accessToken}`,
        },
      });

      const json = await response.json();

      if (!response.ok) {
        console.error("Error fetching historical data:", json);
        throw new Error(json.message || "Kite API error");
      }

      const { data } = json;

      if (!data || !Array.isArray(data.candles) || data.candles.length === 0) {
        console.log("No candle data available");
        return;
      }

      // Get the last candle in the array
      const latestCandle = data.candles[data.candles.length - 1];

      // The candle format is: [timestamp, open, high, low, close, volume, (oi)]
      const price = latestCandle[4]; // 4th index = close price

      if (price === null || price === undefined) {
        return console.log("Invalid Price");
      }

      const { bc, tc, r1, r2, r3, r4, s1, s2, s3, s4 } =
        TradeService.dailyLevel;

      const BUFFER = TradeService.dailyLevel.buffer;
      let signal = "No Action";
      let reason = "Price is in a neutral zone.";
      let direction;
      let assetPrice;
      let lastTrade = TradeService.lastTrade;

      if (price % 100 > 50) {
        assetPrice = parseInt(price / 100) * 100 + 100;
      } else {
        assetPrice = parseInt(price / 100) * 100;
      }

      // If price is above TC and within TC + BUFFER, Buy
      if (price >= tc && price <= tc + BUFFER) {
        direction = "CE";
        signal = "Buy";
        reason = "Price is above TC within buffer.";
      }
      // If price is below BC and within BC - BUFFER, Sell
      else if (price <= bc && price >= bc - BUFFER) {
        direction = "PE";
        signal = "Sell";
        reason = "Price is below BC within buffer.";
      }
      // If price is between TC and BC, No Action
      else if (price < tc && price > bc && lastTrade) {
        direction = lastTrade;
        signal = "Exit";
        reason = "Price is within CPR range.";
      }

      const levelsMap = { r1, r2, r3, r4, s1, s2, s3, s4 };

      Object.entries(levelsMap).forEach(([levelName, level]) => {
        if (price > level && price <= level + BUFFER) {
          signal = "Buy";
          reason = `Price is above ${levelName} (${level}) within buffer.`;
          direction = "CE";
        } else if (price < level && price >= level - BUFFER) {
          signal = "Sell";
          reason = `Price is below ${levelName} (${level}) within buffer.`;
          direction = "PE";
        }
      });

      const innerLevelMap = { r1, r2, r3, r4, s1, s2, s3, s4, tc, bc };

      Object.entries(innerLevelMap).find(([levelName, level]) => {
        if (signal === "No Action" && lastTrade) {
          if (lastTrade === "PE") {
            if (data.close > level && data.open < level) {
              signal = "Exit";
              reason = `Price crossed the level ${levelName}`;
              return true;
            }
          } else {
            if (data.close < level && data.open > level) {
              signal = "Exit";
              reason = `Price crossed the level ${levelName}`;
              return true;
            }
          }
        }
      });

      if (signal === "No Action") {
        return;
      }

      if (signal === "Exit") {
        await exitOrder(lastTrade.asset);
        TradeService.lastTrade = null;

        //NOTE: Add a exit db entry
        return;
      }

      const symbol = getSpecificCachedOption(
        TradeService.dailyAsset,
        assetPrice,
        direction,
      );

      if (lastTrade) {
        if (direction === lastTrade.direction) return;
        await exitOrder(lastTrade.asset);
        // NOTE: Add exit entry in db

        await newOrder(symbol);
        //NOTE: Add new entry in db

        lastTrade = direction;  //NOTE: Assign new trade here
        lastAsset = symbol;
      } else {
        await newOrder(symbol);
        lastAsset = symbol;
        lastTrade = direction;
      }
    }
  } catch (e) {
    console.log(e);
    console.log(true);
  }
});

export default TradeService;
