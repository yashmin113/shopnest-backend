import mongoose from "mongoose";

const paymentIntentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        qty: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
    },

    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
      index: true,
    },

    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
  },
  { timestamps: true }
);

paymentIntentSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

const PaymentIntent = mongoose.model("PaymentIntent", paymentIntentSchema);

export default PaymentIntent;
