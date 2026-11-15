import express from "express";
import { createPaymentOrder, verifyPayment } from "../controller/paymentController.js";
import protect from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import { paymentOrderSchema, paymentVerifySchema } from "../utils/validation.js";

const router = express.Router();

router.post(
  "/order",
  protect,
  validate(paymentOrderSchema),
  createPaymentOrder
);
router.post(
  "/verify",
  protect,
  validate(paymentVerifySchema),
  verifyPayment
);

export default router;
