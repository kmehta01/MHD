const fs = require("fs");
const path = require("path");
const multer = require("multer");
const SettingsPolicy = require("../services/settings-policy.service");

const uploadRoot = path.resolve(__dirname, "../../uploads/complaints");
fs.mkdirSync(uploadRoot, { recursive: true });

const FILE_TYPE_REGISTRY = Object.freeze({
  PDF: { extensions: [".pdf"], mimeTypes: ["application/pdf"] },
  DOC: { extensions: [".doc"], mimeTypes: ["application/msword"] },
  DOCX: {
    extensions: [".docx"],
    mimeTypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  },
  JPG: { extensions: [".jpg"], mimeTypes: ["image/jpeg"] },
  JPEG: { extensions: [".jpeg"], mimeTypes: ["image/jpeg"] },
  PNG: { extensions: [".png"], mimeTypes: ["image/png"] },
  XLS: { extensions: [".xls"], mimeTypes: ["application/vnd.ms-excel"] },
  XLSX: {
    extensions: [".xlsx"],
    mimeTypes: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  },
});

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadRoot),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  },
});

const getUploadPolicy = (settings) => {
  const source = settings.grievanceSubmission;
  const requestedTypes = source.allowedFileTypes.filter((type) => FILE_TYPE_REGISTRY[type]);
  const maximumFiles = source.allowMultipleAttachments
    ? source.maximumAttachmentCount
    : 1;
  return {
    allowedTypes: requestedTypes,
    maximumFiles,
    maximumSizeBytes: source.maximumAttachmentSizeMb * 1024 * 1024,
  };
};

const acceptsFile = (file, allowedTypes) => {
  const extension = path.extname(file.originalname || "").toLowerCase();
  return allowedTypes.some((type) => {
    const rule = FILE_TYPE_REGISTRY[type];
    return rule.extensions.includes(extension) && rule.mimeTypes.includes(file.mimetype);
  });
};

const removeUploadedFiles = async (files = []) => {
  await Promise.all(files.map((file) => {
    const absolute = path.resolve(file.path || "");
    const relative = path.relative(uploadRoot, absolute);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return Promise.resolve();
    return fs.promises.unlink(absolute).catch(() => {});
  }));
};

const hasValidSignature = async (file) => {
  const handle = await fs.promises.open(file.path, "r");
  try {
    const buffer = Buffer.alloc(16);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const bytes = buffer.subarray(0, bytesRead);
    if (file.mimetype === "application/pdf") return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
    if (file.mimetype === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (file.mimetype === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (["application/msword", "application/vnd.ms-excel"].includes(file.mimetype)) return bytes.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
    if (file.mimetype.includes("openxmlformats-officedocument")) return bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    return false;
  } finally { await handle.close(); }
};

const handleComplaintUpload = async (req, res, next) => {
  try {
    const settings = req.generalSettings || (await SettingsPolicy.getPolicy());
    req.generalSettings = settings;
    const policy = getUploadPolicy(settings);
    const upload = multer({
      storage,
      limits: {
        fileSize: policy.maximumSizeBytes,
        files: policy.maximumFiles,
      },
      fileFilter: (_request, file, callback) => {
        if (acceptsFile(file, policy.allowedTypes)) {
          callback(null, true);
          return;
        }
        callback(new Error(`Only ${policy.allowedTypes.join(", ")} files can be uploaded`));
      },
    });

    upload.array("attachments", policy.maximumFiles)(req, res, async (error) => {
      if (!error) {
        const signatures = await Promise.all((req.files || []).map(hasValidSignature)).catch(() => []);
        if (signatures.length === (req.files || []).length && signatures.every(Boolean)) {
          next();
          return;
        }
        await removeUploadedFiles(req.files || []);
        res.status(400).json({ status: false, message: "One or more supporting documents have invalid file contents" });
        return;
      }
      await removeUploadedFiles(req.files || []);
      const message = error.code === "LIMIT_FILE_SIZE"
        ? `Each supporting document must be ${settings.grievanceSubmission.maximumAttachmentSizeMb} MB or smaller`
        : error.code === "LIMIT_FILE_COUNT"
          ? `A maximum of ${policy.maximumFiles} supporting document${policy.maximumFiles === 1 ? "" : "s"} can be uploaded`
          : error.message || "Supporting document upload failed";
      res.status(400).json({ status: false, message });
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  FILE_TYPE_REGISTRY,
  getUploadPolicy,
  handleComplaintUpload,
  hasValidSignature,
  removeUploadedFiles,
  uploadRoot,
};
