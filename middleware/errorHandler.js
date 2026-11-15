import { unlink } from "node:fs/promises";
import { HttpError } from "../utils/errors.js";

export const notFound = (req, res, next) => {
  next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  if (req.file?.path) {
    unlink(req.file.path).catch(() => {});
  }

  if (statusCode >= 500) {
    console.error(err);
  }

  const body = {
    message: err.message || "Server error",
  };

  if (err.details) {
    body.details = err.details;
  }

  res.status(statusCode).json(body);
};
