import { session } from "#middlewares/requestSession";
import { sendResponse } from "#utils/response";
import httpStatus from "http-status";
import AppError from "#utils/appError";
import AdminService from "#services/admin";
import Broker from "#models/broker";
import BrokerKeyService from "#services/brokerKey";
import User from "#models/user";
import BaseController from "#controllers/base";
import UserService from "#services/user";

class AdminController extends BaseController {
  static Service = AdminService;

  static async getBrokerKey(req, res, next) {
    const role = session.get("role");

    if (role !== "admin") {
      throw new AppError({
        status: false,
        message: "Not Allowed",
        httpStatus: httpStatus.FORBIDDEN,
      });
    }

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

    const data = await BrokerKeyService.get(null, req.query, options);
    sendResponse(httpStatus.OK, res, data);
  }

  static async getUsers(req, res, next) {
    const role = session.get("role");

    if (role !== "admin") {
      throw new AppError({
        status: false,
        message: "Not Allowed",
        httpStatus: httpStatus.FORBIDDEN,
      });
    }

    const { id } = req.params;

    const options = this.Service.getOptions(req.query, {});

    const data = await UserService.get(id, req.query, options);
    sendResponse(httpStatus.OK, res, data);
  }

  static async updateUser(req, res, next) {
    const { id } = req.params;
    const data = await UserService.update(id, req.body);
    sendResponse(httpStatus.OK, res, data);
  }

  static async updateBrokerKey(req, res, next) {
    const { id } = req.params;
    const brokerKey = await BrokerKeyService.update(id, req.body);
    sendResponse(httpStatus.OK, res, brokerKey);
  }

  static async createBrokerKey(req, res, next) {
    const brokerKey = await BrokerKeyService.create(req.body);
    sendResponse(httpStatus.OK, res, brokerKey);
  }
}

export default AdminController;
