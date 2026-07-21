const SettingsPolicy = require("../services/settings-policy.service");
const packageMetadata = require("../../package.json");
const { publicAttachmentTypes } = require("../config/attachment-types");

const getPublicSettings = async (_req, res) => {
  try {
    const { settings: data, version } = await SettingsPolicy.getPublicPolicy();
    const runtimeCapabilities = SettingsPolicy.getRuntimeCapabilities();
    const captchaEnabled = Boolean(data.grievanceSubmission?.enableCaptcha);
    return res.json({
      status: true,
      success: true,
      data,
      meta: {
        version,
        applicationVersion: packageMetadata.version,
        capabilities: {
          captcha: {
            enabled: captchaEnabled,
            ready: runtimeCapabilities.captcha.configured,
            siteKey: captchaEnabled ? runtimeCapabilities.captcha.siteKey : "",
            provider: runtimeCapabilities.captcha.provider,
          },
          email: runtimeCapabilities.email,
          attachments: { types: publicAttachmentTypes() },
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      success: false,
      message: "Unable to load portal branding",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = { getPublicSettings };
