import BrokerKey from "#models/brokerKey";
import AppError from "#utils/appError";
import BaseService from "#services/base";
import env from "#configs/env";
import BrokerService from "#services/broker";

class BrokerKeyService extends BaseService {
  static Model = BrokerKey;

  static async create(data) {
    delete data.status;

    const broker = await BrokerService.getDoc({ id: data.brokerId });

    if (broker.name !== "Zerodha") {
      throw new AppError({
        status: false,
        message: "Brokers other than zerodha are disabled for now",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    const loginUrl = `https://kite.trade/connect/login?api_key=${data.apiKey}`;
    const redirectUrl = `${env.DOMAIN}/api/kite/login/${data.userId}`;

    data.loginUrl = loginUrl;
    data.redirectUrl = redirectUrl;

    return await super.create(data);
  }

  static async update(id, data) {
    delete data.status;
    delete data.status;

    const broker = await BrokerService.getDoc({ id: data.brokerId });

    if (broker.name !== "Zerodha") {
      throw new AppError({
        status: false,
        message: "Brokers other than zerodha are disabled for now",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    const loginUrl = `https://kite.trade/connect/login?api_key=${data.apiKey}`;
    const redirectUrl = `${env.DOMAIN}/api/kite/login/${data.userId}`;

    data.loginUrl = loginUrl;
    data.redirectUrl = redirectUrl;

    return await super.update(id, data);
  }
}

export default BrokerKeyService;
