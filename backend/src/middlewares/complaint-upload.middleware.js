const fs = require("fs");
const path = require("path");
const multer = require("multer");
const SettingsPolicy = require("../services/settings-policy.service");
const {
  ATTACHMENT_TYPES,
  COMPLAINT_FILENAME_PATTERN,
  hasMatchingSignature,
  resolveAttachmentType,
} = require("../config/attachment-types");
const {
  readGeneratedUpload,
  unlinkGeneratedUpload,
} = require("../utils/safe-upload-file");

const uploadRoot = path.resolve(__dirname, "../../uploads/complaints");
fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadRoot),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  },
});

const normalizeAllowedTypes = (types) => Array.isArray(types)
  ? [...new Set(types.filter((type) => typeof type === "string" && ATTACHMENT_TYPES[type]))]
  : [];

const getComplaintUploadPolicy = (settings) => {
  const source = settings.grievanceSubmission;
  return {
    allowedTypes: normalizeAllowedTypes(source.allowedFileTypes),
    maximumFiles: source.allowMultipleAttachments ? source.maximumAttachmentCount : 1,
    maximumSizeBytes: source.maximumAttachmentSizeMb * 1024 * 1024,
    maximumSizeMb: source.maximumAttachmentSizeMb,
    documentLabel: "supporting document",
  };
};

const getResolutionUploadPolicy = (settings) => ({
  allowedTypes: normalizeAllowedTypes(settings.workflow.resolutionDocumentAllowedFileTypes),
  maximumFiles: 1,
  maximumSizeBytes: settings.workflow.resolutionDocumentMaximumSizeMb * 1024 * 1024,
  maximumSizeMb: settings.workflow.resolutionDocumentMaximumSizeMb,
  documentLabel: "resolution document",
});

const acceptsFile = (file, allowedTypes) => Boolean(resolveAttachmentType(file, allowedTypes));

const removeUploadedFiles = async (files = []) => {
  await Promise.all(files.map((file) =>
    unlinkGeneratedUpload(uploadRoot, file, COMPLAINT_FILENAME_PATTERN).catch(() => false)));
};

const hasValidSignature = async (file, policy) => {
  const typeKey = resolveAttachmentType(file, policy.allowedTypes);
  if (!typeKey) return false;
  const bytes = await readGeneratedUpload({
    uploadRoot,
    fileOrFilename: file,
    filenamePattern: COMPLAINT_FILENAME_PATTERN,
    maximumBytes: policy.maximumSizeBytes,
    bytesToRead: 16,
  });
  return hasMatchingSignature(typeKey, bytes);
};

const createAttachmentUploadHandler = (getPolicy) => async (req, res, next) => {
  try {
    const settings = req.generalSettings || (await SettingsPolicy.getPolicy());
    req.generalSettings = settings;
    const policy = getPolicy(settings);
    const upload = multer({
      storage,
      limits: { fileSize: policy.maximumSizeBytes, files: policy.maximumFiles },
      fileFilter: (_request, file, callback) => {
        if (acceptsFile(file, policy.allowedTypes)) return callback(null, true);
        const allowed = policy.allowedTypes.length ? policy.allowedTypes.join(", ") : "no configured";
        return callback(new Error(`Only ${allowed} files can be uploaded`));
      },
    });

    upload.array("attachments", policy.maximumFiles)(req, res, async (uploadError) => {
      if (!uploadError) {
        const signatures = await Promise.all(
          (req.files || []).map((file) => hasValidSignature(file, policy)),
        ).catch(() => []);
        if (signatures.length === (req.files || []).length && signatures.every(Boolean)) {
          next();
          return;
        }
        await removeUploadedFiles(req.files || []);
        res.status(400).json({ status: false, message: `One or more ${policy.documentLabel}s have invalid file contents` });
        return;
      }

      await removeUploadedFiles(req.files || []);
      const message = uploadError.code === "LIMIT_FILE_SIZE"
        ? `Each ${policy.documentLabel} must be ${policy.maximumSizeMb} MB or smaller`
        : uploadError.code === "LIMIT_FILE_COUNT"
          ? `A maximum of ${policy.maximumFiles} ${policy.documentLabel}${policy.maximumFiles === 1 ? "" : "s"} can be uploaded`
          : uploadError.message || `${policy.documentLabel} upload failed`;
      res.status(400).json({ status: false, message });
    });
  } catch (error) {
    next(error);
  }
};

const handleComplaintUpload = createAttachmentUploadHandler(getComplaintUploadPolicy);
const handleResolutionDocumentUpload = createAttachmentUploadHandler(getResolutionUploadPolicy);

module.exports = {
  COMPLAINT_FILENAME_PATTERN,
  acceptsFile,
  createAttachmentUploadHandler,
  getComplaintUploadPolicy,
  getResolutionUploadPolicy,
  handleComplaintUpload,
  handleResolutionDocumentUpload,
  hasValidSignature,
  removeUploadedFiles,
  uploadRoot,
};
