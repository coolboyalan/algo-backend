import BrokerKey from "#models/brokerKey";
import BaseService from "#services/base";

class BrokerKeyService extends BaseService {
  static Model = BrokerKey;

  static async create(data) {
    delete data.status;
    return await super.create(data);
  }

  static async update(id, data) {
    delete data.status;
    return await super.update(id, data);
  }
}

export default BrokerKeyService;
