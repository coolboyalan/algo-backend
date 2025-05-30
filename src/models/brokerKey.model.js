import User from "#models/user";
import Broker from "#models/broker";
import BaseModel from "#models/base";
import { DataTypes } from "sequelize";

class BrokerKey extends BaseModel {}

BrokerKey.initialize(
  {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: User.primaryKeyAttribute,
      },
    },
    brokerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Broker,
        key: Broker.primaryKeyAttribute,
      },
    },
    apiKey: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    apiSecret: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    tokenDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    indexes: [
      {
        unique: true,
        fields: ["userId", "brokerId"],
      },
    ],
  },
);

export default BrokerKey;
