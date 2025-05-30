import BrokerService from "#services/broker";
import BaseController from "#controllers/base";

class BrokerController extends BaseController {
  static Service = BrokerService;
}

export default BrokerController;
