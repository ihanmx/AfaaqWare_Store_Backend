const authService = require("../services/authService");

// The refresh token goes in an httpOnly cookie so page JavaScript can't read
// it. The access token goes in the body for the client to hold in memory.
const isProd = process.env.NODE_ENV === "production";
const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "None" : "Lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7d, matches the refresh token's expiry
};

// @desc Create an account
// @route POST /api/v1/auth/register
// @access Public
const register = async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.register(
    req.validated.body,
  );

  res.cookie("jwt", refreshToken, cookieOptions);
  res.status(201).json({ message: "Account created", user, accessToken });
};

// @desc Log in
// @route POST /api/v1/auth/login
// @access Public
const login = async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(
    req.validated.body,
  );

  res.cookie("jwt", refreshToken, cookieOptions);
  res.status(200).json({ message: "Logged in", user, accessToken });
};

// @desc Log out by clearing the refresh cookie
// @route POST /api/v1/auth/logout
// @access Public
const logout = async (req, res) => {
  // Options must match the ones the cookie was set with, minus maxAge,
  // or the browser won't clear it.
  res.clearCookie("jwt", { ...cookieOptions, maxAge: undefined });
  res.status(200).json({ message: "Logged out" });
};

// @route POST /api/v1/auth/forgot-password
const forgotPassword = async (req, res) => {
  await authService.forgotPassword(req.validated.body);

  // Identical response whether or not the account exists.
  res.status(200).json({
    message: "If an account exists for that email, a reset code has been sent",
  });
};

// @route POST /api/v1/auth/verify-otp
const verifyOtp = async (req, res) => {
  const { resetToken } = await authService.verifyResetOtp(req.validated.body);
  res.status(200).json({ message: "Code verified", resetToken });
};

// @route POST /api/v1/auth/reset-password
const resetPassword = async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.resetPassword(
    req.validated.body,
  );

  res.cookie("jwt", refreshToken, cookieOptions);
  res.status(200).json({ message: "Password reset", user, accessToken });
};

// @desc Refresh the session
// @route POST /api/v1/auth/refresh
// @access Public
const refresh = async (req, res) => {
  // Input comes from the cookie, not the body - that is the whole point of
  // httpOnly: the client never handles this value.
  const { user, accessToken, refreshToken } = await authService.refresh(
    req.cookies.jwt,
  );

  res.cookie("jwt", refreshToken, cookieOptions);
  res.status(200).json({ message: "Session refreshed", user, accessToken });
};

module.exports = {
  register,
  login,
  logout,
  forgotPassword,
  verifyOtp,
  resetPassword,
};
