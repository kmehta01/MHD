const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadRoot = path.resolve(__dirname, "../../uploads/complaints");
fs.mkdirSync(uploadRoot, { recursive: true });

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]);
const allowedExtensions = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".jpg",
  ".jpeg",
  ".png",
]);

const storage = multer.diskStorage({
  destination: (req, file, callback) => callback(null, uploadRoot),
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    callback(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    if (allowedMimeTypes.has(file.mimetype) && allowedExtensions.has(extension)) {
      callback(null, true);
      return;
    }
    callback(new Error("Only PDF, DOC, DOCX, JPG, and PNG files can be uploaded"));
  },
});

const handleComplaintUpload = (req, res, next) => {
  upload.array("attachments", 3)(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Each supporting document must be 5 MB or smaller"
        : error.code === "LIMIT_FILE_COUNT"
          ? "A maximum of 3 supporting documents can be uploaded"
          : error.message || "Supporting document upload failed";

    res.status(400).json({ status: false, message });
  });
};

module.exports = { handleComplaintUpload };
