import OptionTradeLogService from "#services/optionTradeLog";
import { sendResponse } from "#utils/response";
import BaseController from "#controllers/base";
import BrokerKeyService from "#services/brokerKey";
import UserService from "#services/user";
import BrokerService from "#services/broker";

class OptionTradeLogController extends BaseController {
  static Service = OptionTradeLogService;

  static async get(req, res, next) {
    const customOptions = {
      include: [
        {
          model: BrokerKeyService.Model,
          as: "brokerKey",
          include: [
            {
              model: UserService.Model,
              as: "user",
              attributes: ["id", "name"],
            },
            {
              model: BrokerService.Model,
              as: "broker",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
    };

    const options = this.Service.getOptions(req.query, customOptions);

    const data = await this.Service.getWithCursorPagination(req.query, options);
    sendResponse(httpStatus.OK, res, data);
  }
}

export default OptionTradeLogController;
