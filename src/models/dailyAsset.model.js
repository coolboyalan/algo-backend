import BaseModel from "#models/base";
import { DataTypes } from "sequelize";
import Asset from "#models/asset";

class DailyAsset extends BaseModel {
  static WeekdaysEnumArr = [
    "Monday", // 1
    "Tuesday", // 2
    "Wednesday", // 3
    "Thursday", // 4
    "Friday", // 5
  ];
}

DailyAsset.initialize({
  assetId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Asset,
      key: Asset.primaryKeyAttribute,
    },
  },
  day: {
    type: DataTypes.ENUM(DailyAsset.WeekdaysEnumArr),
    allowNull: false,
    unique: false,
  },
});

DailyAsset.belongsTo(Asset, {
  foreignKey: "assetId",
});

export default DailyAsset;
