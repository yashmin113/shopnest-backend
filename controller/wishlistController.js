import User from "../model/User.js";
import Product from "../model/Product.js";
import { asyncHandler, HttpError } from "../utils/errors.js";

const wishlistFields =
  "name description price category stock imageUrl rating numReviews";

const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate(
    "wishlist",
    wishlistFields
  );

  const products = (user?.wishlist || []).filter(Boolean);

  res.json(products);
});

const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const product = await Product.findById(productId);

  if (!product) {
    throw new HttpError(404, "Product not found");
  }

  await User.updateOne(
    { _id: req.user._id },
    { $addToSet: { wishlist: productId } }
  );

  res.status(200).json({
    message: "Added to wishlist",
    productId,
    wishlisted: true,
  });
});

const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  await User.updateOne(
    { _id: req.user._id },
    { $pull: { wishlist: productId } }
  );

  res.status(200).json({
    message: "Removed from wishlist",
    productId,
    wishlisted: false,
  });
});

export { getWishlist, addToWishlist, removeFromWishlist };
