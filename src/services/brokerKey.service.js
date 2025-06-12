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

    if (broker.name === "Zerodha") {
      data.loginUrl = `https://kite.trade/connect/login?api_key=${data.apiKey}`;
      data, (redirectUrl = `${env.DOMAIN}/api/kite/login/${data.userId}`);
    } else if (broker.name === "Upstox") {
      data.redirectUrl = `${env.DOMAIN}/api/upstox/login/${data.userId}`;
      data.loginUrl = `https://api.upstox.com/v2/login/authorization/dialog?client_id=${data.apiKey}&redirect_uri=${encodeURIComponent(data.redirectUrl)}&response_type=code`;
    }

    return await super.create(data);
  }

  static async update(id, data) {
    delete data.status;

    const existingKey = await this.getDocById(id);
    existingKey.updateFields(data);

    const broker = await BrokerService.getDoc({
      id: Number(existingKey.brokerId),
    });

    if (broker.name === "Zerodha") {
      existingKey.loginUrl = `https://kite.trade/connect/login?api_key=${existingKey.apiKey}`;
      existingKey.redirectUrl = `${env.DOMAIN}/api/kite/login/${existingKey.id}`;
    } else if (broker.name === "Upstox") {
      existingKey.redirectUrl = `${env.DOMAIN}/api/upstox/login/${existingKey.id}`;
      existingKey.loginUrl = `https://api.upstox.com/v2/login/authorization/dialog?client_id=${existingKey.apiKey}&redirect_uri=${encodeURIComponent(existingKey.redirectUrl)}&response_type=code`;
    }

    await existingKey.save();

    return existingKey;
  }
}

export default BrokerKeyService;
