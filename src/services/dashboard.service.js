import { Op, fn, col, literal } from "sequelize";
// Make sure to import your actual initialized Sequelize models
import Trade from "#models/trade";
import Broker from "#models/broker";
import User from "#models/user";
import BrokerKey from "#models/brokerKey"; // Assuming BrokerKey model is imported
import Asset from "#models/asset";

async function getDashboardData({ userId }) {
  if (!userId) {
    throw new Error("User ID is required to fetch dashboard data.");
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  try {
    // 1. Overall P&L (for the specified user)
    const overallPnlResult = await Trade.findOne({
      attributes: [[fn("SUM", col("profitAndLoss")), "totalPnl"]],
      where: {
        userId: userId,
        type: "exit",
        profitAndLoss: { [Op.not]: null },
      },
      raw: true,
    });
    const overallPnl = parseFloat(overallPnlResult?.totalPnl) || 0;

    // 2. Broker Key Performance Data
    // Step 2a: Get all BrokerKeys for the user, with associated Broker info
    const userBrokerKeys = await BrokerKey.findAll({
      where: { userId: userId },
      include: [
        // Ensure your Broker model has a 'currency' field if you want to fetch it.
        // If not, it will rely on the 'INR' default in the mapping.
        { model: Broker, attributes: ["name"] },
        // { model: User, attributes: ['name'] } // Optional: if you need User.name for each key
      ],
      raw: false,
      nest: true,
    });

    if (!userBrokerKeys || userBrokerKeys.length === 0) {
      return {
        brokers: [],
        pnlTrendData: [],
        winLossData: [
          { name: "Winning Trades", value: 0, color: "#10B981" },
          { name: "Losing Trades", value: 0, color: "#EF4444" },
        ],
        overallPnl: 0,
        activeBrokersCount: 0,
        totalTrades: 0,
        lastUpdated: new Date().toISOString(),
      };
    }

    // Step 2b: Get all relevant trade aggregates for this user, grouped by brokerId
    const tradeAggregatesByBroker = await Trade.findAll({
      attributes: [
        "brokerId",
        [fn("SUM", col("profitAndLoss")), "totalPnlForBroker"],
        [fn("COUNT", col("id")), "totalTradesForBroker"],
        [
          fn("SUM", literal(`CASE WHEN "profitAndLoss" > 0 THEN 1 ELSE 0 END`)),
          "winningTradesForBroker",
        ],
      ],
      where: {
        userId: userId,
        type: "exit",
        profitAndLoss: { [Op.not]: null },
        brokerId: { [Op.in]: userBrokerKeys.map((bk) => bk.brokerId) },
      },
      group: ["brokerId"],
      raw: true,
    });

    const aggregatesMap = new Map();
    tradeAggregatesByBroker.forEach((agg) => {
      aggregatesMap.set(agg.brokerId, agg);
    });

    // Step 2c: Map BrokerKeys and merge with trade aggregates
    // This 'brokers' array is used for Broker Key Status tiles and P&L by Broker Key chart
    const mappedBrokerKeys = userBrokerKeys.map((bk) => {
      const aggregates = aggregatesMap.get(bk.brokerId) || {}; // Get aggregates for this brokerId
      return {
        id: bk.id, // BrokerKey.id - for unique key in React loops
        name: bk.Broker?.name || `Broker ${bk.brokerId}`, // Name from joined Broker model
        status: bk.status ? "active" : "inactive", // Status from BrokerKey model (true/false mapped to string)
        pnl: parseFloat(aggregates.totalPnlForBroker) || 0, // Numerical P&L
        totalTrades: parseInt(aggregates.totalTradesForBroker) || 0, // Numerical count
        winningTrades: parseInt(aggregates.winningTradesForBroker) || 0, // Numerical count
        currency: bk.Broker?.currency || "INR", // Currency from Broker model or default
      };
    });

    // 3. Active Keys Count (based on BrokerKey.status)
    const activeBrokersCount = userBrokerKeys.filter(
      (bk) => bk.status === true,
    ).length;

    // 4. P&L Trend (Last 30 Days) - User-wide
    // This produces an array of { date: 'YYYY-MM-DD', pnl: number }
    const pnlTrend = await Trade.findAll({
      attributes: [
        [fn("DATE", col("tradeTime")), "tradeDate"],
        [fn("SUM", col("profitAndLoss")), "dailyPnl"],
      ],
      where: {
        userId: userId,
        type: "exit",
        profitAndLoss: { [Op.not]: null },
        tradeTime: { [Op.gte]: thirtyDaysAgo },
      },
      group: [fn("DATE", col("tradeTime"))],
      order: [[fn("DATE", col("tradeTime")), "ASC"]],
      raw: true,
    });
    const formattedPnlTrend = pnlTrend.map((day) => ({
      date: day.tradeDate, // This will be a string like 'YYYY-MM-DD'
      pnl: parseFloat(day.dailyPnl) || 0, // Numerical P&L
    }));

    // 5. Trade Success Ratio (Winning vs Losing Trades) - User-wide
    // This produces an array of { name: string, value: number, color: string }
    const tradeStats = await Trade.findOne({
      attributes: [
        [fn("COUNT", col("id")), "totalExitTrades"],
        [
          fn("SUM", literal(`CASE WHEN "profitAndLoss" > 0 THEN 1 ELSE 0 END`)),
          "totalWinningExitTrades",
        ],
      ],
      where: {
        userId: userId,
        type: "exit",
        profitAndLoss: { [Op.not]: null },
      },
      raw: true,
    });
    const totalExitTrades = parseInt(tradeStats?.totalExitTrades) || 0;
    const totalWinningExitTrades =
      parseInt(tradeStats?.totalWinningExitTrades) || 0;
    const totalLosingExitTrades = totalExitTrades - totalWinningExitTrades;
    const winLossData = [
      {
        name: "Winning Trades",
        value: totalWinningExitTrades,
        color: "#10B981",
      },
      { name: "Losing Trades", value: totalLosingExitTrades, color: "#EF4444" },
    ];

    const summaryTotalTrades = totalExitTrades; // Numerical total for summary card

    return {
      brokers: mappedBrokerKeys,
      pnlTrendData: formattedPnlTrend,
      winLossData: winLossData,
      overallPnl: overallPnl, // Number
      activeBrokersCount: activeBrokersCount, // Number
      totalTrades: summaryTotalTrades, // Number
      lastUpdated: new Date().toISOString(), // String
    };
  } catch (error) {
    console.error("Error fetching dashboard data with Sequelize:", error);
    throw new Error("Could not retrieve dashboard data due to a server error.");
  }
}

export { getDashboardData };
