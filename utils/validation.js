import { z } from "zod";

const password = z.string().min(6, "Password must be at least 6 characters").max(72);

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const googleAuthSchema = z.object({
  credential: z.string().trim().min(20, "Google credential is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  code: z.string().trim().regex(/^\d{6}$/, "Reset code must be 6 digits"),
  password,
});

export const verifyOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  otp: z.string().trim().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

export const resendOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});

export const productSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(120),
  description: z.string().trim().min(10, "Description is too short").max(5000),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  category: z.string().trim().min(2, "Category is too short").max(60),
  stock: z.coerce.number().int().min(0, "Stock cannot be negative"),
  imageUrl: z.string().url("Enter a valid image URL").optional().or(z.literal("")),
});

export const productUpdateSchema = productSchema.partial();

export const orderSchema = z.object({
  items: z
    .array(
      z.object({
        product: z.string().min(1, "Product id is required"),
        qty: z.coerce.number().int().min(1).max(99),
      })
    )
    .min(1, "Order must contain at least one item"),
  address: z.object({
    fullName: z.string().trim().min(2, "Full name is required"),
    street: z.string().trim().min(2, "Street is required"),
    city: z.string().trim().min(2, "City is required"),
    postalCode: z.string().trim().min(3, "Postal code is required"),
    country: z.string().trim().min(2, "Country is required"),
  }),
  payment: z.object({
    orderId: z.string().trim().min(1),
    paymentId: z.string().trim().min(1),
    signature: z.string().trim().min(1),
  }),
});

export const orderStatusSchema = z.object({
  status: z.enum(["pending", "shipped", "delivered", "cancelled"]),
});

export const paymentOrderSchema = orderSchema.pick({ items: true });

export const paymentVerifySchema = z.object({
  razorpay_order_id: z.string().trim().min(1),
  razorpay_payment_id: z.string().trim().min(1),
  razorpay_signature: z.string().trim().min(1),
});

export const wishlistProductSchema = z.object({
  productId: z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid product id"),
});
