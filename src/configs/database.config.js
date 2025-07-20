import env from "#configs/env";
import { Sequelize } from "sequelize";

const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASS, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: env.DB_DIALECT,
  logging: false,
  pool: {
    max: 80,
    min: 2,
    acquire: 30000, // how long to wait for a connection before throwing error
    idle: 5000, // reduce to recycle idle connections more frequently
    evict: 10000, // optional: remove idle connections after this time
  },
});

export default sequelize;
