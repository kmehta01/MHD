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
const ticketController = require("../controllers/ticket-settings.controller");
const {
  requireTicketSettingsPermission,
  requireTicketSettingsSuperAdmin,
} = require("../middlewares/ticket-settings-access.middleware");
const {
  validateSequenceReset,
  validateTicketHistoryQuery,
  validateTicketPreview,
  validateTicketSettingsPayload,
} = require("../validators/ticket-settings.validator");

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

router.get(
  "/ticket-number",
  requireTicketSettingsPermission("settings.ticket_number.view"),
  ticketController.getTicketSettings,
);
router.put(
  "/ticket-number",
  settingsMutationLimiter,
  requireTicketSettingsSuperAdmin,
  validateTicketSettingsPayload,
  ticketController.updateTicketSettings,
);
router.post(
  "/ticket-number/preview",
  settingsMutationLimiter,
  requireTicketSettingsPermission("settings.ticket_number.view"),
  validateTicketPreview,
  ticketController.previewTicketSettings,
);
router.post(
  "/ticket-number/reset-sequence",
  settingsMutationLimiter,
  requireTicketSettingsSuperAdmin,
  validateSequenceReset,
  ticketController.resetTicketSequence,
);
router.get(
  "/ticket-number/history",
  requireTicketSettingsPermission("settings.ticket_number.history"),
  validateTicketHistoryQuery,
  ticketController.getTicketSettingsHistory,
);

module.exports = router;
