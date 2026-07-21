const express = require("express");
const router = express.Router();

const {
  adminLogin,
  getCurrentSession,
  logout,
  resendTwoFactorCode,
  updateCurrentPassword,
  updateCurrentProfilePhoto,
  updateCurrentProfile,
  verifyTwoFactor,
} = require("../controllers/auth.controller");
const { verifyToken } = require("../middlewares/auth.middleware");
const {
  handleProfilePhotoUpload,
} = require("../middlewares/profile-photo-upload.middleware");
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
router.post("/logout", verifyToken, logout);
router.patch("/profile", verifyToken, updateCurrentProfile);
router.post(
  "/profile/photo",
  verifyToken,
  handleProfilePhotoUpload,
  updateCurrentProfilePhoto,
);
router.put("/password", verifyToken, updateCurrentPassword);
router.post("/2fa/verify", twoFactorVerifyLimiter, verifyTwoFactor);
router.post("/2fa/resend", twoFactorResendLimiter, resendTwoFactorCode);

module.exports = router;
