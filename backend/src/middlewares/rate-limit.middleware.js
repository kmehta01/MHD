const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

const createLimiter = ({ windowMs, limit, message, keyGenerator }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    ...(keyGenerator ? { keyGenerator } : {}),
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

const complaintAttachmentDownloadLimiter = createLimiter({
  windowMs: 5 * 60 * 1000,
  limit: 30,
  keyGenerator: (req) =>
    req.user?.id
      ? `user:${req.user.id}`
      : `ip:${ipKeyGenerator(req.ip)}`,
  message: "Too many attachment downloads. Please try again later.",
});

const adminComplaintSubmissionLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  keyGenerator: (req) =>
    req.user?.id
      ? `user:${req.user.id}`
      : `ip:${ipKeyGenerator(req.ip)}`,
  message: "Too many grievance submissions. Please try again later.",
});

const publicComplaintSubmissionLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: "Too many grievance submissions. Please try again later.",
});

const complaintStatusLookupLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: "Too many grievance status checks. Please try again later.",
});

const installerStatusLimiter = createLimiter({
  windowMs: 5 * 60 * 1000,
  limit: 30,
  message: "Too many installer status checks. Please try again later.",
});

const installerSetupLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  message: "Too many installation attempts. Please try again later.",
});

const auditExportLimiter = createLimiter({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) =>
    req.user?.id
      ? `user:${req.user.id}`
      : `ip:${ipKeyGenerator(req.ip)}`,
  message: "Too many audit export requests. Please try again later.",
});

module.exports = {
  adminComplaintSubmissionLimiter,
  auditExportLimiter,
  complaintAttachmentDownloadLimiter,
  complaintStatusLookupLimiter,
  installerSetupLimiter,
  installerStatusLimiter,
  loginLimiter,
  publicComplaintSubmissionLimiter,
  twoFactorResendLimiter,
  twoFactorVerifyLimiter,
};
