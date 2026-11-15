import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import productsRoutes from "./routes/productsRoutes.js";
import orderRoutes from "./routes/orderRoute.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { HttpError } from "./utils/errors.js";

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

const allowedOrigins = (
  process.env.CLIENT_URLS ||
  "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isShopNestVercelOrigin = (origin) => {
  try {
    const { hostname, protocol } = new URL(origin);

    return (
      protocol === "https:" &&
      (hostname === "shopnest-frontend-pnt2.vercel.app" ||
        /^shopnest-frontend-pnt2-[a-z0-9-]+-yashmin\.vercel\.app$/i.test(
          hostname
        ))
    );
  } catch {
    return false;
  }
};

app.use(helmet());

if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        isShopNestVercelOrigin(origin)
      ) {
        return callback(null, true);
      }

      return callback(new HttpError(403, "Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again later." },
});

app.get("/", (req, res) => {
  res.json({ message: "ShopNest API is running" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.use("/api", apiLimiter);

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

if (process.env.VERCEL) {
  await connectDB();
}

export default app;
