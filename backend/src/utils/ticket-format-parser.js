const { getTicketDateParts } = require("./ticket-period-helper");

const APPROVED_TICKET_VARIABLES = [
  "{PREFIX}", "{YEAR}", "{YEAR_SHORT}", "{MONTH}", "{DAY}",
  "{DEPARTMENT}", "{LOCATION}", "{CATEGORY}", "{SEQUENCE}",
];

const VARIABLE_REQUIREMENTS = {
  "{YEAR}": "includeYear",
  "{YEAR_SHORT}": "includeYear",
  "{MONTH}": "includeMonth",
  "{DAY}": "includeDay",
  "{DEPARTMENT}": "includeDepartmentCode",
  "{LOCATION}": "includeLocationCode",
  "{CATEGORY}": "includeCategoryCode",
};

const DEFAULT_TICKET_NUMBER_SETTINGS = {
  autoGenerate: true,
  ticketPrefix: "GRM",
  ticketFormat: "{PREFIX}-{YEAR}-{SEQUENCE}",
  separator: "-",
  letterCase: "uppercase",
  includeYear: true,
  yearFormat: "four_digit",
  includeMonth: false,
  includeDay: false,
  includeDepartmentCode: false,
  includeLocationCode: false,
  includeCategoryCode: false,
  sequenceLength: 6,
  startingSequence: 1,
  sequenceReset: "yearly",
  sequencePadding: true,
};

const normalizeCode = (value, fallback, field, preview) => {
  const normalized = String(value || "").trim().toUpperCase();
  if (!normalized && preview) return fallback;
  if (!/^[A-Z0-9-]{1,20}$/.test(normalized)) {
    const error = new Error(`${field} code is required and must use letters, numbers, or hyphens`);
    error.code = "TICKET_CONTEXT_REQUIRED";
    throw error;
  }
  return normalized;
};

const validateTicketSettings = (input, { partial = false } = {}) => {
  const source = partial ? { ...DEFAULT_TICKET_NUMBER_SETTINGS, ...input } : input;
  const errors = {};
  const warnings = [];
  const normalized = {};
  const booleanKeys = [
    "autoGenerate", "includeYear", "includeMonth", "includeDay",
    "includeDepartmentCode", "includeLocationCode", "includeCategoryCode",
    "sequencePadding",
  ];

  for (const key of booleanKeys) {
    if (typeof source[key] !== "boolean") errors[key] = `${key} must be true or false`;
    else normalized[key] = source[key];
  }

  const prefix = typeof source.ticketPrefix === "string" ? source.ticketPrefix.trim() : "";
  if (!/^[A-Za-z0-9-]{2,20}$/.test(prefix)) {
    errors.ticketPrefix = "Ticket prefix must be 2-20 letters, numbers, or hyphens with no spaces";
  } else normalized.ticketPrefix = prefix;

  const format = typeof source.ticketFormat === "string" ? source.ticketFormat.trim() : "";
  if (!format || format.length > 255) errors.ticketFormat = "Ticket format is required and must be 255 characters or fewer";
  else if (/[<>"'`\0]|javascript\s*:/i.test(format)) errors.ticketFormat = "Ticket format contains unsafe characters";
  else {
    const variables = format.match(/\{[A-Z_]+\}/g) || [];
    const unknown = variables.filter((variable) => !APPROVED_TICKET_VARIABLES.includes(variable));
    const withoutVariables = format.replace(/\{[A-Z_]+\}/g, "");
    if (unknown.length) errors.ticketFormat = `Unsupported variable${unknown.length > 1 ? "s" : ""}: ${[...new Set(unknown)].join(", ")}`;
    else if (/[{}]/.test(withoutVariables)) errors.ticketFormat = "Ticket format contains a malformed variable";
    else if (/[-/_]{2,}/.test(format)) errors.ticketFormat = "Ticket format cannot contain repeated separators";
    else if (!variables.includes("{SEQUENCE}")) errors.ticketFormat = "Ticket format must contain {SEQUENCE}";
    else {
      for (const [variable, toggle] of Object.entries(VARIABLE_REQUIREMENTS)) {
        if (variables.includes(variable) && source[toggle] !== true) {
          errors.ticketFormat = `${variable} cannot be used while its include option is disabled`;
          break;
        }
      }
      if (!errors.ticketFormat) normalized.ticketFormat = format;
      if (source.includeYear && !variables.some((variable) => ["{YEAR}", "{YEAR_SHORT}"].includes(variable))) warnings.push("Year is enabled but the format does not include a year variable.");
      if (source.includeMonth && !variables.includes("{MONTH}")) warnings.push("Month is enabled but {MONTH} is not in the format.");
      if (source.includeDay && !variables.includes("{DAY}")) warnings.push("Day is enabled but {DAY} is not in the format.");
      if (source.includeDepartmentCode) warnings.push("Department code may be unavailable when a ticket is generated before assignment.");
    }
  }

  const separator = typeof source.separator === "string" ? source.separator : "";
  if (separator.length > 3 || /[\s<>"'`{}]/.test(separator)) errors.separator = "Separator must be 0-3 safe characters without spaces";
  else normalized.separator = separator;

  if (!["uppercase", "lowercase", "preserve"].includes(source.letterCase)) errors.letterCase = "Select a valid letter case";
  else normalized.letterCase = source.letterCase;
  if (!["four_digit", "two_digit"].includes(source.yearFormat)) errors.yearFormat = "Select a valid year format";
  else normalized.yearFormat = source.yearFormat;
  if (!["never", "daily", "monthly", "yearly"].includes(source.sequenceReset)) errors.sequenceReset = "Select a valid sequence reset period";
  else normalized.sequenceReset = source.sequenceReset;

  for (const [key, min, max] of [["sequenceLength", 4, 12], ["startingSequence", 1, 999999999999]]) {
    const value = source[key];
    if (!Number.isInteger(value) || value < min || value > max) errors[key] = `${key} must be a whole number from ${min} to ${max}`;
    else normalized[key] = value;
  }

  const result = { ...source, ...normalized };
  if (!Object.keys(errors).length) {
    try {
      buildTicketNumber({ settings: result, sequence: 999999999999, preview: true });
    } catch (error) {
      errors.ticketFormat = error.message;
    }
  }
  return { errors, normalized: result, warnings };
};

const applyConfiguredSeparator = (format, separator) =>
  format.replace(/}[-/_]+{/g, `}${separator}{`);

const buildTicketNumber = ({ settings, sequence, context = {}, date = new Date(), preview = false }) => {
  const parts = getTicketDateParts(date);
  const prefix = settings.letterCase === "preserve"
    ? settings.ticketPrefix
    : settings.letterCase === "lowercase"
      ? settings.ticketPrefix.toLowerCase()
      : settings.ticketPrefix.toUpperCase();
  const sequenceValue = settings.sequencePadding
    ? String(sequence).padStart(settings.sequenceLength, "0")
    : String(sequence);
  let output = applyConfiguredSeparator(settings.ticketFormat, settings.separator);
  const contextValue = (variable, value, fallback, field) =>
    output.includes(variable) ? normalizeCode(value, fallback, field, preview) : "";
  const values = {
    "{PREFIX}": prefix,
    "{YEAR}": settings.yearFormat === "two_digit" ? parts.year.slice(-2) : parts.year,
    "{YEAR_SHORT}": parts.year.slice(-2),
    "{MONTH}": parts.month,
    "{DAY}": parts.day,
    "{DEPARTMENT}": contextValue("{DEPARTMENT}", context.departmentCode, "DEP", "Department"),
    "{LOCATION}": contextValue("{LOCATION}", context.locationCode, "LOC", "Location"),
    "{CATEGORY}": contextValue("{CATEGORY}", context.categoryCode, "CAT", "Category"),
    "{SEQUENCE}": sequenceValue,
  };
  for (const [variable, value] of Object.entries(values)) output = output.split(variable).join(value);
  if (settings.letterCase === "uppercase") output = output.toUpperCase();
  if (settings.letterCase === "lowercase") output = output.toLowerCase();
  if (output.length > 255) {
    const error = new Error("The generated ticket number exceeds 255 characters");
    error.code = "TICKET_TOO_LONG";
    throw error;
  }
  return output;
};

module.exports = {
  APPROVED_TICKET_VARIABLES,
  DEFAULT_TICKET_NUMBER_SETTINGS,
  buildTicketNumber,
  validateTicketSettings,
};
