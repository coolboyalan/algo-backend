import BaseModel from "#models/base";
import { DataTypes } from "sequelize";

class Asset extends BaseModel {}

Asset.initialize({
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    //WARN: Unique constraint missing
  },
});

export default Asset;
