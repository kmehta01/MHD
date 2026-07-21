const ATTACHMENT_TYPES = Object.freeze({
  PDF: Object.freeze({ key: "PDF", label: "PDF", extensions: [".pdf"], mimeTypes: ["application/pdf"], signature: "pdf" }),
  DOC: Object.freeze({ key: "DOC", label: "Word document (DOC)", extensions: [".doc"], mimeTypes: ["application/msword"], signature: "ole" }),
  DOCX: Object.freeze({ key: "DOCX", label: "Word document (DOCX)", extensions: [".docx"], mimeTypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"], signature: "zip" }),
  JPG: Object.freeze({ key: "JPG", label: "JPEG image (.jpg)", extensions: [".jpg"], mimeTypes: ["image/jpeg"], signature: "jpeg" }),
  JPEG: Object.freeze({ key: "JPEG", label: "JPEG image (.jpeg)", extensions: [".jpeg"], mimeTypes: ["image/jpeg"], signature: "jpeg" }),
  PNG: Object.freeze({ key: "PNG", label: "PNG image", extensions: [".png"], mimeTypes: ["image/png"], signature: "png" }),
  XLS: Object.freeze({ key: "XLS", label: "Excel spreadsheet (XLS)", extensions: [".xls"], mimeTypes: ["application/vnd.ms-excel"], signature: "ole" }),
  XLSX: Object.freeze({ key: "XLSX", label: "Excel spreadsheet (XLSX)", extensions: [".xlsx"], mimeTypes: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"], signature: "zip" }),
});

const SUPPORTED_ATTACHMENT_TYPE_KEYS = Object.freeze(Object.keys(ATTACHMENT_TYPES));
const DEFAULT_COMPLAINT_ATTACHMENT_TYPES = Object.freeze(["PDF", "JPG", "JPEG", "PNG", "DOC", "DOCX"]);
const DEFAULT_RESOLUTION_ATTACHMENT_TYPES = SUPPORTED_ATTACHMENT_TYPE_KEYS;

const extensionPattern = SUPPORTED_ATTACHMENT_TYPE_KEYS
  .flatMap((key) => ATTACHMENT_TYPES[key].extensions)
  .map((extension) => extension.slice(1).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");
const COMPLAINT_FILENAME_PATTERN = new RegExp(`^\\d+-\\d+\\.(?:${extensionPattern})$`, "i");

const publicAttachmentTypes = () => SUPPORTED_ATTACHMENT_TYPE_KEYS.map((key) => {
  const type = ATTACHMENT_TYPES[key];
  return { key: type.key, label: type.label, extensions: [...type.extensions], mimeTypes: [...type.mimeTypes] };
});

const resolveAttachmentType = (file, allowedTypes) => {
  const extension = require("node:path").extname(file?.originalname || "").toLowerCase();
  return allowedTypes.find((key) => {
    const type = ATTACHMENT_TYPES[key];
    return type?.extensions.includes(extension) && type.mimeTypes.includes(file?.mimetype);
  }) || null;
};

const hasMatchingSignature = (typeKey, bytes) => {
  const signature = ATTACHMENT_TYPES[typeKey]?.signature;
  if (signature === "pdf") return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  if (signature === "jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (signature === "png") return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (signature === "ole") return bytes.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  if (signature === "zip") return bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  return false;
};

module.exports = {
  ATTACHMENT_TYPES,
  COMPLAINT_FILENAME_PATTERN,
  DEFAULT_COMPLAINT_ATTACHMENT_TYPES,
  DEFAULT_RESOLUTION_ATTACHMENT_TYPES,
  SUPPORTED_ATTACHMENT_TYPE_KEYS,
  hasMatchingSignature,
  publicAttachmentTypes,
  resolveAttachmentType,
};
