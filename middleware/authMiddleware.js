import jwt from "jsonwebtoken";
import User from "../model/User.js";
import { HttpError } from "../utils/errors.js";

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer")) {
    return next(new HttpError(401, "Not authorized, no token provided"));
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select(
      "-password -otpHash -otpExpiresAt"
    );

    if (!user) {
      return next(new HttpError(401, "Not authorized, user not found"));
    }

    req.user = user;
    next();
  } catch (error) {
    return next(new HttpError(401, "Not authorized, token failed"));
  }
};

export default protect;
