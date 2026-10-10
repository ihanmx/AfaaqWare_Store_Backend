const bcrypt = require("bcrypt");
const ApiError = require("../utils/ApiError");
const User = require("../models/userModels");
const { issueTokens, verifyRefreshToken } = require("../utils/tokenService");
const crypto = require("crypto");
const { generateOtp, generateResetToken, hash } = require("../utils/otp");
const emailService = require("./emailService");

const OTP_TTL_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;

const publicUser = (user) => ({
  _id: user._id,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

// @desc Create an account and start a session
// @route POST /api/v1/auth/register
// @access Public
const register = async ({ fullName, email, password }) => {
  //  The unique index is the only real guarantee

  let user;
  try {
    user = await User.create({ fullName, email, password });
  } catch (error) {
    if (error.code === 11000) {
      throw ApiError.conflict("An account with this email already exists");
    }
    throw error;
  }

  // Credentials were just supplied and accepted, so start the session now.
  return { user: publicUser(user), ...issueTokens(user) };
};

// @desc Verify credentials and start a session
// @route POST /api/v1/auth/login
// @access Public
const login = async ({ email, password }) => {
  const foundUser = await User.findOne({ email }).select("+password").exec();

  if (!foundUser) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const match = await bcrypt.compare(password, foundUser.password);
  if (!match) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  return { user: publicUser(foundUser), ...issueTokens(foundUser) };
};

const forgotPassword = async ({ email }) => {
  // The reset fields are select:false, so ask for them explicitly - a path
  // that wasn't selected can't be reliably modified and saved.
  const user = await User.findOne({ email }).select(
    "+passwordResetOtp +passwordResetToken +passwordResetExpires +passwordResetAttempts",
  );

  // Deliberately silent on a missing account: saying "no such email" turns
  // this endpoint into a way to discover who has an account here.
  // The controller returns the same 200 either way.
  if (!user) return;

  const otp = generateOtp();

  user.passwordResetOtp = hash(otp);
  user.passwordResetToken = undefined; // invalidate any earlier flow
  user.passwordResetExpires = Date.now() + OTP_TTL_MINUTES * 60 * 1000;
  user.passwordResetAttempts = 0;
  await user.save({ validateBeforeSave: false });

  try {
    await emailService.sendPasswordResetOtp(user, otp, OTP_TTL_MINUTES);
  } catch (error) {
    // Don't leave a live OTP behind if the email never went out.
    user.passwordResetOtp = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    throw ApiError.internal("Could not send the reset email, please try again");
  }
};

const verifyResetOtp = async ({ email, otp }) => {
  const user = await User.findOne({ email }).select(
    "+passwordResetOtp +passwordResetToken +passwordResetExpires +passwordResetAttempts",
  );

  const invalid = ApiError.badRequest("Invalid or expired code");

  if (
    !user ||
    !user.passwordResetOtp ||
    user.passwordResetExpires < Date.now()
  ) {
    throw invalid;
  }

  // The attempt limit is what makes a 6-digit code safe. Without it, 1,000,000
  // guesses is minutes of scripted requests.
  if (user.passwordResetAttempts >= MAX_OTP_ATTEMPTS) {
    user.passwordResetOtp = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    throw ApiError.badRequest("Too many attempts, request a new code");
  }
  //check match
  const matches = crypto.timingSafeEqual(
    Buffer.from(hash(otp)),
    Buffer.from(user.passwordResetOtp),
  );

  if (!matches) {
    user.passwordResetAttempts += 1;
    await user.save({ validateBeforeSave: false });
    throw invalid;
  }
  //if success generate token
  const resetToken = generateResetToken();
  user.passwordResetOtp = undefined;
  user.passwordResetAttempts = 0;
  user.passwordResetToken = hash(resetToken);
  user.passwordResetExpires = Date.now() + OTP_TTL_MINUTES * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  return { resetToken };
};

const resetPassword = async ({ resetToken, password }) => {
  // Found by token hash alone - the token identifies the user, so this step
  // needs no email and can't be aimed at a different account.
  const user = await User.findOne({
    passwordResetToken: hash(resetToken),
    passwordResetExpires: { $gt: Date.now() },
  }).select("+passwordResetToken +passwordResetExpires +passwordResetAttempts");

  if (!user) {
    throw ApiError.badRequest("Invalid or expired reset token");
  }

  user.password = password; // pre("save") hook hashes it
  user.passwordResetToken = undefined; // single use
  user.passwordResetExpires = undefined;
  user.passwordResetAttempts = 0;

  // No backdating needed: protect compares whole seconds on both sides, so a
  // token signed in this same second still passes while anything older is
  // revoked. Subtracting 1000 here would only widen that survival window.
  user.passwordChangedAt = Date.now();

  await user.save(); // full validation here: it's a real password

  // Fire and forget: a failed notification must not fail the reset.
  emailService.sendPasswordChanged(user).catch(() => {});

  return { user: publicUser(user), ...issueTokens(user) };
};

// @desc Exchange a valid refresh cookie for a fresh token pair
// @route POST /api/v1/auth/refresh
// @access Public (the cookie IS the credential)
const refresh = async (refreshToken) => {
  if (!refreshToken) {
    throw ApiError.unauthorized("Not logged in");
  }

  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw ApiError.unauthorized("Session expired, please log in again");
    }
    throw ApiError.unauthorized("Invalid session");
  }

  const user = await User.findById(payload.id);
  if (!user) {
    throw ApiError.unauthorized("This account no longer exists");
  }

  if (user.passwordChangedAt) {
    const changedAtSec = Math.floor(user.passwordChangedAt.getTime() / 1000);
    if (payload.iat < changedAtSec) {
      throw ApiError.unauthorized(
        "Password was changed recently, please log in again",
      );
    }
  }

  return { user: publicUser(user), ...issueTokens(user) };
};

module.exports = {
  register,
  login,
  publicUser,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  refresh,
};
