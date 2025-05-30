import BrokerKeyService from "#services/brokerKey";
import BaseController from "#controllers/base";
import { session } from "#middlewares/requestSession";

class BrokerKeyController extends BaseController {
  static Service = BrokerKeyService;

  static async create(req, res, next) {
    const userId = session.get("userId");
    console.log(session.get("payload"));
    req.body.userId = userId;
    return await super.create(req, res, next);
  }
}

export default BrokerKeyController;
