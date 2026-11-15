import express from "express";

import protect from "../middleware/authMiddleware.js";
import admin from "../middleware/adminMiddleware.js";
import upload from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import productController from "../controller/productController.js";
import { getOrders, updateOrdersStatus } from "../controller/orderController.js";
import authController from "../controller/authController.js";
import { getAdminStats } from "../controller/analyticsController.js";
import {
  orderStatusSchema,
  productSchema,
  productUpdateSchema,
} from "../utils/validation.js";

const router = express.Router();

router.use(protect, admin);

router
  .route("/products")
  .get(productController.getAdminProducts)
  .post(
    upload.single("image"),
    validate(productSchema),
    productController.createProduct
  );

router
  .route("/products/:id")
  .get(productController.getProductById)
  .put(
    upload.single("image"),
    validate(productUpdateSchema),
    productController.updateProduct
  )
  .delete(productController.deleteProduct);

router.get("/orders", getOrders);
router.put("/orders/:id/status", validate(orderStatusSchema), updateOrdersStatus);
router.get("/users", authController.getUsers);
router.get("/analytics", getAdminStats);

export default router;
