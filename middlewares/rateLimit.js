const rateLimit = require("express-rate-limit");

const makeLimiter = ({ limit, message }) =>
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit,
    message: { success: false, message },
    standardHeaders: true,
    legacyHeaders: false,
  });

const forgotPasswordLimiter = makeLimiter({
  limit: 5,
  message: "Too many reset requests, try again later",
});

const verifyOtpLimiter = makeLimiter({
  limit: 10,
  message: "Too many attempts, try again later",
});

const loginLimiter = makeLimiter({
  limit: 10,
  message: "Too many login attempts, try again later",
});

const refreshLimiter = makeLimiter({
  limit: 60,
  message: "Too many refresh attempts, try again later",
});

module.exports = {
  forgotPasswordLimiter,
  verifyOtpLimiter,
  loginLimiter,
  refreshLimiter,
};
