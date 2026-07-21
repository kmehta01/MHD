const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const {
  readGeneratedUpload,
  unlinkGeneratedUpload,
} = require("../utils/safe-upload-file");

const MAX_PROFILE_PHOTO_BYTES = 500 * 1024;
const uploadRoot = path.resolve(__dirname, "../../uploads/profile-photos");
fs.mkdirSync(uploadRoot, { recursive: true });
const PROFILE_PHOTO_FILENAME_PATTERN = /^profile-\d+-[a-f0-9]{32}\.(?:jpg|jpeg|png|webp)$/;

const allowedFiles = new Map([
  ["image/jpeg", new Set([".jpg", ".jpeg"])],
  ["image/png", new Set([".png"])],
  ["image/webp", new Set([".webp"])],
]);

const storage = multer.diskStorage({
  destination: (req, file, callback) => callback(null, uploadRoot),
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const randomName = crypto.randomBytes(16).toString("hex");
    callback(null, `profile-${Date.now()}-${randomName}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_PROFILE_PHOTO_BYTES, files: 1 },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const allowedExtensions = allowedFiles.get(file.mimetype);

    if (allowedExtensions?.has(extension)) {
      callback(null, true);
      return;
    }

    callback(new Error("Choose a JPG, PNG, or WebP image"));
  },
});

const hasValidImageSignature = async (file) => {
  const signature = await readGeneratedUpload({
    uploadRoot,
    fileOrFilename: file,
    filenamePattern: PROFILE_PHOTO_FILENAME_PATTERN,
    maximumBytes: MAX_PROFILE_PHOTO_BYTES,
    bytesToRead: 12,
  });
  if (signature.length < 3) return false;

  if (file.mimetype === "image/jpeg") {
    return signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;
  }
  if (file.mimetype === "image/png") {
    return signature.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  }
  if (file.mimetype === "image/webp") {
    return signature.subarray(0, 4).toString("ascii") === "RIFF" &&
      signature.subarray(8, 12).toString("ascii") === "WEBP";
  }

  return false;
};

const removeUploadedFile = async (fileOrFilename) =>
  unlinkGeneratedUpload(uploadRoot, fileOrFilename, PROFILE_PHOTO_FILENAME_PATTERN)
    .catch(() => false);

const handleProfilePhotoUpload = (req, res, next) => {
  upload.single("profile_photo")(req, res, async (error) => {
    if (error) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "The profile picture must be 500 KB or smaller"
          : error.code === "LIMIT_UNEXPECTED_FILE"
            ? "Upload one profile picture using the profile_photo field"
            : error.message || "Profile picture upload failed";

      return res.status(400).json({ status: false, message });
    }

    if (!req.file) {
      return res.status(400).json({
        status: false,
        message: "Choose a profile picture to upload",
      });
    }

    try {
      if (!(await hasValidImageSignature(req.file))) {
        await removeUploadedFile(req.file);
        return res.status(400).json({
          status: false,
          message: "The selected file is not a valid JPG, PNG, or WebP image",
        });
      }

      return next();
    } catch {
      await removeUploadedFile(req.file);
      return res.status(400).json({
        status: false,
        message: "The selected image could not be read",
      });
    }
  });
};

module.exports = {
  handleProfilePhotoUpload,
  PROFILE_PHOTO_FILENAME_PATTERN,
  removeUploadedFile,
  uploadRoot,
};
