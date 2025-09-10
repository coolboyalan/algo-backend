import OptionTradeLogService from "#services/optionTradeLog";
import BaseController from "#controllers/base";

class OptionTradeLogController extends BaseController {
  static Service = OptionTradeLogService;
}

export default OptionTradeLogController;
