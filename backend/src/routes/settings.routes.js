const express = require("express");
const {
  getGeneralSettings,
  getGeneralSettingsHistory,
  resetGeneralSettings,
  updateGeneralSettings,
  uploadGeneralFavicon,
  uploadGeneralLogo,
} = require("../controllers/settings.controller");
const { verifyToken } = require("../middlewares/auth.middleware");
const {
  requireGeneralSettingsPermission,
  requireGeneralSettingsSuperAdmin,
} = require("../middlewares/settings-access.middleware");
const { uploadSettingsAsset } = require("../middlewares/settings-upload.middleware");
const {
  settingsMutationLimiter,
  settingsUploadLimiter,
} = require("../middlewares/rate-limit.middleware");
const {
  validateGeneralSettingsPayload,
  validateSettingsReset,
} = require("../validators/settings.validator");

const router = express.Router();

router.use(verifyToken);

router.get(
  "/general",
  requireGeneralSettingsPermission("settings.general.view"),
  getGeneralSettings,
);
router.put(
  "/general",
  settingsMutationLimiter,
  requireGeneralSettingsSuperAdmin,
  validateGeneralSettingsPayload,
  updateGeneralSettings,
);
router.post(
  "/general/logo",
  settingsUploadLimiter,
  requireGeneralSettingsSuperAdmin,
  uploadSettingsAsset("logo"),
  uploadGeneralLogo,
);
router.post(
  "/general/favicon",
  settingsUploadLimiter,
  requireGeneralSettingsSuperAdmin,
  uploadSettingsAsset("favicon"),
  uploadGeneralFavicon,
);
router.get(
  "/general/history",
  requireGeneralSettingsPermission("settings.general.history"),
  getGeneralSettingsHistory,
);
router.post(
  "/general/reset",
  settingsMutationLimiter,
  requireGeneralSettingsSuperAdmin,
  validateSettingsReset,
  resetGeneralSettings,
);

module.exports = router;
