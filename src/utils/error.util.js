// globalErrorHandler.js
import env from "#configs/env";
import {
  ValidationError,
  UniqueConstraintError,
  DatabaseError,
  ConnectionError,
  ForeignKeyConstraintError,
} from "sequelize";
import { session } from "#middlewares/requestSession";

const sendError = (res, status, code, message, details) => {
  const payload = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
    timestamp: new Date().toISOString(),
  };
  console.log(payload);
  return res.status(status).json(payload);
};

export const globalErrorHandler = async (error, req, res, next) => {
  // try to rollback any stored transaction
  try {
    const transaction = await session.get("transaction");
    if (transaction) await transaction.rollback();
  } catch (rollbackErr) {
    console.error("Transaction rollback failed:", rollbackErr);
    // don't mask the original error
  }

  // log full error server-side (replace with your logger if you have one)
  console.error(error.response.data);

  // Sequelize ValidationError
  if (error instanceof ValidationError) {
    const details = (error.errors || []).map((e) => ({
      path: e.path,
      message: e.message,
      value: e.value,
    }));
    const messages = details.map((d) => `${d.path}: ${d.message}`).join(", ");
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      `Validation Error: ${messages}`,
      {
        errors: details,
      },
    );
  }

  // Sequelize Foreign Key Constraint Error
  if (error instanceof ForeignKeyConstraintError) {
    let field = null;
    if (Array.isArray(error.fields)) {
      field = error.fields[0] ?? null;
    } else if (error.fields && typeof error.fields === "object") {
      const keys = Object.keys(error.fields);
      field = keys.length ? keys[0] : null;
    }
    const message = field
      ? `Invalid foreign key: ${field}`
      : "Foreign key constraint error";
    return sendError(res, 400, "FOREIGN_KEY_ERROR", message, {
      fields: error.fields ?? null,
      table: error.table ?? null,
    });
  }

  // Sequelize Unique Constraint Error
  if (error instanceof UniqueConstraintError) {
    const details = (error.errors || []).map((e) => ({
      path: e.path,
      message: e.message,
      value: e.value,
    }));
    const fields = details.map((d) => d.path).filter(Boolean);
    const primaryField = fields[0] ?? null;
    const message = primaryField
      ? `${primaryField} already exists`
      : "Unique constraint violation";
    return sendError(res, 409, "UNIQUE_CONSTRAINT", message, {
      fields: fields.length ? fields : undefined,
      errors: details,
    });
  }

  // Sequelize Database Error
  if (error instanceof DatabaseError) {
    return sendError(
      res,
      500,
      "DATABASE_ERROR",
      `Database Error: ${error.message}`,
      {
        original: error.parent ?? null,
        sql: error.sql ?? null,
      },
    );
  }

  // Sequelize Connection Error
  if (error instanceof ConnectionError) {
    return sendError(
      res,
      503,
      "DB_CONNECTION_ERROR",
      `Database Connection Error: ${error.message}`,
      {
        original: error.parent ?? null,
      },
    );
  }

  // Custom HTTP error objects (e.g. { httpStatus, message, code, details })
  if (
    error &&
    typeof error === "object" &&
    "httpStatus" in error &&
    "message" in error
  ) {
    const status = Number(error.httpStatus) || 500;
    const code = error.code || "HTTP_ERROR";
    const message = String(error.message || "Error");
    return sendError(res, status, code, message, error.details ?? undefined);
  }

  // Plain string error
  if (typeof error === "string") {
    return sendError(res, 500, "ERROR", error, undefined);
  }

  // Generic Error instance fallback
  if (error instanceof Error) {
    const message =
      env.NODE_ENV === "development"
        ? `Internal Server Error: ${error.message}`
        : "Internal Server Error";
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", message, {
      name: error.name,
      stack: env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }

  // Unknown / non-standard error fallback
  return sendError(
    res,
    500,
    "UNKNOWN_ERROR",
    env.NODE_ENV === "development"
      ? `Unknown error: ${JSON.stringify(error)}`
      : "Internal Server Error",
    { raw: error },
  );
};
