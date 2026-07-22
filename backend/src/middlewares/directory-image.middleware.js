const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const SettingsService = require("../services/settings.service");
const { readGeneratedUpload, unlinkGeneratedUpload } = require("../utils/safe-upload-file");

const ABSOLUTE_MAX_BYTES = 5 * 1024 * 1024;
const uploadRoot = path.resolve(__dirname, "../../uploads/directory");
const DIRECTORY_IMAGE_PATTERN = /^facility-\d+-[a-f0-9]{32}\.(?:jpg|jpeg|png|webp)$/;
fs.mkdirSync(uploadRoot, { recursive: true });

const allowed = new Map([
  ["image/jpeg", new Set([".jpg", ".jpeg"])],
  ["image/png", new Set([".png"])],
  ["image/webp", new Set([".webp"])],
]);

const removeDirectoryImage = (fileOrFilename) =>
  unlinkGeneratedUpload(uploadRoot, fileOrFilename, DIRECTORY_IMAGE_PATTERN).catch(() => false);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadRoot),
  filename: (_req, file, callback) => callback(
    null,
    `facility-${Date.now()}-${crypto.randomBytes(16).toString("hex")}${path.extname(file.originalname || "").toLowerCase()}`,
  ),
});

const upload = multer({
  storage,
  limits: { fileSize: ABSOLUTE_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    const extensions = allowed.get(file.mimetype);
    return extensions?.has(path.extname(file.originalname || "").toLowerCase())
      ? callback(null, true) : callback(new Error("Choose a JPG, PNG, or WebP facility image"));
  },
});

const validSignature = async (file) => {
  const buffer = await readGeneratedUpload({
    uploadRoot, fileOrFilename: file, filenamePattern: DIRECTORY_IMAGE_PATTERN,
    maximumBytes: ABSOLUTE_MAX_BYTES, bytesToRead: 16,
  });
  if (file.mimetype === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (file.mimetype === "image/png") return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
};

const handleDirectoryImageUpload = (req, res, next) => upload.single("image")(req, res, async (error) => {
  if (error) return res.status(400).json({ status: false, message: error.code === "LIMIT_FILE_SIZE" ? "The image must be 5 MB or smaller" : error.message });
  if (!req.file) return res.status(400).json({ status: false, message: "Choose a facility image" });
  try {
    const settings = await SettingsService.getGeneralSettings();
    if (req.file.size > settings.organization.settingsUploadMaxKb * 1024) {
      await removeDirectoryImage(req.file);
      return res.status(400).json({ status: false, message: `The image must be ${settings.organization.settingsUploadMaxKb} KB or smaller` });
    }
    if (!await validSignature(req.file)) {
      await removeDirectoryImage(req.file);
      return res.status(400).json({ status: false, message: "The facility image is invalid or its content does not match its type" });
    }
    return next();
  } catch {
    await removeDirectoryImage(req.file);
    return res.status(500).json({ status: false, message: "Unable to validate the facility image" });
  }
});

const removeStoredDirectoryImage = async (storedPath) => {
  if (typeof storedPath !== "string" || !storedPath.startsWith("/uploads/directory/")) return false;
  const filename = path.basename(storedPath);
  if (storedPath !== `/uploads/directory/${filename}`) return false;
  return removeDirectoryImage(filename);
};

module.exports = {
  DIRECTORY_IMAGE_PATTERN, handleDirectoryImageUpload, removeDirectoryImage,
  removeStoredDirectoryImage, uploadRoot, validSignature,
};
