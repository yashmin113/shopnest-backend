import express from "express";

import productController from "../controller/productController.js";

const { getProducts, getProductById } = productController;

const router = express.Router();

router.route("/").get(getProducts);

router.route("/:id").get(getProductById);

export default router;
