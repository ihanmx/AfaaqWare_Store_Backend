const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const sharp = require("sharp");
const ApiError = require("../utils/ApiError");
const { buffer } = require("stream/consumers");

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
