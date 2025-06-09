import BaseModel from "#models/base";
import { DataTypes } from "sequelize";
import { INDEX_CONFIGS } from "#utils/assetChecker";

class Asset extends BaseModel {}

Asset.initialize({
  name: {
    type: DataTypes.ENUM(Object.keys(INDEX_CONFIGS)),
    allowNull: false,
    //WARN: Unique constraint missing
  },
  zerodhaToken: {
    type: DataTypes.INTEGER,
  },
});

export default Asset;
