import TradeService from "#services/trade";
import BaseController from "#controllers/base";
import { session } from "#middlewares/requestSession";
import User from "#models/user";
import Broker from "#models/broker";
import { sendResponse } from "#utils/response";
import httpStatus from "http-status";

class TradeController extends BaseController {
  static Service = TradeService;

  static async create(req, res, next) {
    const userId = session.get("userId");
    req.body.userId = userId;
    return await super.create(req, res, next);
  }

  static async get(req, res, next) {
    const { id } = req.params;

    if (id) return await super.get(req, res, next);

    const customOptions = {
      include: [
        {
          model: User,
          attributes: ["name", "id"],
        },
        {
          model: Broker,
          attributes: ["name", "id"],
        },
      ],
    };

    req.query.userId = session.get("userId");

    const options = this.Service.getOptions(req.query, customOptions);
    const data = await this.Service.get(null, req.query, options);
    sendResponse(httpStatus.OK, res, data);
  }
}

export default TradeController;
