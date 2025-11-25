import { Op, col, cast, where as sequelizeWhere } from "sequelize";

class BaseService {
  static Model = null;

  /**
   * Build Sequelize query options from frontend params
   */
  static getOptions(queryParams = {}, customOptions = {}) {
    const {
      cursor,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      searchQuery,
      searchFields = [],
      filters = [],
      attributes,
    } = queryParams;

    const options = {};
    const parsedLimit = parseInt(limit, 10) || 10;

    // 1. LIMIT (always fetch +1 to check hasNextPage)
    options.limit = parsedLimit + 1;

    // 2. SORTING
    const order = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";
    options.order = [[sortBy, order]];

    // 3. WHERE CONDITIONS
    const where = {};

    // 3a. Search filtering
    if (searchQuery && searchFields.length > 0) {
      const searchFieldsArray = Array.isArray(searchFields)
        ? searchFields
        : searchFields.split(",").map((f) => f.trim());

      where[Op.or] = searchFieldsArray.map((field) => {
        if (field.includes(".")) {
          // Nested field search (e.g., "user.name")
          return sequelizeWhere(cast(col(field), "TEXT"), {
            [Op.iLike]: `%${searchQuery}%`,
          });
        }
        return {
          [field]: {
            [Op.iLike]: `%${searchQuery}%`,
          },
        };
      });
    }

    // 3b. Custom filters
    if (Array.isArray(filters) && filters.length > 0) {
      filters.forEach((filter) => {
        const { field, operator, value } = filter;

        switch (operator) {
          case "equals":
            where[field] = value;
            break;
          case "contains":
            where[field] = { [Op.iLike]: `%${value}%` };
            break;
          case "gt":
            where[field] = { [Op.gt]: value };
            break;
          case "gte":
            where[field] = { [Op.gte]: value };
            break;
          case "lt":
            where[field] = { [Op.lt]: value };
            break;
          case "lte":
            where[field] = { [Op.lte]: value };
            break;
          case "in":
            where[field] = { [Op.in]: Array.isArray(value) ? value : [value] };
            break;
          default:
            where[field] = value;
        }
      });
    }

    // 3c. Cursor-based pagination WHERE condition
    if (cursor) {
      try {
        const decodedCursor = JSON.parse(
          Buffer.from(cursor, "base64").toString("utf-8"),
        );
        const { id: cursorId, sortValue } = decodedCursor;

        if (order === "DESC") {
          // For descending order: fetch records BEFORE cursor
          where[Op.or] = [
            { [sortBy]: { [Op.lt]: sortValue } },
            {
              [Op.and]: [
                { [sortBy]: sortValue },
                { id: { [Op.lt]: cursorId } },
              ],
            },
          ];
        } else {
          // For ascending order: fetch records AFTER cursor
          where[Op.or] = [
            { [sortBy]: { [Op.gt]: sortValue } },
            {
              [Op.and]: [
                { [sortBy]: sortValue },
                { id: { [Op.gt]: cursorId } },
              ],
            },
          ];
        }
      } catch (error) {
        console.error("Invalid cursor:", error);
        // Continue without cursor if invalid
      }
    }

    options.where = where;

    // 4. SELECT SPECIFIC ATTRIBUTES (optional)
    if (attributes) {
      const attrArray =
        typeof attributes === "string"
          ? attributes.split(",").map((a) => a.trim())
          : attributes;
      options.attributes = attrArray;
    }

    // 5. MERGE CUSTOM OPTIONS
    Object.assign(options, customOptions);

    return options;
  }

  /**
   * Fetch records with cursor-based pagination
   */
  static async getWithCursorPagination(queryParams, options) {
    const {
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = queryParams;
    const parsedLimit = parseInt(limit, 10) || 10;

    // Fetch limit + 1 records to determine hasNextPage
    const records = await this.Model.findAll(options);

    // Check if there are more records
    const hasNextPage = records.length > parsedLimit;
    const data = hasNextPage ? records.slice(0, parsedLimit) : records;

    // Generate next cursor from last record
    let nextCursor = null;
    if (hasNextPage && data.length > 0) {
      const lastRecord = data[data.length - 1];
      const cursorData = {
        id: lastRecord.id,
        sortValue: lastRecord[sortBy],
      };
      nextCursor = Buffer.from(JSON.stringify(cursorData)).toString("base64");
    }

    // For hasPreviousPage, check if cursor exists in query
    const hasPreviousPage = !!queryParams.cursor;

    return {
      data,
      pagination: {
        hasNextPage,
        hasPreviousPage,
        nextCursor,
        previousCursor: null, // Can implement backward pagination if needed
        totalCount: undefined, // Cursor pagination doesn't provide total count efficiently
      },
    };
  }

  /**
   * Fetch single record by ID
   */
  static async getSingle(id, options) {
    const document = await this.Model.findByPk(id, options);
    if (!document) {
      throw new Error(`${this.Model.name} not found`);
    }
    return document;
  }
  static async getDoc(filters, options) {
    return await this.Model.findDoc(filters, options);
  }

  static async getDocById(id, options) {
    return await this.Model.findDocById(id, options);
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
