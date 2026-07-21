const SettingsPolicy = require("../services/settings-policy.service");

const enforcePublicOperation = (operation) => async (req, res, next) => {
  try {
    const settings = await SettingsPolicy.getPolicy();
    req.generalSettings = settings;
    const policyError = SettingsPolicy.publicOperationError(settings, operation);
    if (policyError) {
      return res.status(policyError.statusCode).json({
        status: false,
        code: policyError.code,
        message: policyError.message,
      });
    }
    return next();
  } catch (error) {
    return res.status(503).json({
      status: false,
      code: "PUBLIC_POLICY_UNAVAILABLE",
      message: "The grievance service is temporarily unavailable.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  enforcePublicSubmission: enforcePublicOperation("submission"),
  enforcePublicTracking: enforcePublicOperation("tracking"),
};
