const crypto = require("crypto");
const { TWO_FACTOR_LIMITS } = require("../config/two-factor");

const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const getPepper = () => {
  const pepper = process.env.TWO_FACTOR_PEPPER;

  if (!pepper || pepper.length < 32) {
    const error = new Error(
      "TWO_FACTOR_PEPPER must be configured with at least 32 characters",
    );
    error.code = "TWO_FACTOR_CONFIGURATION_ERROR";
    throw error;
  }

  return pepper;
};

const createHash = (context, value) =>
  crypto
    .createHmac("sha256", getPepper())
    .update(`${context}:${value}`)
    .digest("hex");

const createChallengeToken = () => crypto.randomBytes(32).toString("base64url");

const hashChallengeToken = (challengeToken) =>
  createHash("challenge", challengeToken);

const generateOtp = () => {
  const maximum = 10 ** TWO_FACTOR_LIMITS.otpLength;
  return crypto.randomInt(0, maximum).toString().padStart(6, "0");
};

const hashOtp = (challengeToken, otp) =>
  createHash(`otp:${challengeToken}`, String(otp));

const normalizeRecoveryCode = (code) =>
  String(code || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const hashRecoveryCode = (code) =>
  createHash("recovery", normalizeRecoveryCode(code));

const generateRecoveryCode = () => {
  let value = "";

  for (let index = 0; index < 12; index += 1) {
    value += RECOVERY_ALPHABET[
      crypto.randomInt(0, RECOVERY_ALPHABET.length)
    ];
  }

  return `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8)}`;
};

const generateRecoveryCodes = () => {
  const codes = new Set();

  while (codes.size < TWO_FACTOR_LIMITS.recoveryCodeCount) {
    codes.add(generateRecoveryCode());
  }

  return [...codes];
};

const safeHashEquals = (left, right) => {
  if (!left || !right) return false;

  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");

  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
};

const maskEmail = (email) => {
  const [localPart = "", domain = ""] = String(email).split("@");
  const visibleLength = Math.min(2, localPart.length);
  const maskedLocal = `${localPart.slice(0, visibleLength)}${"*".repeat(
    Math.max(2, localPart.length - visibleLength),
  )}`;

  return domain ? `${maskedLocal}@${domain}` : maskedLocal;
};

module.exports = {
  createChallengeToken,
  generateOtp,
  generateRecoveryCodes,
  hashChallengeToken,
  hashOtp,
  hashRecoveryCode,
  maskEmail,
  normalizeRecoveryCode,
  safeHashEquals,
};
