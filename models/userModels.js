const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    // select: false keeps the hash out of every query by default.
    // Reading it back needs an explicit .select("+password").
    password: { type: String, required: true, trim: true, select: false },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    avatar: { type: String, default: null },
    passwordChangedAt: Date,
    passwordResetOtp: { type: String, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    passwordResetAttempts: { type: Number, default: 0, select: false },
  },
  {
    timestamps: true,
  },
);

// An async hook must NOT take `next` - Mongoose only passes it to callback
// style hooks, so `next` would be undefined here. Resolving is enough.
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

const User = mongoose.model("User", userSchema);
module.exports = User;
