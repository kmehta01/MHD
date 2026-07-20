const requestValidationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const assertRecord = (source, label) => {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw requestValidationError(`${label} must be an object`);
  }
};

const getOptionalString = (
  source,
  field,
  { label = "Request parameters", maxLength = 255, lowercase = false } = {},
) => {
  assertRecord(source, label);
  const value = source[field];

  if (value === undefined || value === "") {
    return "";
  }

  if (typeof value !== "string") {
    throw requestValidationError(`${field} must be a single string value`);
  }

  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw requestValidationError(
      `${field} must be ${maxLength} characters or fewer`,
    );
  }

  return lowercase ? normalized.toLowerCase() : normalized;
};

const getOptionalInteger = (
  source,
  field,
  {
    allowZero = false,
    defaultValue = null,
    label = "Request parameters",
    maximum = Number.MAX_SAFE_INTEGER,
  } = {},
) => {
  const value = getOptionalString(source, field, {
    label,
    maxLength: 20,
  });

  if (!value) return defaultValue;
  if (!/^\d+$/.test(value)) {
    throw requestValidationError(`${field} must be an integer`);
  }

  const parsed = Number(value);
  const minimum = allowZero ? 0 : 1;
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw requestValidationError(`${field} is outside the allowed range`);
  }

  return parsed;
};

module.exports = {
  assertRecord,
  getOptionalInteger,
  getOptionalString,
  requestValidationError,
};
