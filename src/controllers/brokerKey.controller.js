import BrokerKeyService from "#services/brokerKey";
import BaseController from "#controllers/base";
import { session } from "#middlewares/requestSession";
import User from "#models/user";
import axios from "axios";
import { sendResponse } from "#utils/response";
import httpStatus from "http-status";
import Broker from "#models/broker";
import AppError from "#utils/appError";
import BrokerService from "#services/broker";

class BrokerKeyController extends BaseController {
  static Service = BrokerKeyService;

  static async create(req, res, next) {
    const userId = session.get("userId");
    req.body.userId = userId;
    return await super.create(req, res, next);
  }

  static async stop(req, res, next) {
    try {
      console.log(true);
      const { id } = req.params;
      const brokerKey = id
        ? await BrokerKeyService.getDoc(
            { id },
            {
              include: [
                {
                  model: BrokerService.Model,
                },
              ],
            },
          )
        : { Broker: { name: "Both" } };

      if (!id && brokerKey.Broker.name === "Both") {
        const requestOne = await axios.post("http://localhost:3002/stop/", {});
        const requestTwo = await axios.post("http://localhost:3003/stop", {});
        return sendResponse(httpStatus.OK, res, null, "Deactived successfully");
      } else {
        const response = await axios.post(
          brokerKey.Broker.name === "Zerodha"
            ? `http://localhost:3002/stop/${id ?? ""}`
            : `http://localhost:3003/stop/${id ?? ""}`,
          {},
        );
        console.log(response.data);
        if (response.data.status === true) {
          return sendResponse(
            httpStatus.OK,
            res,
            null,
            "Deactived successfully",
          );
        }
        return sendResponse(400, res, null, "Request failed");
      }
    } catch (error) {
      console.log(error);
      sendResponse(500, res, null, "Internal Server Error");
    }
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

    req.query.userId = session.get("userId");

    const options = this.Service.getOptions(req.query, customOptions);

    const data = await this.Service.get(null, req.query, options);
    sendResponse(httpStatus.OK, res, data);
  }
}

export default BrokerKeyController;
