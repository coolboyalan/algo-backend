import BaseModel from "#models/base";
import { DataTypes } from "sequelize";

class OptionPriceGap extends BaseModel {}

OptionPriceGap.initialize({
  price: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0,
      max: 1000,
    },
  },
});

export default OptionPriceGap;
