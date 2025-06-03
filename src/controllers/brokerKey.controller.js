import BrokerKeyService from "#services/brokerKey";
import BaseController from "#controllers/base";
import { session } from "#middlewares/requestSession";
import User from "#models/user";
import { sendResponse } from "#utils/response";
import httpStatus from "http-status";
import Broker from "#models/broker";

class BrokerKeyController extends BaseController {
  static Service = BrokerKeyService;

  static async create(req, res, next) {
    const userId = session.get("userId");
    req.body.userId = userId;
    return await super.create(req, res, next);
  }

  static async update(req, res, next) {
    const userId = session.get("userId");
    req.body.userId = userId;
    return await super.update(req, res, next);
  }

  static async get(req, res, next) {
    const { id } = req.params;
    if (id) {
      return await super.get(req, res, next);
    }

    const customOptions = {
      include: [
        {
          model: Broker,
          attributes: ["name", "id"],
        },
        {
          model: User,
          attributes: ["name", "id"],
        },
      ],
    };

    const options = this.Service.getOptions(req.query, customOptions);

    const data = await this.Service.get(null, req.query, options);
    sendResponse(httpStatus.OK, res, data);
  }
}

export default BrokerKeyController;
