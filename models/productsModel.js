// create schema
const mongoose = require("mongoose");
const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
});
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true },
    category: {
      type: mongoose.Schema.ObjectId,
      ref: "Category",
    },
    images: { type: [imageSchema], default: [] },
  },
  { timestamps: true },
);

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
