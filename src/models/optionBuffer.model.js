import BaseModel from "#models/base";
import AppError from "#utils/appError";
import { DataTypes } from "sequelize";

class OptionBuffer extends BaseModel {}

OptionBuffer.initialize(
  {
    value: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true, // fixed typo "unqiue"
      validate: {
        min: 0,
        max: 2000,
        isDivisibleBy100(value) {
          if (value % 100 !== 0) {
            throw new Error("Value must be divisible by 100");
          }
        },
      },
    },
  },
  {
    hooks: {
      async beforeCreate(instance) {
        const count = await OptionBuffer.count();
        if (count > 0) {
          throw new AppError({
            status: false,
            message: "Only one entry allowed",
            httpStatus: httpStatus.CONFLICT,
          });
        }
      },
      async beforeSave(instance) {
        if (instance.value % 100 !== 0) {
          throw new AppError({
            status: false,
            message: "Value must be divisible by 100",
            httpStatus: httpStatus.BAD_REQUEST,
          });
        }
      },
    },
  },
);

export default OptionBuffer;
