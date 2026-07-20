const express = require("express");
const router = express.Router();

const {
  adminLogin,
  getCurrentSession,
  resendTwoFactorCode,
  updateCurrentPassword,
  updateCurrentProfile,
  verifyTwoFactor,
} = require("../controllers/auth.controller");
const { verifyToken } = require("../middlewares/auth.middleware");
const {
  loginLimiter,
  twoFactorResendLimiter,
  twoFactorVerifyLimiter,
} = require("../middlewares/rate-limit.middleware");

router.get("/test", (req, res) => {
  res.json({
    status: true,
    message: "Auth route working",
  });
});

router.post("/login", loginLimiter, adminLogin);
router.get("/me", verifyToken, getCurrentSession);
router.patch("/profile", verifyToken, updateCurrentProfile);
router.put("/password", verifyToken, updateCurrentPassword);
router.post("/2fa/verify", twoFactorVerifyLimiter, verifyTwoFactor);
router.post("/2fa/resend", twoFactorResendLimiter, resendTwoFactorCode);

module.exports = router;
