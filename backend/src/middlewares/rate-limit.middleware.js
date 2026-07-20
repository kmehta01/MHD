const rateLimit = require("express-rate-limit");

const createLimiter = ({ windowMs, limit, message }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      status: false,
      message,
    },
  });

const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: "Too many sign-in attempts. Please try again later.",
});

const twoFactorVerifyLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  message: "Too many verification attempts. Please try again later.",
});

const twoFactorResendLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: "Too many code requests. Please try again later.",
});

module.exports = {
  loginLimiter,
  twoFactorResendLimiter,
  twoFactorVerifyLimiter,
};
