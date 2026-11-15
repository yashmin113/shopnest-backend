import express from "express";
import authController from "../controller/authController.js";
import { validate } from "../middleware/validate.js";
import {
  forgotPasswordSchema,
  googleAuthSchema,
  loginSchema,
  registerSchema,
  resendOtpSchema,
  resetPasswordSchema,
  verifyOtpSchema,
} from "../utils/validation.js";

const router = express.Router();

router.post("/register", validate(registerSchema), authController.registerUser);
router.post("/verify-otp", validate(verifyOtpSchema), authController.verifyOtp);
router.post("/resend-otp", validate(resendOtpSchema), authController.resendOtp);
router.post("/login", validate(loginSchema), authController.loginUser);
router.post("/google", validate(googleAuthSchema), authController.googleLogin);
router.post(
  "/forgot-password",
  validate(forgotPasswordSchema),
  authController.forgotPassword
);
router.post(
  "/reset-password",
  validate(resetPasswordSchema),
  authController.resetPassword
);

export default router;
