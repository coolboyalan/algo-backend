import BrokerKey from "#models/brokerKey";
import AppError from "#utils/appError";
import BaseService from "#services/base";
import env from "#configs/env";
import BrokerService from "#services/broker";

class BrokerKeyService extends BaseService {
  static Model = BrokerKey;

  static getLoginConfig(brokerName, apiKey, userIdOrKeyId) {
    const domain = env.DOMAIN;

    switch (brokerName) {
      case "Zerodha":
        return {
          loginUrl: `https://kite.trade/connect/login?api_key=${apiKey}`,
          redirectUrl: `${domain}/api/kite/login/${userIdOrKeyId}`,
        };

      case "Upstox":
        const upstoxRedirect = `${domain}/api/upstox/login/${userIdOrKeyId}`;
        return {
          loginUrl: `https://api.upstox.com/v2/login/authorization/dialog?client_id=${apiKey}&redirect_uri=${encodeURIComponent(upstoxRedirect)}&response_type=code`,
          redirectUrl: upstoxRedirect,
        };

      case "Angel One":
        const angelRedirect = `${domain}/api/angelone/login/${userIdOrKeyId}`;
        return {
          loginUrl: `https://smartapi.angelone.in/publisher-login?api_key=${apiKey}&state=${userIdOrKeyId}`,
          redirectUrl: angelRedirect,
        };

      default:
        return {};
    }
  }

  static async create(data) {
    delete data.status;

    const broker = await BrokerService.getDoc({ id: data.brokerId });
    const { loginUrl, redirectUrl } = this.getLoginConfig(
      broker.name,
      data.apiKey,
      data.userId,
    );

    data.loginUrl = loginUrl;
    data.redirectUrl = redirectUrl;

    return await super.create(data);
  }

  static async update(id, data) {
    delete data.status;

    const existingKey = await this.getDocById(id);
    existingKey.updateFields(data);

    const broker = await BrokerService.getDoc({
      id: Number(existingKey.brokerId),
    });
    const { loginUrl, redirectUrl } = this.getLoginConfig(
      broker.name,
      existingKey.apiKey,
      existingKey.id,
    );

    existingKey.loginUrl = loginUrl;
    existingKey.redirectUrl = redirectUrl;

    await existingKey.save();
    return existingKey;
  }
}

export default BrokerKeyService;
