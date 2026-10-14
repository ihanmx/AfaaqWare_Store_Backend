const express = require("express");
const productRoute = require("./routes/productRoute");
const reviewRoutes = require("./routes/reviewRoutes");
const userRoute = require("./routes/userRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoutes");
const { notFound, errorHandler } = require("./middlewares/errorHandeler");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Hello, World!");
});
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    maxAge: "1y",
    immutable: true, // safe: every upload gets a new uuid, a name is never reused
    index: false,
  }),
);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/products", productRoute);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/users", userRoute);
app.use("/api/v1/carts", cartRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/categories", categoryRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
