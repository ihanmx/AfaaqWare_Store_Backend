const Product = require("../models/productsModel");
const ApiError = require("../utils/ApiError");
const imageService = require("./imageService");

const MAX_PRODUCT_IMAGES = 5;
// Create a new product
const createProduct = async (data) => {
  return await Product.create(data);
};

// Get all products
const getAllProducts = async () => {
  return await Product.find();
};

// Get a single product by ID
const getProductById = async (id) => {
  const product = await Product.findById(id);
  if (!product) {
    throw ApiError.notFound("Product not found");
  }
  return product;
};

// Update a product by ID
const updateProduct = async (id, data) => {
  const product = await Product.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!product) {
    throw ApiError.notFound("Product not found");
  }
  return product;
};

// Delete a product by ID
const deleteProduct = async (id) => {
  const product = await Product.findByIdAndDelete(id);
  await imageService.deleteImages(product.images.map((img) => img.url));

  if (!product) {
    throw ApiError.notFound("Product not found");
  }
  return product;
};

const addImages = async (id, files) => {
  if (!files?.length) {
    throw ApiError.badRequest("Attach at least one image");
  }

  // Check everything cheap BEFORE spending CPU on sharp.
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound("Product not found");

  if (product.images.length + files.length > MAX_PRODUCT_IMAGES) {
    throw ApiError.badRequest(
      `A product can have at most ${MAX_PRODUCT_IMAGES} images ` +
        `(it has ${product.images.length})`,
    );
  }

  const urls = await imageService.saveImages(files, "product");

  product.images.push(...urls.map((url) => ({ url })));
  try {
    await product.save();
  } catch (error) {
    await imageService.deleteImages(urls); // files written, DB failed: undo
    throw error;
  }
  return product;
};

const removeImage = async (id, imageId) => {
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound("Product not found");

  const image = product.images.id(imageId); // Mongoose subdoc lookup by _id
  if (!image) throw ApiError.notFound("Image not found");

  const { url } = image;
  image.deleteOne();
  await product.save();

  await imageService.deleteImage(url); // DB first, then the file
  return product;
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  addImages,
  removeImage,
};
