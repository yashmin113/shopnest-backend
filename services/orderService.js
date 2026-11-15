import Product from "../model/Product.js";
import { HttpError } from "../utils/errors.js";

export const calculateTotal = (items) =>
  Number(
    items
      .reduce((total, item) => total + Number(item.price) * Number(item.qty), 0)
      .toFixed(2)
  );

export const buildOrderItems = async (items) => {
  const ids = [...new Set(items.map((item) => String(item.product)))];
  const products = await Product.find({ _id: { $in: ids } });
  const productMap = new Map(products.map((product) => [String(product._id), product]));

  return items.map((item) => {
    const product = productMap.get(String(item.product));

    if (!product) {
      throw new HttpError(400, `Product not found: ${item.product}`);
    }

    if (product.stock < item.qty) {
      throw new HttpError(400, `Insufficient stock for ${product.name}`);
    }

    return {
      product: product._id,
      qty: item.qty,
      price: product.price,
    };
  });
};

export const releaseStock = async (items) => {
  await Promise.all(
    items.map((item) =>
      Product.updateOne(
        { _id: item.product },
        { $inc: { stock: Number(item.qty) } }
      )
    )
  );
};

export const reserveStock = async (items) => {
  const reserved = [];

  for (const item of items) {
    const result = await Product.updateOne(
      { _id: item.product, stock: { $gte: item.qty } },
      { $inc: { stock: -Number(item.qty) } }
    );

    if (result.modifiedCount !== 1) {
      await releaseStock(reserved);
      throw new HttpError(
        400,
        "One or more products no longer have enough stock"
      );
    }

    reserved.push(item);
  }

  return reserved;
};
