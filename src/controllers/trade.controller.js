import TradeService from "#services/trade";
import BaseController from "#controllers/base";

class TradeController extends BaseController {
  static Service = TradeService;
}

export default TradeController;
