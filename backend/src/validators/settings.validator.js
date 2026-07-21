const {
  generalSettingsDefinitionMap,
  generalSettingsDefaults,
} = require("../utils/default-general-settings");
const SettingsService = require("../services/settings.service");
const ConfigurationModel = require("../models/configuration.model");
const SettingsPolicy = require("../services/settings-policy.service");

const hasUnsafeMarkup = (value) =>
  /<\s*script\b|\bon\w+\s*=|javascript\s*:/i.test(value);

const normalizeString = (value) =>
  String(value).replace(/\0/g, "").replace(/\r\n/g, "\n").trim();

const validateValue = (definition, rawValue) => {
  const label = definition.settingKey;

  if (definition.valueType === "boolean") {
    return typeof rawValue === "boolean"
      ? { value: rawValue }
      : { error: `${label} must be true or false` };
  }

  if (definition.valueType === "number") {
    if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) {
      return { error: `${label} must be a valid number` };
    }
    if (definition.integer && !Number.isInteger(rawValue)) {
      return { error: `${label} must be a whole number` };
    }
    if (definition.min !== undefined && rawValue < definition.min) {
      return { error: `${label} must be at least ${definition.min}` };
    }
    if (definition.max !== undefined && rawValue > definition.max) {
      return { error: `${label} must not exceed ${definition.max}` };
    }
    return { value: rawValue };
  }

  if (definition.valueType === "json") {
    if (!Array.isArray(rawValue)) {
      return { error: `${label} must be an array` };
    }
    const uniqueValues = [...new Set(rawValue)];
    if (
      !uniqueValues.every(
        (value) =>
          typeof value === "string" && definition.arrayOptions?.includes(value),
      )
    ) {
      return { error: `${label} contains an unsupported option` };
    }
    return { value: uniqueValues };
  }

  if (typeof rawValue !== "string") {
    return { error: `${label} must be text` };
  }

  const value = normalizeString(rawValue);
  if (definition.required && !value) {
    return { error: `${label} is required` };
  }
  if (definition.maxLength && value.length > definition.maxLength) {
    return { error: `${label} must be ${definition.maxLength} characters or fewer` };
  }
  if (hasUnsafeMarkup(value)) {
    return { error: `${label} contains unsafe markup` };
  }
  if (definition.options && !definition.options.includes(value)) {
    return { error: `${label} has an unsupported value` };
  }
  if (definition.pattern && value && !definition.pattern.test(value)) {
    return { error: `${label} may contain only letters, numbers, and hyphens` };
  }
  if (definition.valueType === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { error: `${label} must be a valid email address` };
  }
  if (definition.valueType === "url" && value) {
    try {
      const url = new URL(value);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    } catch {
      return { error: `${label} must be a valid HTTP or HTTPS URL` };
    }
  }
  if (definition.phone && value && (value.length < 7 || !/^[+\d()\s.-]+$/.test(value))) {
    return { error: `${label} must be a valid phone number` };
  }
  if (definition.valueType === "file" && value && !value.startsWith("/uploads/settings/")) {
    return { error: `${label} must reference an uploaded settings file` };
  }

  return { value };
};

const validateConditionalRules = (settings, errors) => {
  if (settings.portal?.maintenanceMode && !settings.portal?.maintenanceMessage) {
    errors["portal.maintenanceMessage"] = "A maintenance message is required when maintenance mode is enabled";
  }
  if (settings.ticket?.sendSubmissionAcknowledgement && !settings.ticket?.acknowledgementMessage) {
    errors["ticket.acknowledgementMessage"] = "An acknowledgement message is required";
  }
  if (settings.grievanceSubmission?.displayDeclarationCheckbox && !settings.grievanceSubmission?.declarationText) {
    errors["grievanceSubmission.declarationText"] = "Declaration text is required when the checkbox is displayed";
  }
  if (settings.grievanceSubmission?.enableCaptcha &&
      (!String(process.env.RECAPTCHA_SITE_KEY || "").trim() || !String(process.env.RECAPTCHA_SECRET_KEY || "").trim())) {
    errors["grievanceSubmission.enableCaptcha"] = "Configure the reCAPTCHA site key and secret before enabling CAPTCHA";
  }
  if (!settings.grievanceSubmission?.allowedFileTypes?.length) {
    errors["grievanceSubmission.allowedFileTypes"] = "Select at least one allowed attachment type";
  }
  const trackingMethod = settings.ticket?.trackingVerificationMethod;
  if (trackingMethod === "Ticket Number and Phone Number" && !settings.grievanceSubmission?.mobileNumberRequired) {
    errors["ticket.trackingVerificationMethod"] = "Phone verification requires mobile numbers on named submissions";
  }
  if (trackingMethod === "Ticket Number and Email Address" && !settings.grievanceSubmission?.emailAddressRequired) {
    errors["ticket.trackingVerificationMethod"] = "Email verification requires email addresses on named submissions";
  }
  if (trackingMethod === "Ticket Number and Identification Number" && !settings.grievanceSubmission?.identificationNumberRequired) {
    errors["ticket.trackingVerificationMethod"] = "Identification verification requires identification numbers on named submissions";
  }
  if (!settings.ticket?.displayTicketOnConfirmation &&
      (!settings.ticket?.sendSubmissionAcknowledgement ||
       !settings.notifications?.enableEmailNotifications ||
       !settings.grievanceSubmission?.emailAddressRequired)) {
    errors["ticket.displayTicketOnConfirmation"] = "A hidden ticket requires email acknowledgement and required email collection";
  }
  if (!settings.dueDate?.dueDateRequired &&
      (settings.dueDate?.enableEscalation || settings.notifications?.notifyDueDateReminder || settings.notifications?.notifyOverdueGrievance)) {
    errors["dueDate.dueDateRequired"] = "Due dates must be enabled for reminders, overdue notifications, or escalation";
  }
};

const validateGeneralSettingsPayload = async (req, res, next) => {
  const input = req.body?.settings || req.body;
  const reason = normalizeString(req.body?.reason || "");
  const errors = {};
  const normalized = {};

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return res.status(400).json({ status: false, message: "Settings payload must be an object" });
  }

  for (const [group, values] of Object.entries(input)) {
    if (group === "reason") continue;
    if (!Object.hasOwn(generalSettingsDefaults, group) || !values || typeof values !== "object" || Array.isArray(values)) {
      errors[group] = "Unknown or invalid settings group";
      continue;
    }

    normalized[group] = {};
    for (const [key, rawValue] of Object.entries(values)) {
      const definition = generalSettingsDefinitionMap.get(`${group}.${key}`);
      if (!definition) {
        errors[`${group}.${key}`] = "Unknown setting";
        continue;
      }
      const result = validateValue(definition, rawValue);
      if (result.error) errors[definition.settingKey] = result.error;
      else normalized[group][key] = result.value;
    }
  }

  let currentSettings;
  try { currentSettings = await SettingsService.getGeneralSettings(); }
  catch (error) { return res.status(503).json({ status: false, message: "Current General Settings could not be loaded" }); }
  const conditionSettings = Object.fromEntries(Object.entries(currentSettings).map(([group, values]) => [
    group, { ...values, ...(normalized[group] || {}) },
  ]));
  validateConditionalRules(conditionSettings, errors);
  const capabilities = SettingsPolicy.getRuntimeCapabilities();
  if (conditionSettings.security.enableTwoFactorAuthentication && !capabilities.twoFactor.configured) {
    errors["security.enableTwoFactorAuthentication"] = "Configure two-factor encryption and SMTP before enabling two-factor authentication";
  }
  if (conditionSettings.notifications.enableEmailNotifications && !capabilities.email.configured) {
    errors["notifications.enableEmailNotifications"] = "Configure SMTP before enabling email notifications";
  }
  if ((conditionSettings.grievanceSubmission.identificationNumberRequired ||
       conditionSettings.ticket.trackingVerificationMethod === "Ticket Number and Identification Number") &&
      !capabilities.pii.configured) {
    errors["grievanceSubmission.identificationNumberRequired"] = "Configure PII encryption before collecting identification numbers";
  }
  if (conditionSettings.workflow.autoCloseResolvedGrievances) {
    try {
      const workflow = await ConfigurationModel.listWorkflow();
      const validTransition = workflow.transitions.some((transition) =>
        transition.is_active && transition.from_status === "Resolved" && transition.to_status === "Closed");
      if (!validTransition) errors["workflow.autoCloseResolvedGrievances"] = "Auto-close requires an active Resolved to Closed transition";
    } catch {
      errors["workflow.autoCloseResolvedGrievances"] = "Workflow dependencies could not be verified";
    }
  }
  if (reason.length > 500) errors.reason = "Change reason must be 500 characters or fewer";

  if (Object.keys(errors).length) {
    return res.status(422).json({
      status: false,
      message: "Review the highlighted settings",
      errors,
    });
  }

  req.validatedSettings = normalized;
  req.settingsChangeReason = reason;
  return next();
};

const validateSettingsReset = (req, res, next) => {
  const confirmation = normalizeString(req.body?.confirmation || "");
  const reason = normalizeString(req.body?.reason || "");
  const errors = {};

  if (confirmation !== "RESET GENERAL SETTINGS") {
    errors.confirmation = "Type RESET GENERAL SETTINGS exactly to continue";
  }
  if (reason.length < 5 || reason.length > 500) {
    errors.reason = "Provide a reset reason between 5 and 500 characters";
  }
  if (Object.keys(errors).length) {
    return res.status(422).json({ status: false, message: "Reset confirmation is invalid", errors });
  }

  req.settingsChangeReason = reason;
  return next();
};

module.exports = {
  validateGeneralSettingsPayload,
  validateSettingsReset,
  validateValue,
};
