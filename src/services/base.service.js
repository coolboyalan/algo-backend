import { Sequelize, Op, literal } from "sequelize";

class BaseService {
  static Model = null;

  static getOptions(queryParams = {}, customOptions = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy,
      sortOrder = "ASC",
      search,
      searchIn,
      startDate,
      endDate,
    } = queryParams;

    const usedKeys = [
      "page",
      "limit",
      "sortBy",
      "sortOrder",
      "search",
      "searchIn",
      "startDate",
      "endDate",
    ];

    const options = {};

    // 1. Pagination
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    options.limit = parseInt(limit, 10);
    options.offset = offset;

    // 2. Sorting
    if (sortBy) {
      options.order = [[sortBy, sortOrder.toUpperCase()]];
    }

    // 3. Searching/Filtering
    const searchWhere = {};
    if (search && searchIn) {
      const searchFields = Array.isArray(searchIn)
        ? searchIn
        : searchIn
            .split(",")
            .map((f) => f.trim())
            .filter((f) => f.length > 0);

      if (searchFields.length > 0) {
        searchWhere[Op.or] = searchFields.map((field) => {
          if (["id", "someIntegerField", "someNumericField"].includes(field)) {
            return sequelizeWhere(cast(col(field), "TEXT"), {
              [Op.iLike]: `%${search}%`,
            });
          }
          return {
            [field]: { [Op.iLike]: `%${search}%` },
          };
        });
      }
    }

    // 4. Date Filtering
    const dateWhere = {};
    if (startDate || endDate) {
      dateWhere.createdAt = {};
      if (startDate) {
        dateWhere.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        dateWhere.createdAt[Op.lte] = new Date(endDate);
      }
    }

    // Merge search and date filters into one where clause
    const where = { ...searchWhere, ...dateWhere };

    if (Object.keys(where).length > 0) {
      options.where = where;
    }

    // 5. Clean up used keys from queryParams
    usedKeys.forEach((key) => {
      if (key in queryParams) {
        delete queryParams[key];
      }
    });

    // 6. Merge with custom options (custom options override defaults)
    for (const key in customOptions) {
      options[key] = customOptions[key];
    }

    return options;
  }
  static async get(id, filters, options = {}) {
    if (!id) {
      return await this.Model.findAll({
        where: filters,
        ...options,
      });
    }
    return await this.Model.findDocById(id);
  }

  static async getDoc(filters, allowNull = false) {
    return await this.Model.findDoc(filters, allowNull);
  }

  static async getDocById(id, allowNull = false) {
    return await this.Model.findDocById(id, allowNull);
  }

  static async create(data) {
    const createdDoc = await this.Model.create(data);
    return createdDoc;
  }

  static async update(id, data) {
    const doc = await this.Model.findDocById(id);

    doc.updateFields(data);
    await doc.save();

    return doc;
  }

  static async deleteDoc(id) {
    const doc = await this.Model.findDocById(id);

    //TODO: Delete functionality has to be implemented;
  }
}

export default BaseService;
