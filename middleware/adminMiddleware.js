import { HttpError } from "../utils/errors.js";

const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }

  return next(new HttpError(403, "Access denied, admin only"));
};

export default admin;
