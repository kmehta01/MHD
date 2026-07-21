const SettingsService = require("./settings.service");

const cleanEnv = (name) => String(process.env[name] || "").trim();

const isCaptchaConfigured = () =>
  Boolean(cleanEnv("RECAPTCHA_SITE_KEY") && cleanEnv("RECAPTCHA_SECRET_KEY"));

const isEmailConfigured = () =>
  Boolean(cleanEnv("SMTP_HOST") && cleanEnv("SMTP_PORT") && cleanEnv("SMTP_FROM") &&
    (!cleanEnv("SMTP_USER") || cleanEnv("SMTP_PASSWORD")));

const isTwoFactorConfigured = () =>
  Boolean(cleanEnv("TWO_FACTOR_PEPPER") && isEmailConfigured());
const isPiiConfigured = () => cleanEnv("PII_ENCRYPTION_KEY").length >= 32;

const getPolicy = () => SettingsService.getGeneralSettings();

const getPublicPolicy = async () => {
  const [settings, version] = await Promise.all([
    SettingsService.getPublicGeneralSettings(),
    SettingsService.getGeneralSettingsVersion(),
  ]);
  return { settings, version };
};

const getRuntimeCapabilities = () => ({
  captcha: {
    configured: isCaptchaConfigured(),
    provider: "google-recaptcha-v2",
    siteKey: cleanEnv("RECAPTCHA_SITE_KEY"),
  },
  email: { configured: isEmailConfigured() },
  twoFactor: { configured: isTwoFactorConfigured() },
  pii: { configured: isPiiConfigured() },
});

const publicOperationError = (settings, operation) => {
  if (settings.portal.maintenanceMode) {
    return {
      statusCode: 503,
      code: "PORTAL_MAINTENANCE",
      message: settings.portal.maintenanceMessage,
    };
  }
  if (operation === "submission" && !settings.grievanceSubmission.allowPublicSubmission) {
    return {
      statusCode: 403,
      code: "PUBLIC_SUBMISSION_DISABLED",
      message: "Public grievance submission is currently unavailable.",
    };
  }
  if (operation === "tracking" && !settings.ticket.allowPublicTicketTracking) {
    return {
      statusCode: 403,
      code: "PUBLIC_TRACKING_DISABLED",
      message: "Public grievance tracking is currently unavailable.",
    };
  }
  return null;
};

module.exports = {
  getPolicy,
  getPublicPolicy,
  getRuntimeCapabilities,
  isCaptchaConfigured,
  isEmailConfigured,
  isPiiConfigured,
  isTwoFactorConfigured,
  publicOperationError,
};
