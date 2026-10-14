const productService = require("../services/productService");

// No try/catch: Express 5 forwards a rejected promise to the error handler,
// and every input is already validated by middlewares/validate.js.

// @desc Create a new product
// @route POST /api/products
// @access Admin
const createProduct = async (req, res) => {
  const product = await productService.createProduct(req.validated.body);
  res.status(201).json({ message: "Product created successfully", product });
};

// @desc Get all products
// @route GET /api/products
// @access Public
const getAllProducts = async (req, res) => {
  const products = await productService.getAllProducts();
  res.status(200).json({ products });
};

// @desc Get a product by ID
// @route GET /api/products/:id
// @access Public
const getProductById = async (req, res) => {
  const product = await productService.getProductById(req.validated.params.id);
  res.status(200).json({ product });
};

// @desc Update a product
// @route PUT /api/products/:id
// @access Admin
const updateProduct = async (req, res) => {
  const product = await productService.updateProduct(
    req.validated.params.id,
    req.validated.body,
  );
  res.status(200).json({ message: "Product updated successfully", product });
};

// @desc Delete a product
// @route DELETE /api/products/:id
// @access Admin
const deleteProduct = async (req, res) => {
  await productService.deleteProduct(req.validated.params.id);
  res.status(200).json({ message: "Product deleted successfully" });
};

// / @route POST /api/v1/products/:id/images
// @access Admin
const addProductImages = async (req, res) => {
  const product = await productService.addImages(
    req.validated.params.id,
    req.files, // plural - from .array()
  );
  res.status(201).json({ message: "Images added", product });
};

// @route DELETE /api/v1/products/:id/images/:imageId
// @access Admin
const removeProductImage = async (req, res) => {
  const { id, imageId } = req.validated.params;
  const product = await productService.removeImage(id, imageId);
  res.status(200).json({ message: "Image removed", product });
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  addProductImages,
  removeProductImage,
};
