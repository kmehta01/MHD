const crypto = require("crypto");

const getKey = () => {
  const secret = process.env.PII_ENCRYPTION_KEY;

  if (!secret) {
    const error = new Error("PII encryption is not configured");
    error.code = "PII_CONFIGURATION_ERROR";
    throw error;
  }

  return crypto.createHash("sha256").update(String(secret)).digest();
};

const encryptText = (value) => {
  if (!value) return null;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(String(value), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
};

const decryptText = (value) => {
  if (!value) return null;
  const [version, ivValue, tagValue, encryptedValue] = String(value).split(":");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) throw new Error("Unsupported encrypted PII value");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivValue, "base64"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64")), decipher.final()]).toString("utf8");
};

const normalizeIdentificationNumber = (value) =>
  String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

const hashIdentificationNumber = (value) => {
  const normalized = normalizeIdentificationNumber(value);
  if (!normalized) return null;
  return crypto.createHmac("sha256", getKey()).update(normalized).digest("hex");
};

const maskSocialSecurityNumber = (value) => {
  if (!value) return null;
  return `***-**-${String(value).slice(-4)}`;
};

const maskPhoneNumber = (value) => {
  const source = String(value || "");
  const digits = source.replace(/\D/g, "");
  if (!digits) return null;
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
};

module.exports = {
  decryptText,
  encryptText,
  hashIdentificationNumber,
  maskPhoneNumber,
  maskSocialSecurityNumber,
  normalizeIdentificationNumber,
};
