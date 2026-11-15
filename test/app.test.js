import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import app from "../app.js";

test("GET / reports that the API is running", async () => {
  const response = await request(app).get("/");

  assert.equal(response.status, 200);
  assert.equal(response.body.message, "ShopNest API is running");
});

test("GET /api/health returns ok", async () => {
  const response = await request(app).get("/api/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
});

test("CORS allows ShopNest Vercel deployment origins", async () => {
  const origin =
    "https://shopnest-frontend-pnt2-rs3l6b66s-yashmin.vercel.app";
  const response = await request(app).get("/api/health").set("Origin", origin);

  assert.equal(response.status, 200);
  assert.equal(response.headers["access-control-allow-origin"], origin);
});

test("CORS rejects unrelated Vercel origins", async () => {
  const response = await request(app)
    .get("/api/health")
    .set("Origin", "https://unrelated-project.vercel.app");

  assert.equal(response.status, 403);
  assert.equal(response.body.message, "Not allowed by CORS");
});

test("unknown routes return a JSON 404", async () => {
  const response = await request(app).get("/api/does-not-exist");

  assert.equal(response.status, 404);
  assert.match(response.body.message, /Route not found/);
});

test("register rejects invalid input before touching the database", async () => {
  const response = await request(app).post("/api/auth/register").send({
    name: "A",
    email: "bad-email",
    password: "123",
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, "Validation failed");
  assert.ok(Array.isArray(response.body.details));
});

test("login rejects invalid input", async () => {
  const response = await request(app).post("/api/auth/login").send({
    email: "not-an-email",
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, "Validation failed");
});

test("order creation requires authentication", async () => {
  const response = await request(app).post("/api/orders").send({});

  assert.equal(response.status, 401);
  assert.match(response.body.message, /Not authorized/);
});

test("payment endpoints require authentication", async () => {
  const createResponse = await request(app).post("/api/payment/order").send({});
  const verifyResponse = await request(app).post("/api/payment/verify").send({});

  assert.equal(createResponse.status, 401);
  assert.equal(verifyResponse.status, 401);
});

test("admin endpoints require authentication", async () => {
  const response = await request(app).get("/api/admin/orders");

  assert.equal(response.status, 401);
  assert.match(response.body.message, /Not authorized/);
});

test("wishlist endpoints require authentication", async () => {
  const getResponse = await request(app).get("/api/wishlist");
  const addResponse = await request(app).post(
    "/api/wishlist/64b7f9c2f1a2b3c4d5e6f7a8"
  );
  const removeResponse = await request(app).delete(
    "/api/wishlist/64b7f9c2f1a2b3c4d5e6f7a8"
  );

  assert.equal(getResponse.status, 401);
  assert.equal(addResponse.status, 401);
  assert.equal(removeResponse.status, 401);
});
