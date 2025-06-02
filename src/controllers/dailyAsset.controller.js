import DailyAssetService from "#services/dailyAsset";
import BaseController from "#controllers/base";
import Asset from "#models/asset";
import { sendResponse } from "#utils/response";
import httpStatus from "http-status";
class DailyAssetController extends BaseController {
  static Service = DailyAssetService;
  static async get(req, res, next) {
    const { id } = req.params;
    if (id) {
      return super.get(req, res, next);
    }

    const customOptions = {
      include: [
        {
          model: Asset,
          attributes: ["id", "name", "zerodhaToken"],
        },
      ],
    };

    const options = this.Service.getOptions(req.query, customOptions);
    const data = await this.Service.get(null, req.query, options);
    sendResponse(httpStatus.OK, res, data);
  }
}

export default DailyAssetController;
