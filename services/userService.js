const User = require("../models/userModels");
const ApiError = require("../utils/ApiError");
const imageService = require("./imageService");

// Create a new user
const createUser = async (data) => {
  return await User.create(data);
};

// Get all users
const getAllUsers = async () => {
  return await User.find();
};

// Get a single user by ID
const getUserById = async (id) => {
  const user = await User.findById(id);
  if (!user) {
    throw ApiError.notFound("User not found");
  }
  return user;
};

// Update a user by ID
const updateUser = async (id, data) => {
  const user = await User.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!user) {
    throw ApiError.notFound("User not found");
  }
  return user;
};

// Delete a user by ID
const deleteUser = async (id) => {
  const user = await User.findByIdAndDelete(id);
  if (!user) {
    throw ApiError.notFound("User not found");
  }
  return user;
};

const updateAvatar = async (userId, file) => {
  if (!file) throw ApiError.badRequest("Attach an image");

  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound("User not found");

  const [url] = await imageService.saveImages([file], "avatar");
  const oldUrl = user.avatar;

  user.avatar = url;
  try {
    await user.save({ validateBeforeSave: false });
  } catch (error) {
    await imageService.deleteImage(url);
    throw error;
  }

  await imageService.deleteImage(oldUrl); // replace, don't accumulate
  return user;
};

const removeAvatar = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound("User not found");

  const oldUrl = user.avatar;
  user.avatar = null;
  await user.save({ validateBeforeSave: false });

  await imageService.deleteImage(oldUrl);
  return user;
};
module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateAvatar,
  removeAvatar,
};
