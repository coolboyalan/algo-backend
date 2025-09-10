import { Op, col, cast, where as sequelizeWhere } from "sequelize";

class BaseService {
  static Model = null;

  static async get(id, filters, options = {}) {
    if (!id) {
      return await this.Model.find(filters, options);
    }
    return await this.Model.findDocById(id);
  }

  static getOptions(queryParams = {}, customOptions = {}) {
    const {
      page,
      limit,
      sortBy = "createdAt",
      sortOrder = "DESC",
      search,
      searchIn,
      startDate,
      endDate,
      pagination,
      attributes,
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
      "pagination",
      "attributes",
    ];

    const options = {};
    let applyQueryPagination = true;

    if (
      pagination === false ||
      (typeof pagination === "string" && pagination.toLowerCase() === "false")
    ) {
      applyQueryPagination = false;
    }
    options.applyQueryPagination = applyQueryPagination;

    // 1. Pagination options for the query
    if (applyQueryPagination) {
      let parsedPage = parseInt(page, 10);
      let parsedLimit = parseInt(limit, 10);

      if (isNaN(parsedPage) || parsedPage <= 0) parsedPage = 1;
      if (isNaN(parsedLimit) || parsedLimit <= 0) parsedLimit = 10;

      options.limit = parsedLimit;
      options.offset = (parsedPage - 1) * parsedLimit;
    }

    // 2. Sorting
    if (sortBy) {
      const sortFields = Array.isArray(sortBy) ? sortBy : [sortBy];
      const sortOrders = Array.isArray(sortOrder) ? sortOrder : [sortOrder];

      options.order = sortFields.map((field, index) => {
        const order = (
          sortOrders[index] ||
          sortOrders[0] ||
          "DESC"
        ).toUpperCase();

        if (field.includes(".")) {
          return [col(field), order];
        }
        return [field, order];
      });
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

      if (searchFields.length > 0 && Op && col && cast && sequelizeWhere) {
        searchWhere[Op.or] = searchFields.map((field) => {
          const isNumeric = ["id"].includes(field);

          if (field.includes(".")) {
            return sequelizeWhere(cast(col(field), "TEXT"), {
              [Op.iLike]: `%${search}%`,
            });
          }
          return isNumeric
            ? sequelizeWhere(cast(col(field), "TEXT"), {
                [Op.iLike]: `%${search}%`,
              })
            : {
                [field]: {
                  [Op.iLike]: `%${search}%`,
                },
              };
        });
      }
    }

    // 4. Date Filtering
    const dateWhere = {};
    if (startDate || endDate) {
      dateWhere.createdAt = {};
      if (startDate && Op) dateWhere.createdAt[Op.gte] = new Date(startDate);
      if (endDate && Op) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        dateWhere.createdAt[Op.lte] = endOfDay;
      }
    }

    // 5. Clean queryParams of used fields
    const remainingQueryParams = { ...queryParams };
    usedKeys.forEach((key) => {
      delete remainingQueryParams[key];
    });

    // 6. Handle nested filtering (NEW IMPLEMENTATION)
    const nestedFilters = {};
    const regularFilters = {};

    Object.keys(remainingQueryParams).forEach((key) => {
      if (key.includes(".")) {
        // Handle nested filters like "brand.name", "category.type", etc.
        nestedFilters[key] = remainingQueryParams[key];
      } else {
        // Regular filters for main model
        regularFilters[key] = remainingQueryParams[key];
      }
    });

    // 7. Build where clause with nested include filtering
    const where = {
      ...searchWhere,
      ...dateWhere,
      ...regularFilters,
    };

    // Add nested where conditions using Sequelize's col() function
    if (Object.keys(nestedFilters).length > 0) {
      Object.keys(nestedFilters).forEach((nestedKey) => {
        const value = nestedFilters[nestedKey];

        // Handle different comparison operators
        if (typeof value === "string" && value.includes("*")) {
          // Wildcard search: brand.name=*Nike*
          const searchValue = value.replace(/\*/g, "%");
          where[Op.and] = where[Op.and] || [];
          where[Op.and].push(
            sequelizeWhere(col(nestedKey), {
              [Op.iLike]: searchValue,
            }),
          );
        } else if (typeof value === "string" && value.startsWith(">")) {
          // Greater than: price=>100
          const numValue = parseFloat(value.substring(1));
          if (!isNaN(numValue)) {
            where[Op.and] = where[Op.and] || [];
            where[Op.and].push(
              sequelizeWhere(col(nestedKey), {
                [Op.gt]: numValue,
              }),
            );
          }
        } else if (typeof value === "string" && value.startsWith("<")) {
          // Less than: price=<500
          const numValue = parseFloat(value.substring(1));
          if (!isNaN(numValue)) {
            where[Op.and] = where[Op.and] || [];
            where[Op.and].push(
              sequelizeWhere(col(nestedKey), {
                [Op.lt]: numValue,
              }),
            );
          }
        } else if (Array.isArray(value)) {
          // Array values: brand.id=[1,2,3]
          where[Op.and] = where[Op.and] || [];
          where[Op.and].push(
            sequelizeWhere(col(nestedKey), {
              [Op.in]: value,
            }),
          );
        } else {
          // Exact match: brand.name=Nike
          where[Op.and] = where[Op.and] || [];
          where[Op.and].push(
            sequelizeWhere(col(nestedKey), {
              [Op.eq]: value,
            }),
          );
        }
      });
    }

    options.where = where;

    // 8. Handle attributes (selective column fetching)
    if (attributes) {
      let requestedAttributes = [];

      if (typeof attributes === "string") {
        requestedAttributes = attributes
          .split(",")
          .map((attr) => attr.trim())
          .filter((attr) => attr.length > 0);
      } else if (Array.isArray(attributes)) {
        requestedAttributes = attributes;
      }

      if (requestedAttributes.length > 0 && this.Model) {
        const modelAttributes = Object.keys(this.Model.rawAttributes || {});
        const validAttributes = requestedAttributes.filter((attr) => {
          if (attr.includes(".")) {
            return true; // Allow nested attributes
          }
          return modelAttributes.includes(attr);
        });

        if (validAttributes.length > 0) {
          options.attributes = validAttributes;
        } else {
          console.warn(
            `Warning: None of the requested attributes [${requestedAttributes.join(", ")}] exist in model. Fetching all columns.`,
          );
        }
      }
    }

    // 9. Enhanced include handling with nested where conditions
    if (customOptions.include && Object.keys(nestedFilters).length > 0) {
      options.include = this.enhanceIncludesWithWhere(
        customOptions.include,
        nestedFilters,
      );
    }

    // 10. Merge with custom options (custom options override defaults)
    Object.assign(options, customOptions);

    return options;
  }

  // Helper method to enhance includes with where conditions
  static enhanceIncludesWithWhere(includes, nestedFilters) {
    if (!Array.isArray(includes)) {
      return includes;
    }

    return includes.map((include) => {
      const enhancedInclude = { ...include };

      // Check if this include should have where conditions
      const associationName = include.as || include.model.name.toLowerCase();

      // Find filters that match this association
      const relevantFilters = {};
      Object.keys(nestedFilters).forEach((filterKey) => {
        if (filterKey.startsWith(associationName + ".")) {
          const fieldName = filterKey.split(".")[1];
          relevantFilters[fieldName] = nestedFilters[filterKey];
        }
      });

      // Add where conditions to this include
      if (Object.keys(relevantFilters).length > 0) {
        enhancedInclude.where = {
          ...enhancedInclude.where,
          ...relevantFilters,
        };

        // Ensure we don't exclude records if no match found
        enhancedInclude.required =
          enhancedInclude.required !== undefined
            ? enhancedInclude.required
            : false;
      }

      // Recursively handle nested includes
      if (enhancedInclude.include) {
        enhancedInclude.include = this.enhanceIncludesWithWhere(
          enhancedInclude.include,
          nestedFilters,
        );
      }

      return enhancedInclude;
    });
  }

  static async get(id, filters = {}, queryOptionsPassed = {}) {
    if (!this.Model) {
      throw new Error(
        "BaseService.Model is not defined. Please set it in the subclass.",
      );
    }

    if (!id) {
      // Handle multiple records with pagination
      const queryOptions = {
        applyQueryPagination: true,
        ...queryOptionsPassed,
      };
      const { count, rows } = await this.Model.findAndCountAll(queryOptions);

      let returnOnlyArray = false;

      // Check if pagination should be disabled
      if (
        filters &&
        (filters.pagination === false ||
          (typeof filters.pagination === "string" &&
            String(filters.pagination).toLowerCase() === "false"))
      ) {
        returnOnlyArray = true;
      } else if (queryOptions.applyQueryPagination === false) {
        returnOnlyArray = true;
      }

      if (returnOnlyArray) {
        return rows;
      }

      // Build paginated response
      let totalItems = count;

      // Handle grouped results
      if (queryOptions.group && Array.isArray(count)) {
        if (count.length > 0 && typeof count[0].count !== "undefined") {
          totalItems = count.reduce(
            (sum, current) => sum + (Number(current.count) || 0),
            0,
          );
        } else {
          totalItems = count.length;
        }
      } else if (typeof count !== "number") {
        console.warn(
          "BaseService.get: Unexpected count format. Defaulting totalItems.",
        );
        totalItems = Array.isArray(rows) ? rows.length : 0;
      }

      const limitFromOptions = queryOptions.limit;
      const offsetFromOptions = queryOptions.offset;

      const itemsPerPage =
        queryOptions.applyQueryPagination &&
        typeof limitFromOptions === "number" &&
        limitFromOptions > 0
          ? limitFromOptions
          : totalItems > 0
            ? totalItems
            : 1;

      const currentPage =
        queryOptions.applyQueryPagination &&
        typeof offsetFromOptions === "number" &&
        itemsPerPage > 0
          ? Math.floor(offsetFromOptions / itemsPerPage) + 1
          : 1;

      let totalPages =
        itemsPerPage > 0 ? Math.ceil(totalItems / itemsPerPage) : 1;
      if (totalItems === 0) totalPages = 0;

      return {
        result: rows,
        pagination: {
          totalItems,
          totalPages,
          currentPage,
          itemsPerPage,
        },
      };
    }

    // Handle single record by ID
    const document = await this.Model.findByPk(id, queryOptionsPassed);
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
