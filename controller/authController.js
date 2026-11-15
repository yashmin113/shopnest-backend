import User from "../model/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import sendEmail from "../utils/sendEmail.js";
import { asyncHandler, HttpError } from "../utils/errors.js";

const OTP_TTL_MS = 10 * 60 * 1000;
const RESET_TTL_MS = 15 * 60 * 1000;

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });

const createOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const buildAuthPayload = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  verified: user.verified,
  avatar: user.avatar || "",
  authProvider: user.authProvider || "local",
  token: generateToken(user._id),
});

const sendOtpEmail = (email, name, otp) => {
  const message = `Welcome to ShopNest, ${name}!

Your OTP for ShopNest email verification is: ${otp}

This code expires in 10 minutes. If you did not create this account, you can ignore this email.

Best regards,
ShopNest Team`;

  return sendEmail(email, "ShopNest - Verify your email", message);
};

const sendPasswordResetEmail = (email, name, code) => {
  const message = `Hi ${name || "there"},

We received a request to reset your ShopNest password.

Your password reset code is: ${code}

This code expires in 15 minutes. If you did not request a password reset, you can safely ignore this email and your password will remain unchanged.

Best regards,
ShopNest Team`;

  return sendEmail(email, "ShopNest - Reset your password", message);
};

// Register user
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new HttpError(400, "User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const otp = createOtp();
  const otpHash = await bcrypt.hash(otp, 10);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    authProvider: "local",
    otpHash,
    otpExpiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  const emailSent = await sendOtpEmail(user.email, user.name, otp);

  res.status(201).json({
    message: emailSent
      ? "Registration successful. Please verify your email."
      : "Registration successful, but the OTP email could not be sent. Use Resend OTP.",
    email: user.email,
    emailSent,
    requiresVerification: true,
  });
});

// Verify email OTP
const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email }).select(
    "+otpHash +otpExpiresAt"
  );

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  if (user.verified) {
    return res.json({ message: "Email is already verified." });
  }

  if (!user.otpHash || !user.otpExpiresAt) {
    throw new HttpError(400, "No verification is pending for this email");
  }

  if (user.otpExpiresAt.getTime() < Date.now()) {
    throw new HttpError(400, "OTP has expired. Please request a new one.");
  }

  const isMatch = await bcrypt.compare(otp, user.otpHash);

  if (!isMatch) {
    throw new HttpError(400, "Invalid OTP");
  }

  user.verified = true;
  user.otpHash = undefined;
  user.otpExpiresAt = undefined;
  await user.save();

  res.json({ message: "Email verified successfully. You can now log in." });
});

// Resend verification OTP
const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  if (user.verified) {
    throw new HttpError(400, "Email is already verified");
  }

  const otp = createOtp();
  user.otpHash = await bcrypt.hash(otp, 10);
  user.otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
  await user.save();

  const emailSent = await sendOtpEmail(user.email, user.name, otp);

  if (!emailSent) {
    throw new HttpError(
      502,
      "Unable to send the OTP email right now. Please try again shortly."
    );
  }

  res.json({ message: "A new OTP has been sent to your email." });
});

// Login user
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select(
    "+otpHash +otpExpiresAt"
  );

  if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
    throw new HttpError(400, "Invalid email or password");
  }

  if (user.otpHash && !user.verified) {
    throw new HttpError(403, "Please verify your email before logging in.");
  }

  res.json(buildAuthPayload(user));
});

// Google Sign-In (ID token verification)
const googleLogin = asyncHandler(async (req, res) => {
  const { credential } = req.body;

  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new HttpError(500, "Google sign-in is not configured on the server");
  }

  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  let payload;

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    payload = ticket.getPayload();
  } catch (error) {
    throw new HttpError(401, "Google verification failed. Please try again.");
  }

  const validIssuer =
    payload?.iss === "accounts.google.com" ||
    payload?.iss === "https://accounts.google.com";

  if (!validIssuer || !payload?.email || !payload.email_verified) {
    throw new HttpError(401, "Invalid Google account details");
  }

  const { sub, email, name, picture } = payload;
  const normalizedEmail = email.toLowerCase();

  let user = await User.findOne({ email: normalizedEmail });

  if (user) {
    if (user.role === "admin") {
      throw new HttpError(
        403,
        "Admin accounts must sign in with a password"
      );
    }

    if (user.googleId && user.googleId !== sub) {
      throw new HttpError(409, "This email is linked to another Google account");
    }

    user.googleId = user.googleId || sub;
    user.avatar = user.avatar || picture || "";
    user.verified = true;
    await user.save();
  } else {
    user = await User.create({
      name: name || normalizedEmail.split("@")[0],
      email: normalizedEmail,
      googleId: sub,
      avatar: picture || "",
      verified: true,
      authProvider: "google",
      role: "user",
    });
  }

  res.json(buildAuthPayload(user));
});

// Request password reset code
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const responseMessage =
    "If an account with that email exists, a password reset code has been sent.";

  const user = await User.findOne({ email });

  if (!user) {
    return res.json({ message: responseMessage });
  }

  const code = createOtp();
  user.resetHash = await bcrypt.hash(code, 10);
  user.resetExpiresAt = new Date(Date.now() + RESET_TTL_MS);
  await user.save();

  const emailSent = await sendPasswordResetEmail(user.email, user.name, code);

  res.json({
    message: emailSent
      ? responseMessage
      : "We could not send the reset email right now. Please try again shortly.",
  });
});

// Reset password using the emailed code
const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, password } = req.body;

  const user = await User.findOne({ email }).select("+resetHash +resetExpiresAt");

  if (!user || !user.resetHash || !user.resetExpiresAt) {
    throw new HttpError(400, "Invalid or expired reset code");
  }

  if (user.resetExpiresAt.getTime() < Date.now()) {
    throw new HttpError(400, "Reset code has expired. Please request a new one.");
  }

  const isMatch = await bcrypt.compare(code, user.resetHash);

  if (!isMatch) {
    throw new HttpError(400, "Invalid or expired reset code");
  }

  user.password = await bcrypt.hash(password, 10);
  user.verified = true;
  user.resetHash = undefined;
  user.resetExpiresAt = undefined;
  await user.save();

  res.json({ message: "Password reset successfully. You can now log in." });
});

const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({})
    .select("-password -otpHash -otpExpiresAt -resetHash -resetExpiresAt -wishlist")
    .sort({ createdAt: -1 });

  res.json(users);
});

export default {
  registerUser,
  verifyOtp,
  resendOtp,
  loginUser,
  googleLogin,
  forgotPassword,
  resetPassword,
  getUsers,
};
