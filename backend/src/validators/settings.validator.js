const {
  generalSettingsDefinitionMap,
  generalSettingsDefaults,
} = require("../utils/default-general-settings");

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
};

const validateGeneralSettingsPayload = (req, res, next) => {
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

  const conditionSettings = Object.fromEntries(
    Object.entries(generalSettingsDefaults).map(([group, values]) => [
      group,
      { ...values, ...(normalized[group] || {}) },
    ]),
  );
  validateConditionalRules(conditionSettings, errors);
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
