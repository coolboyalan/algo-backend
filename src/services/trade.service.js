import cron from "node-cron";
import Asset from "#models/asset";
import Trade from "#models/trade";
import BaseService from "#services/base";
import BrokerKeyService from "#services/brokerKey";
import DailyAssetService from "#services/dailyAsset";

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
      (hour === 9 && minute >= 30) ||
      (hour > 9 && hour < 15) ||
      (hour === 15 && minute <= 30);
    //

    const preRange =
      (hour === 7 && minute >= 30) ||
      (hour > 7 && hour < 15) ||
      (hour === 15 && minute <= 30);

    if (preRange && minute % 1 === 0 && second === 40) {
      if (!TradeService.dailyAsset) {
        const day = TradeService.dayMap[now.getDay()];
        const dailyAsset = await DailyAssetService.getDoc(
          { day },
          {
            include: [
              {
                model: Asset,
                attributes: ["id", "name"],
              },
            ],
            allowNull: false,
          },
        );
        TradeService.dailyAsset = dailyAsset.Asset.name;
      }
      const keys = await BrokerKeyService.Model.findAll({
        where: { status: true },
      });

      console.log(keys);
    }

    if (isInRange && minute % 3 === 0 && second === 0) {
      const formatDate = (dateObj) => {
        const y = dateObj.getUTCFullYear();
        const m = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
        const d = String(dateObj.getUTCDate()).padStart(2, "0");
        const h = String(dateObj.getUTCHours()).padStart(2, "0");
        const min = String(dateObj.getUTCMinutes()).padStart(2, "0");
        return `${y}-${m}-${d} ${h}:${min}:00`;
      };

      // TO = current IST time
      const toTime = formatDate(istNow);

      // FROM = IST time - 3 minutes
      const fromTime = formatDate(new Date(istNow.getTime() - 3 * 60 * 1000));
      let [data] = await kite.getHistoricalData(
        global.levels.token,
        "3minute",
        fromTime,
        toTime,
      );

      const { close: price } = data;

      if (price === null || price === undefined) {
        console.log("Invalid Price");
      }

      const { bc, tc, r1, r2, r3, r4, s1, s2, s3, s4 } = global.levels;

      const BUFFER = global.levels.buffer;
      let signal = "No Action";
      let reason = "Price is in a neutral zone.";
      let direction;
      let assetPrice;

      if (price % 100 > 50) {
        assetPrice = parseInt(price / 100) * 100 + 100;
      } else {
        assetPrice = parseInt(price / 100) * 100;
      }
      console.log(price, assetPrice, data);

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
        await exitOrder(lastAsset);
        lastTrade = null;
        lastAsset = null;
        return;
      }

      const symbol = `SENSEX25603${assetPrice}${direction}`;

      if (lastTrade) {
        if (direction === lastTrade) return;
        await exitOrder(lastAsset);
        await newOrder(symbol);
        lastTrade = direction;
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
