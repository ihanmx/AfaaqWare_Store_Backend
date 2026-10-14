const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const sharp = require("sharp");
const ApiError = require("../utils/ApiError");

const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");

const PRESETS = {
  // Fit INSIDE 1200x1200: keeps the whole photo, never crops.

  product: {
    folder: "products",
    width: 1200,
    height: 1200,
    fit: "inside",
    withoutEnlargement: true,
  },

  // COVER 400x400: always a square, crops the overflow.
  // "attention" crops toward the most interesting region (usually the face).
  avatar: {
    folder: "avatars",
    width: 400,
    height: 400,
    fit: "cover",
    position: sharp.strategy.attention,
  },
};

// Resize + convert one image buffer and write it to disk.
const processAndSave = async (buffer, presetName) => {
  const { folder, width, height, ...resizeOptions } = PRESETS[presetName];

  const filename = `${crypto.randomUUID()}.webp`;
  const dir = path.join(UPLOAD_ROOT, folder);
  await fs.mkdir(dir, { recursive: true });

  try {
    // limitInputPixels guards against "decompression bombs": a tiny file
    // that decodes into a gigantic image and exhausts memory.
    await sharp(buffer, { limitInputPixels: 50_000_000 })
      .rotate() // apply EXIF orientation, so phone photos aren't sideways
      .resize(width, height, resizeOptions)
      .webp({ quality: 80 })
      .toFile(path.join(dir, filename));
  } catch {
    throw ApiError.badRequest("File is not a valid image");
  }

  return `/uploads/${folder}/${filename}`;
};

// Delete one image by its URL path. Missing file is not an error.
const deleteImage = async (url) => {
  if (!url) return;

  const filePath = path.join(UPLOAD_ROOT, url.replace(/^\/uploads\//, ""));

  // Defense in depth: never delete outside the uploads folder, even if a
  // bad value ever got into the database.
  if (!filePath.startsWith(UPLOAD_ROOT + path.sep)) return;

  await fs.unlink(filePath).catch((error) => {
    if (error.code !== "ENOENT") throw error; // already gone is fine
  });
};

const deleteImages = (urls) => Promise.all(urls.map(deleteImage));

// All or nothing: if image 3 of 5 is invalid, remove the 2 already written.
const saveImages = async (files, presetName) => {
  const results = await Promise.allSettled(
    files.map((file) => processAndSave(file.buffer, presetName)),
  );

  const saved = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => r.value);
  const failure = results.find((r) => r.status === "rejected");

  if (failure) {
    await deleteImages(saved);
    throw failure.reason;
  }
  return saved;
};

module.exports = { saveImages, deleteImage, deleteImages };
