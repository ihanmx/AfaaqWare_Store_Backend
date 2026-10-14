const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validate");
const protect = require("../middlewares/protect");
const restrictTo = require("../middlewares/restrictTo");

const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const {
  createProductSchema,
  updateProductSchema,
  productParams,
} = require("../validations/product.validation");

// Chain order: authenticate -> authorize -> validate -> controller.
// An anonymous request gets a flat 401 rather than a 400 that leaks the schema.
router.post(
  "/",
  protect,
  restrictTo("admin"),
  validate({ body: createProductSchema }),
  createProduct,
);
router.get("/", getAllProducts);
router.get("/:id", validate({ params: productParams }), getProductById);
router.put(
  "/:id",
  protect,
  restrictTo("admin"),
  validate({ params: productParams, body: updateProductSchema }),
  updateProduct,
);
router.delete(
  "/:id",
  protect,
  restrictTo("admin"),
  validate({ params: productParams }),
  deleteProduct,
);

router.post(
  "/:id/images",
  protect,
  restrictTo("admin"),
  validate({ params: productParams }), // bad id -> 400 before buffering files
  uploadProductImages,
  addProductImages,
);
router.delete(
  "/:id/images/:imageId",
  protect,
  restrictTo("admin"),
  validate({ params: productImageParams }),
  removeProductImage,
);
module.exports = router;
