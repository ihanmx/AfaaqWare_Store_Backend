const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validate");
const {
  forgotPasswordLimiter,
  verifyOtpLimiter,
  loginLimiter,
} = require("../middlewares/rateLimit");

const {
  register,
  login,
  logout,
  forgotPassword,
  verifyOtp,
  resetPassword,
} = require("../controllers/authController");

const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
} = require("../validations/auth.validations");

router.post("/register", validate({ body: registerSchema }), register);
router.post("/login", loginLimiter, validate({ body: loginSchema }), login);
router.post("/logout", logout);

router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validate({ body: forgotPasswordSchema }),
  forgotPassword,
);

router.post(
  "/verify-otp",
  verifyOtpLimiter,
  validate({ body: verifyOtpSchema }),
  verifyOtp,
);

// No limiter: the resetToken is already single-use and high-entropy, so
// there is nothing here worth guessing.
router.post(
  "/reset-password",
  validate({ body: resetPasswordSchema }),
  resetPassword,
);

router.post("/refresh", refreshLimiter, refresh);

module.exports = router;
