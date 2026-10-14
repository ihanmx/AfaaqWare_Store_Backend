const ApiError = require("../utils/ApiError");
const multer = require("multer");

const notFound = (req, res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

const normalize = (err) => {
  if (err instanceof ApiError) return err;

  if (err.name === "CastError") {
    return ApiError.badRequest(`Invalid ${err.path}: ${err.value}`);
  }
  if (err.name === "ValidationError") {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return ApiError.badRequest("Validation failed", details);
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    return ApiError.conflict(`Duplicate value for field: ${field}`);
  }
  if (err.type === "entity.parse.failed") {
    return ApiError.badRequest("Malformed JSON body");
  }
  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: "Each image must be 5 MB or smaller",
      LIMIT_FILE_COUNT: "Too many files",
      LIMIT_UNEXPECTED_FILE: "Unexpected file field, or too many files",
    };
    return ApiError.badRequest(messages[err.code] || err.message);
  }

  const wrapped = new ApiError(
    err.message || "Internal server error",
    err.statusCode || 500,
  );
  wrapped.isOperational = false;
  wrapped.stack = err.stack;
  return wrapped;
};

const errorHandler = (err, req, res, next) => {
  const error = normalize(err);
  const isProd = process.env.NODE_ENV === "production";

  if (error.statusCode >= 500) console.error(error);

  //for prod
  const message =
    error.statusCode >= 500 && isProd && !error.isOperational
      ? "Internal server error"
      : error.message;

  res.status(error.statusCode).json({
    success: false,
    message,
    ...(error.details && { details: error.details }),
    ...(!isProd && { stack: error.stack }),
  });
};

module.exports = { notFound, errorHandler };
