import User from "#models/user";
import Broker from "#models/broker";
import BaseModel from "#models/base";
import { DataTypes } from "sequelize";

class Trade extends BaseModel {}

Trade.initialize({
  brokerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Broker,
      key: Broker.primaryKeyAttribute,
    },
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: User.primaryKeyAttribute,
    },
  },
  baseAsset: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  asset: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  parentTrade: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  profitAndLoss: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  tradeTime: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  direction: {
    type: DataTypes.ENUM("buy", "sell"),
    allowNull: false,
  },
});

Trade.belongsTo(User, {
  foreignKey: "userId",
});

Trade.belongsTo(Broker, {
  foreignKey: "brokerId",
});

export default Trade;
