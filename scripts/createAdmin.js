import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import connectDB from "../config/db.js";
import User from "../model/User.js";

dotenv.config();

const createAdmin = async () => {
  const name = process.env.ADMIN_NAME || "ShopNest Admin";
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD before running this script");
  }

  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters");
  }

  await connectDB();

  const normalizedEmail = email.toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });
  const hashedPassword = await bcrypt.hash(password, 10);

  if (existingUser) {
    existingUser.name = name;
    existingUser.password = hashedPassword;
    existingUser.role = "admin";
    existingUser.verified = true;
    existingUser.otpHash = undefined;
    existingUser.otpExpiresAt = undefined;
    await existingUser.save();

    console.log(`Updated ${normalizedEmail} as an admin.`);
  } else {
    await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: "admin",
      verified: true,
    });

    console.log(`Created admin account: ${normalizedEmail}`);
  }
};

createAdmin()
  .catch((error) => {
    console.error("Unable to create admin:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
