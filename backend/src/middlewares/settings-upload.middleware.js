const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const SettingsService = require("../services/settings.service");

const ABSOLUTE_MAX_BYTES = 5 * 1024 * 1024;
const uploadRoot = path.resolve(__dirname, "../../uploads/settings");
fs.mkdirSync(uploadRoot, { recursive: true });

const assetRules = {
  logo: {
    mimes: new Map([
      ["image/jpeg", new Set([".jpg", ".jpeg"])],
      ["image/png", new Set([".png"])],
      ["image/svg+xml", new Set([".svg"])],
      ["image/webp", new Set([".webp"])],
    ]),
  },
  favicon: {
    mimes: new Map([
      ["image/x-icon", new Set([".ico"])],
      ["image/vnd.microsoft.icon", new Set([".ico"])],
      ["image/png", new Set([".png"])],
      ["image/svg+xml", new Set([".svg"])],
    ]),
  },
};

const removeSettingsFile = async (filePath) => {
  if (!filePath) return;
  await fs.promises.unlink(filePath).catch(() => {});
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => callback(null, uploadRoot),
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    callback(null, `${req.settingsAssetType}-${Date.now()}-${crypto.randomBytes(16).toString("hex")}${extension}`);
  },
});

const createUpload = (assetType) =>
  multer({
    storage,
    limits: { fileSize: ABSOLUTE_MAX_BYTES, files: 1 },
    fileFilter: (req, file, callback) => {
      req.settingsAssetType = assetType;
      const extension = path.extname(file.originalname || "").toLowerCase();
      const extensions = assetRules[assetType].mimes.get(file.mimetype);
      if (extensions?.has(extension)) return callback(null, true);
      return callback(new Error(`Choose a valid ${assetType} file`));
    },
  });

const verifySignature = async (file) => {
  const buffer = await fs.promises.readFile(file.path);
  if (file.mimetype === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (file.mimetype === "image/png") {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (file.mimetype === "image/webp") {
    return buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  }
  if (["image/x-icon", "image/vnd.microsoft.icon"].includes(file.mimetype)) {
    return buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0, 0, 1, 0]));
  }
  if (file.mimetype === "image/svg+xml") {
    const svg = buffer.toString("utf8").trim();
    return svg.length <= ABSOLUTE_MAX_BYTES &&
      /^(?:<\?xml[^>]*>\s*)?(?:<!--[^]*?-->\s*)*<svg\b/i.test(svg) &&
      !/<\s*script\b|\bon\w+\s*=|javascript\s*:|<\s*(?:iframe|object|embed)\b/i.test(svg);
  }
  return false;
};

const uploadSettingsAsset = (assetType) => {
  const upload = createUpload(assetType);
  return (req, res, next) => {
    req.settingsAssetType = assetType;
    upload.single(assetType)(req, res, async (error) => {
      if (error) {
        const message = error.code === "LIMIT_FILE_SIZE"
          ? "The file must be 5 MB or smaller"
          : error.message || `${assetType} upload failed`;
        return res.status(400).json({ status: false, message });
      }
      if (!req.file) {
        return res.status(400).json({ status: false, message: `Choose a ${assetType} file to upload` });
      }

      try {
        const settings = await SettingsService.getGeneralSettings();
        const configuredMaxBytes = settings.organization.settingsUploadMaxKb * 1024;
        if (req.file.size > configuredMaxBytes) {
          await removeSettingsFile(req.file.path);
          return res.status(400).json({
            status: false,
            message: `The file must be ${settings.organization.settingsUploadMaxKb} KB or smaller`,
          });
        }
        if (!(await verifySignature(req.file))) {
          await removeSettingsFile(req.file.path);
          return res.status(400).json({ status: false, message: `The selected ${assetType} file is not valid or contains unsafe content` });
        }
        return next();
      } catch {
        await removeSettingsFile(req.file.path);
        return res.status(500).json({ status: false, message: `Unable to validate the ${assetType} upload` });
      }
    });
  };
};

const removeStoredSettingsFile = async (storedPath) => {
  if (!storedPath?.startsWith("/uploads/settings/")) return;
  const filename = path.basename(storedPath);
  await removeSettingsFile(path.join(uploadRoot, filename));
};

module.exports = {
  removeSettingsFile,
  removeStoredSettingsFile,
  uploadRoot,
  uploadSettingsAsset,
};
