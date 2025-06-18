import DailyLevel from "#models/dailyLevel";
import Service from "#services/base";
import {
  isMondayOrFridayInIST,
  getISTMidnightFakeUTCString,
} from "#utils/dayChecker";

class DailyLevelService extends Service {
  static Model = DailyLevel;

  static async create({ instrumentToken, apiKey, accessToken }) {
    const today = getISTMidnightFakeUTCString();
    const data = await getLastTradingDayOHLC({
      instrumentToken,
      apiKey,
      accessToken,
    });
    if (!data) return null;

    data.forDay = today;
    const { high, low, close } = data;

    const existing = await this.Model.findOne({
      where: { forDay: today },
    });
    if (existing) return existing.toJSON();

    const pivot = parseFloat(((high + low + close) / 3).toFixed(2));
    const tc = parseFloat(((high + low) / 2).toFixed(2));
    const bc = parseFloat((pivot - tc + pivot).toFixed(2));
    const r1 = parseFloat((2 * pivot - low).toFixed(2));
    const r2 = parseFloat((pivot + (high - low)).toFixed(2));
    const r3 = parseFloat((r1 + (high - low)).toFixed(2));
    const r4 = parseFloat((r2 + (high - low)).toFixed(2));
    const s1 = parseFloat((2 * pivot - high).toFixed(2));
    const s2 = parseFloat((pivot - (high - low)).toFixed(2));
    const s3 = parseFloat((s1 - (high - low)).toFixed(2));
    const s4 = parseFloat((s2 - (high - low)).toFixed(2));

    const date = new Date().toISOString().split("T")[0];
    const percentageValue = parseFloat((bc * 0.0006).toFixed(2));
    const buffer = Math.round(percentageValue);

    const level = await this.Model.create({
      bc,
      tc,
      r1,
      r2,
      r3,
      r4,
      s1,
      s2,
      s3,
      s4,
      date: data.date,
      forDay: today,
      buffer,
    });

    return level.toJSON();
  }
}

function getISTDate(date) {
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(date.getTime() + istOffset);
}

export async function getLastTradingDayOHLC({
  instrumentToken,
  apiKey,
  accessToken,
}) {
  const maxTries = 10;
  let date = new Date();
  date.setDate(date.getDate() - 1);

  for (let i = 0; i < maxTries; i++) {
    const day = date.getDay(); // Sunday = 0, Saturday = 6

    if (day !== 0 && day !== 6) {
      const fromDate = date.toISOString().split("T")[0];
      const toDate = fromDate;

      const url = `https://api.kite.trade/instruments/historical/${instrumentToken}/day?from=${fromDate}&to=${toDate}`;

      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "X-Kite-Version": "3",
            Authorization: `token ${apiKey}:${accessToken}`,
          },
        });

        const data = await response.json();

        if (response.ok && data.data?.candles?.length > 0) {
          const [dateTime, open, high, low, close] = data.data.candles[0];
          return {
            date: getISTDate(date),
            open,
            high,
            low,
            close,
          };
        } else {
          console.warn(`No data for ${fromDate}`);
        }
      } catch (err) {
        console.error(`Error fetching data for ${fromDate}:`, err.message);
      }
    }

    date.setDate(date.getDate() - 1);
  }

  console.error("No trading data found in the last 10 days.");
  return null;
}
export default DailyLevelService;
