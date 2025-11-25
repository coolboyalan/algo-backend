import httpStatus from "http-status";
import { sendResponse } from "#utils/response";

class BaseController {
  static Service = null;

  static async get(req, res, next) {
    const { id } = req.params;

    if (id) {
      // Single record fetch
      const options = this.Service.getOptions(req.query, {});
      const data = await this.Service.getSingle(id, options);
      return sendResponse(
        httpStatus.OK,
        res,
        data,
        `${this.Service.Model.updatedName()} fetched successfully`,
      );
    }

    // Multiple records with cursor pagination
    const options = this.Service.getOptions(req.query, {});
    const result = await this.Service.getWithCursorPagination(
      req.query,
      options,
    );

    return sendResponse(
      httpStatus.OK,
      res,
      result,
      `${this.Service.Model.updatedName()} list fetched successfully`,
    );
  }

  static async create(req, res, next) {
    const data = await this.Service.create(req.body);
    sendResponse(
      httpStatus.CREATED,
      res,
      data,
      `${this.Service.Model.updatedName()} created successfully`,
    );
  }

  static async update(req, res, next) {
    const { id } = req.params;
    const data = await this.Service.update(id, req.body);
    sendResponse(
      httpStatus.OK,
      res,
      data,
      `${this.Service.Model.updatedName()} updated successfully`,
    );
  }

  static async deleteDoc(req, res, next) {
    const { id } = req.params;
    const data = await this.Service.deleteDoc(id);
    sendResponse(
      httpStatus.OK,
      res,
      data,
      `${this.Service.Model.updatedName()} deleted successfully`,
    );
  }
}

export default BaseController;
