import express from "express";

import protect from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import { wishlistProductSchema } from "../utils/validation.js";
import {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
} from "../controller/wishlistController.js";

const router = express.Router();

router.use(protect);

router.get("/", getWishlist);

router
  .route("/:productId")
  .post(validate(wishlistProductSchema, "params"), addToWishlist)
  .delete(validate(wishlistProductSchema, "params"), removeFromWishlist);

export default router;
