import { getDashboardData } from "#services/dashboard";
import BaseController from "#controllers/base";
import { session } from "#middlewares/requestSession";
import { sendResponse } from "#utils/response";
import httpStatus from "http-status";

class DashboardController extends BaseController {
  static async get(req, res, next) {
    const userId = session.get("userId");
    const data = await getDashboardData({ userId });
    sendResponse(httpStatus.OK, res, data);
  }
}

export default DashboardController;
