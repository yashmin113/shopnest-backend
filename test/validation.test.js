import test from "node:test";
import assert from "node:assert/strict";

import {
  forgotPasswordSchema,
  googleAuthSchema,
  orderSchema,
  productSchema,
  registerSchema,
  resetPasswordSchema,
  wishlistProductSchema,
} from "../utils/validation.js";
import { calculateTotal } from "../services/orderService.js";

test("registerSchema normalizes valid input", () => {
  const result = registerSchema.safeParse({
    name: "  Test User  ",
    email: "  TEST@Example.com ",
    password: "secret123",
  });

  assert.equal(result.success, true);
  assert.equal(result.data.name, "Test User");
  assert.equal(result.data.email, "test@example.com");
});

test("registerSchema rejects invalid email and short password", () => {
  const result = registerSchema.safeParse({
    name: "T",
    email: "not-an-email",
    password: "123",
  });

  assert.equal(result.success, false);
  assert.equal(result.error.issues.length, 3);
});

test("productSchema coerces numeric strings", () => {
  const result = productSchema.safeParse({
    name: "Shoes",
    description: "Comfortable running shoes",
    price: "1299.5",
    category: "Footwear",
    stock: "12",
  });

  assert.equal(result.success, true);
  assert.equal(result.data.price, 1299.5);
  assert.equal(result.data.stock, 12);
});

test("orderSchema requires at least one item and a valid address", () => {
  const result = orderSchema.safeParse({
    items: [],
    address: {},
  });

  assert.equal(result.success, false);
});

test("orderSchema accepts a valid order payload", () => {
  const result = orderSchema.safeParse({
    items: [{ product: "64b7f9c2f1a2b3c4d5e6f7a8", qty: 2 }],
    address: {
      fullName: "Test User",
      street: "1 Main Street",
      city: "Mumbai",
      postalCode: "400001",
      country: "India",
    },
    payment: {
      orderId: "order_test_123",
      paymentId: "pay_test_123",
      signature: "signature",
    },
  });

  assert.equal(result.success, true);
});

test("orderSchema requires payment details", () => {
  const result = orderSchema.safeParse({
    items: [{ product: "64b7f9c2f1a2b3c4d5e6f7a8", qty: 1 }],
    address: {
      fullName: "Test User",
      street: "1 Main Street",
      city: "Mumbai",
      postalCode: "400001",
      country: "India",
    },
  });

  assert.equal(result.success, false);
});

test("calculateTotal uses server-side prices and quantities", () => {
  const total = calculateTotal([
    { price: 100, qty: 2 },
    { price: 49.5, qty: 1 },
  ]);

  assert.equal(total, 249.5);
});

test("wishlistProductSchema accepts a valid MongoDB id", () => {
  const result = wishlistProductSchema.safeParse({
    productId: "64b7f9c2f1a2b3c4d5e6f7a8",
  });

  assert.equal(result.success, true);
});

test("wishlistProductSchema rejects an invalid product id", () => {
  const result = wishlistProductSchema.safeParse({ productId: "not-an-id" });

  assert.equal(result.success, false);
});

test("googleAuthSchema requires a non-trivial credential", () => {
  assert.equal(
    googleAuthSchema.safeParse({ credential: "short" }).success,
    false
  );

  assert.equal(
    googleAuthSchema.safeParse({ credential: "a".repeat(64) }).success,
    true
  );
});

test("forgotPasswordSchema normalizes and validates email", () => {
  const result = forgotPasswordSchema.safeParse({ email: "  USER@Example.com " });

  assert.equal(result.success, true);
  assert.equal(result.data.email, "user@example.com");
  assert.equal(forgotPasswordSchema.safeParse({ email: "nope" }).success, false);
});

test("resetPasswordSchema enforces a six-digit code and password length", () => {
  const valid = resetPasswordSchema.safeParse({
    email: "user@example.com",
    code: "123456",
    password: "secret123",
  });

  assert.equal(valid.success, true);

  assert.equal(
    resetPasswordSchema.safeParse({
      email: "user@example.com",
      code: "12",
      password: "secret123",
    }).success,
    false
  );

  assert.equal(
    resetPasswordSchema.safeParse({
      email: "user@example.com",
      code: "123456",
      password: "123",
    }).success,
    false
  );
});
