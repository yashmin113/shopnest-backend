import express from "express";
import protect from "../middleware/authMiddleware.js";
import { createOrder, myOrders } from "../controller/orderController.js";
import { validate } from "../middleware/validate.js";
import { orderSchema } from "../utils/validation.js";

const router = express.Router();

router.post("/", protect, validate(orderSchema), createOrder);
router.get("/myorders", protect, myOrders);

export default router;
