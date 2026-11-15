import Order from "../model/Order.js";
import PaymentIntent from "../model/PaymentIntent.js";
import sendEmail from "../utils/sendEmail.js";
import { asyncHandler, HttpError } from "../utils/errors.js";
import { assertAmountMatches, verifyPaymentSignature } from "../utils/razorpay.js";
import {
  buildOrderItems,
  calculateTotal,
  releaseStock,
  reserveStock,
} from "../services/orderService.js";

const createOrder = asyncHandler(async (req, res) => {
  const { address, payment } = req.body;

  const existingOrder = await Order.findOne({ paymentId: payment.paymentId });

  if (existingOrder) {
    throw new HttpError(409, "An order already exists for this payment");
  }

  verifyPaymentSignature({
    orderId: payment.orderId,
    paymentId: payment.paymentId,
    signature: payment.signature,
  });

  const intent = await PaymentIntent.findOne({
    razorpayOrderId: payment.orderId,
    user: req.user._id,
  });

  if (!intent) {
    throw new HttpError(
      400,
      "Payment session not found. Please start checkout again"
    );
  }

  if (intent.status === "completed") {
    throw new HttpError(409, "This payment has already been used for an order");
  }

  await buildOrderItems(intent.items);

  const orderItems = intent.items.map(({ product, qty, price }) => ({
    product,
    qty,
    price,
  }));

  const totalAmount = calculateTotal(orderItems);
  assertAmountMatches(intent.totalAmount, totalAmount);

  const reservedItems = await reserveStock(orderItems);

  let order;

  try {
    order = await Order.create({
      user: req.user._id,
      products: orderItems,
      totalAmount,
      address,
      paymentId: payment.paymentId,
      razorpayOrderId: payment.orderId,
      paymentStatus: "paid",
    });
  } catch (error) {
    await releaseStock(reservedItems);
    throw error;
  }

  intent.status = "completed";
  intent.order = order._id;

  try {
    await intent.save();
  } catch (error) {
    console.error(
      `Order ${order._id} created but payment intent ${intent._id} was not marked completed:`,
      error.message
    );
  }

  const message = `Dear ${req.user.name},

Thank you for your order!

Your order has been successfully created with the following details:

Order ID: ${order._id}
Total Amount: ₹${order.totalAmount}

Shipping Address:
${order.address.fullName}
${order.address.street}
${order.address.city}, ${order.address.postalCode}
${order.address.country}

We will notify you once your order has been shipped.

Best regards,
ShopNest Team`;

  await sendEmail(req.user.email, "Order Created", message);

  res.status(201).json({
    message: "Order created successfully",
    order,
  });
});

const myOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .populate("products.product", "name price imageUrl")
    .sort({ createdAt: -1 });

  res.json(orders);
});

const getOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const filter = {};

  if (req.query.status) {
    filter.status = req.query.status;
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  res.json({
    orders,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

const updateOrdersStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new HttpError(404, "Order not found");
  }

  if (order.status === "cancelled" && status !== "cancelled") {
    throw new HttpError(400, "Cancelled orders cannot be reopened");
  }

  if (order.status === "delivered" && status === "cancelled") {
    throw new HttpError(400, "Delivered orders cannot be cancelled");
  }

  if (order.status !== status && status === "cancelled") {
    await releaseStock(
      order.products.map((item) => ({
        product: item.product,
        qty: item.qty,
      }))
    );
  }

  order.status = status;
  await order.save();

  res.json({
    message: "Order status updated",
    order,
  });
});

export { createOrder, myOrders, getOrders, updateOrdersStatus };
