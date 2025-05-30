import BaseModel from "#models/base";
import { DataTypes } from "sequelize";

class Broker extends BaseModel {}

Broker.initialize({
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unqiue: true,
  },
});

export default Broker;
