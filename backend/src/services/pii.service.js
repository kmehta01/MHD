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

const maskSocialSecurityNumber = (value) => {
  if (!value) return null;
  return `***-**-${String(value).slice(-4)}`;
};

module.exports = {
  encryptText,
  maskSocialSecurityNumber,
};
