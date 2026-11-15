import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  assertAmountMatches,
  toPaise,
  verifyPaymentSignature,
} from "../utils/razorpay.js";

process.env.RAZORPAY_KEY_SECRET = "test_secret";

const sign = (orderId, paymentId) =>
  crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

test("verifyPaymentSignature accepts a valid signature", () => {
  const orderId = "order_test123";
  const paymentId = "pay_test123";

  assert.equal(
    verifyPaymentSignature({
      orderId,
      paymentId,
      signature: sign(orderId, paymentId),
    }),
    true
  );
});

test("verifyPaymentSignature rejects a tampered signature", () => {
  const orderId = "order_test123";
  const paymentId = "pay_test123";

  assert.throws(
    () =>
      verifyPaymentSignature({
        orderId,
        paymentId,
        signature: sign(orderId, "pay_other"),
      }),
    /Payment verification failed/
  );
});

test("verifyPaymentSignature rejects incomplete payment details", () => {
  assert.throws(
    () => verifyPaymentSignature({ orderId: "order_test123" }),
    /Incomplete payment details/
  );
});

test("toPaise rounds rupee amounts to integer paise", () => {
  assert.equal(toPaise(1299.5), 129950);
  assert.equal(toPaise("99.99"), 9999);
  assert.equal(toPaise(0.1 + 0.2), 30);
});

test("assertAmountMatches allows equal amounts with different formatting", () => {
  assert.equal(assertAmountMatches(1299.5, "1299.50"), true);
});

test("assertAmountMatches rejects a cheaper payment than the order total", () => {
  assert.throws(
    () => assertAmountMatches(4999, 499),
    /Paid amount does not match the order total/
  );
});
