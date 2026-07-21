const SettingsModel = require("../models/settings.model");
const SettingsService = require("../services/settings.service");
const SettingsPolicy = require("../services/settings-policy.service");
const {
  removeSettingsFile,
  removeStoredSettingsFile,
} = require("../middlewares/settings-upload.middleware");

const getCapabilities = (user) => ({
  can_update: user.role_slug === "super-admin",
  can_reset: user.role_slug === "super-admin",
  can_upload: user.role_slug === "super-admin",
  can_view_history:
    user.role_slug === "super-admin" ||
    user.permissions?.includes("settings.general.history"),
  read_only: user.role_slug !== "super-admin",
});

const getRuntimeCapabilities = () => {
  const capabilities = SettingsPolicy.getRuntimeCapabilities();
  return {
    captcha: {
      configured: capabilities.captcha.configured,
      provider: capabilities.captcha.provider,
    },
    email: { configured: capabilities.email.configured },
    two_factor: { configured: capabilities.twoFactor.configured },
    pii: { configured: capabilities.pii.configured },
  };
};

const buildResponseMeta = async (user, updateMeta = null, knownVersion = null) => ({
  capabilities: getCapabilities(user),
  runtime_capabilities: getRuntimeCapabilities(),
  last_updated_at: updateMeta?.updated_at || null,
  last_updated_by: updateMeta?.updated_by_name || null,
  version: knownVersion ?? await SettingsService.getGeneralSettingsVersion(),
});

const getGeneralSettings = async (req, res) => {
  try {
    const [settings, updateMeta, version] = await Promise.all([
      SettingsService.getGeneralSettings(),
      SettingsModel.findLastGeneralSettingsUpdate(),
      SettingsService.getGeneralSettingsVersion(),
    ]);
    return res.json({
      status: true,
      success: true,
      message: "General settings fetched successfully",
      data: settings,
      meta: {
        ...(await buildResponseMeta(req.user, updateMeta, version)),
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      success: false,
      message: "Failed to fetch General Settings",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const updateGeneralSettings = async (req, res) => {
  try {
    const result = await SettingsService.updateGeneralSettings({
      settings: req.validatedSettings,
      req,
      reason: req.settingsChangeReason,
    });
    return res.json({
      status: true,
      success: true,
      message: result.changes.length
        ? `${result.changes.length} setting${result.changes.length === 1 ? "" : "s"} updated successfully`
        : "No setting values changed",
      data: result.settings,
      changed_settings: result.changes,
      meta: {
        ...(await buildResponseMeta(req.user, result.meta)),
        last_updated_by: result.meta?.updated_by_name || req.user.name,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      success: false,
      message: "Failed to update General Settings",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const uploadAsset = (assetType) => async (req, res) => {
  const storedPath = `/uploads/settings/${req.file.filename}`;
  try {
    const result = await SettingsService.updateGeneralSettingsAsset({
      assetType,
      filePath: storedPath,
      req,
    });
    await removeStoredSettingsFile(result.previousFilePath);

    return res.json({
      status: true,
      success: true,
      message: `${assetType === "logo" ? "Organization logo" : "Favicon"} updated successfully`,
      data: result.settings,
      file_path: storedPath,
      meta: {
        ...(await buildResponseMeta(req.user, result.meta)),
        last_updated_by: result.meta?.updated_by_name || req.user.name,
      },
    });
  } catch (error) {
    await removeSettingsFile(req.file?.path);
    return res.status(500).json({
      status: false,
      success: false,
      message: `Failed to update the ${assetType}`,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const getGeneralSettingsHistory = async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, Number.parseInt(req.query.limit, 10) || 100));
    const offset = Math.max(0, Number.parseInt(req.query.offset, 10) || 0);
    const history = await SettingsService.getGeneralSettingsHistory({ limit, offset });
    return res.json({
      status: true,
      success: true,
      message: "General Settings history fetched successfully",
      data: history,
      meta: { limit, offset },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      success: false,
      message: "Failed to fetch General Settings history",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const resetGeneralSettings = async (req, res) => {
  try {
    const currentSettings = await SettingsService.getGeneralSettings();
    const result = await SettingsService.resetGeneralSettings({
      req,
      reason: req.settingsChangeReason,
    });
    await Promise.all([
      removeStoredSettingsFile(currentSettings.organization.logo),
      removeStoredSettingsFile(currentSettings.organization.favicon),
    ]);
    return res.json({
      status: true,
      success: true,
      message: "General Settings restored to their default values",
      data: result.settings,
      changed_settings: result.changes,
      meta: {
        ...(await buildResponseMeta(req.user, result.meta)),
        last_updated_by: result.meta?.updated_by_name || req.user.name,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      success: false,
      message: "Failed to restore default General Settings",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  buildResponseMeta,
  getGeneralSettings,
  getGeneralSettingsHistory,
  resetGeneralSettings,
  updateGeneralSettings,
  uploadGeneralFavicon: uploadAsset("favicon"),
  uploadGeneralLogo: uploadAsset("logo"),
};
