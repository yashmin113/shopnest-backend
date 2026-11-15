import Order from "../model/Order.js";
import Product from "../model/Product.js";
import User from "../model/User.js";
import { asyncHandler } from "../utils/errors.js";

const getAdminStats = asyncHandler(async (req, res) => {
  const [totalUsers, totalOrders, totalProducts, revenue] = await Promise.all([
    User.countDocuments({ role: "user" }),
    Order.countDocuments({}),
    Product.countDocuments({}),
    Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
  ]);

  res.json({
    totalUsers,
    totalOrders,
    totalProducts,
    totalRevenue: revenue[0]?.total || 0,
  });
});

export { getAdminStats };
