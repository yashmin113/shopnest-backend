import test from "node:test";
import assert from "node:assert/strict";

import User from "../model/User.js";

test("local users require a password", async () => {
  const user = new User({ name: "Local User", email: "local@example.com" });

  await assert.rejects(
    user.validate(),
    (error) => Boolean(error.errors?.password)
  );
});

test("Google users do not require a password", async () => {
  const user = new User({
    name: "Google User",
    email: "google@example.com",
    googleId: "google-sub-123",
    authProvider: "google",
    verified: true,
  });

  await assert.doesNotReject(user.validate());
});

test("new users default to the customer role and unverified", () => {
  const user = new User({
    name: "Google User",
    email: "google2@example.com",
    googleId: "google-sub-456",
  });

  assert.equal(user.role, "user");
  assert.equal(user.verified, false);
});
