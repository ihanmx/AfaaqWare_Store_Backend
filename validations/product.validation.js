const { z } = require("zod");
const { objectId, idParams, nonEmpty } = require("./common");

const createProductSchema = z.strictObject({
  name: z.string().trim().min(1, "Name is required").max(200),
  price: z.number().positive("Price must be greater than 0"),
  stock: z.number().int("Stock must be a whole number").min(0),
  category: objectId.optional(), // model has no `required: true`
});
const productImageParams = idParams("id", "imageId");
const updateProductSchema = nonEmpty(createProductSchema.partial());

const productParams = idParams("id");

module.exports = {
  createProductSchema,
  updateProductSchema,
  productParams,
};
