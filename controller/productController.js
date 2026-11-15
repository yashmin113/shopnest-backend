import { unlink } from "node:fs/promises";
import Product from "../model/Product.js";
import cloudinary from "../config/cloudinary.js";
import { asyncHandler, HttpError } from "../utils/errors.js";

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildFilter = ({ search, category } = {}) => {
  const filter = {};

  if (search) {
    const pattern = new RegExp(escapeRegex(String(search).trim()), "i");
    filter.$or = [{ name: pattern }, { description: pattern }, { category: pattern }];
  }

  if (category) {
    filter.category = category;
  }

  return filter;
};

const extractPublicId = (url) => {
  if (!url || !url.includes("cloudinary.com")) return null;

  const [prefix, rest] = url.split("/upload/");
  if (!prefix || !rest) return null;

  return rest.replace(/^v\d+\//, "").replace(/\.[^.]+$/, "");
};

const uploadProductImage = async (file) => {
  try {
    return await cloudinary.uploader.upload(file.path, {
      folder: "shopnest/products",
      resource_type: "image",
    });
  } finally {
    await unlink(file.path).catch(() => {});
  }
};

const removeCloudinaryImage = async (publicId) => {
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary delete failed:", error.message);
  }
};

const getProducts = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query);
  const limit = Number(req.query.limit);

  let query = Product.find(filter).sort({ createdAt: -1 });

  if (Number.isFinite(limit) && limit > 0) {
    query = query.limit(Math.min(limit, 100));
  }

  const products = await query;
  res.json(products);
});

const getAdminProducts = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const filter = buildFilter(req.query);

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  res.json({
    products,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new HttpError(404, "Product not found");
  }

  res.json(product);
});

const createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, category, stock } = req.body;

  let imageUrl = req.body.imageUrl || "";
  let imagePublicId;

  if (req.file) {
    const result = await uploadProductImage(req.file);
    imageUrl = result.secure_url;
    imagePublicId = result.public_id;
  }

  if (!imageUrl) {
    throw new HttpError(400, "Product image is required");
  }

  const product = await Product.create({
    name,
    description,
    price,
    category,
    stock,
    imageUrl,
    imagePublicId,
  });

  res.status(201).json(product);
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new HttpError(404, "Product not found");
  }

  const editableFields = ["name", "description", "price", "category", "stock"];

  editableFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      product[field] = req.body[field];
    }
  });

  if (req.file) {
    const oldPublicId =
      product.imagePublicId || extractPublicId(product.imageUrl);
    const result = await uploadProductImage(req.file);

    product.imageUrl = result.secure_url;
    product.imagePublicId = result.public_id;

    await removeCloudinaryImage(oldPublicId);
  } else if (req.body.imageUrl) {
    product.imageUrl = req.body.imageUrl;
  }

  const updatedProduct = await product.save();
  res.json(updatedProduct);
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new HttpError(404, "Product not found");
  }

  const publicId =
    product.imagePublicId || extractPublicId(product.imageUrl);

  await removeCloudinaryImage(publicId);
  await product.deleteOne();

  res.json({ message: "Product removed" });
});

export default {
  createProduct,
  getProductById,
  getProducts,
  getAdminProducts,
  updateProduct,
  deleteProduct,
};
