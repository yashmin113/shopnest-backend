import crypto from "node:crypto";
import Razorpay from "razorpay";
import { HttpError } from "./errors.js";

export const toPaise = (amount) => Math.round(Number(amount) * 100);

export const getRazorpayInstance = () =>
  new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

export const verifyPaymentSignature = ({ orderId, paymentId, signature }) => {
  if (!orderId || !paymentId || !signature) {
    throw new HttpError(400, "Incomplete payment details");
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const expected = Buffer.from(expectedSignature);
  const received = Buffer.from(signature);

  const isValid =
    expected.length === received.length &&
    crypto.timingSafeEqual(expected, received);

  if (!isValid) {
    throw new HttpError(400, "Payment verification failed");
  }

  return true;
};

export const assertAmountMatches = (expectedAmount, actualAmount) => {
  if (toPaise(expectedAmount) !== toPaise(actualAmount)) {
    throw new HttpError(409, "Paid amount does not match the order total");
  }

  return true;
};
