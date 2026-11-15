import crypto from "node:crypto";
import { asyncHandler, HttpError } from "../utils/errors.js";
import { buildOrderItems, calculateTotal } from "../services/orderService.js";
import {
  getRazorpayInstance,
  toPaise,
  verifyPaymentSignature,
} from "../utils/razorpay.js";
import PaymentIntent from "../model/PaymentIntent.js";

const createPaymentOrder = asyncHandler(async (req, res) => {
  const { items } = req.body;
  const orderItems = await buildOrderItems(items);
  const totalAmount = calculateTotal(orderItems);

  if (totalAmount <= 0) {
    throw new HttpError(400, "Order total must be greater than zero");
  }

  const instance = getRazorpayInstance();

  let order;

  try {
    order = await instance.orders.create({
      amount: toPaise(totalAmount),
      currency: "INR",
      receipt: crypto.randomBytes(10).toString("hex"),
    });
  } catch (error) {
    const description =
      error?.error?.description ||
      error?.message ||
      "Unable to create payment order";

    throw new HttpError(
      error?.statusCode === 401 ? 500 : 400,
      description
    );
  }

  await PaymentIntent.create({
    user: req.user._id,
    razorpayOrderId: order.id,
    items: orderItems.map(({ product, qty, price }) => ({
      product,
      qty,
      price,
    })),
    totalAmount,
    currency: order.currency,
  });

  res.status(200).json({ ...order, totalAmount });
});

const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  verifyPaymentSignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });

  res.status(200).json({ message: "Payment verified successfully" });
});

export { createPaymentOrder, verifyPayment };
