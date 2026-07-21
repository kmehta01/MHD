const { validateTicketSettings } = require("../utils/ticket-format-parser");

const cleanText = (value) => String(value ?? "").replace(/\0/g, "").trim();

const validateTicketSettingsPayload = (req, res, next) => {
  const input = req.body?.settings || req.body;
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return res.status(400).json({ status: false, success: false, message: "Settings payload must be an object" });
  }
  const allowed = new Set([
    "autoGenerate", "ticketPrefix", "ticketFormat", "separator", "letterCase",
    "includeYear", "yearFormat", "includeMonth", "includeDay",
    "includeDepartmentCode", "includeLocationCode", "includeCategoryCode",
    "sequenceLength", "startingSequence", "sequenceReset", "sequencePadding",
  ]);
  const errors = {};
  for (const key of Object.keys(input)) {
    if (![...allowed, "reason", "settings"].includes(key)) errors[key] = "Unknown setting";
  }
  const validation = validateTicketSettings(input);
  Object.assign(errors, validation.errors);
  const reason = cleanText(req.body?.reason);
  if (reason.length > 500) errors.reason = "Reason must be 500 characters or fewer";
  if (Object.keys(errors).length) {
    return res.status(422).json({ status: false, success: false, message: "Review the highlighted ticket settings", errors });
  }
  req.validatedTicketSettings = validation.normalized;
  req.ticketSettingsReason = reason;
  return next();
};

const validateTicketPreview = (req, res, next) => {
  const input = req.body?.settings || req.body;
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return res.status(400).json({ status: false, success: false, message: "Preview settings must be an object" });
  }
  req.ticketPreviewSettings = input;
  return next();
};

const validateSequenceReset = (req, res, next) => {
  const confirmation = cleanText(req.body?.confirmation);
  const reason = cleanText(req.body?.reason);
  const newStartingSequence = Number(req.body?.newStartingSequence);
  const errors = {};
  if (confirmation !== "RESET TICKET SEQUENCE") errors.confirmation = "Type RESET TICKET SEQUENCE exactly to continue";
  if (!Number.isInteger(newStartingSequence) || newStartingSequence < 1 || newStartingSequence > 999999999999) {
    errors.newStartingSequence = "New starting sequence must be a whole number from 1 to 999999999999";
  }
  if (reason.length < 5 || reason.length > 500) errors.reason = "Provide a reset reason between 5 and 500 characters";
  if (Object.keys(errors).length) {
    return res.status(422).json({ status: false, success: false, message: "Reset confirmation is invalid", errors });
  }
  req.ticketSequenceReset = { newStartingSequence, reason };
  return next();
};

const validateTicketHistoryQuery = (req, res, next) => {
  const errors = {};
  const scalarKeys = ["dateFrom", "dateTo", "changedBy", "changeType", "settingKey", "page", "perPage"];
  for (const key of scalarKeys) {
    if (req.query[key] !== undefined && typeof req.query[key] !== "string") errors[key] = `${key} must be a single value`;
  }
  for (const key of ["dateFrom", "dateTo"]) {
    if (req.query[key] && !/^\d{4}-\d{2}-\d{2}$/.test(req.query[key])) errors[key] = `${key} must use YYYY-MM-DD`;
  }
  if (req.query.changedBy && !/^\d+$/.test(req.query.changedBy)) errors.changedBy = "changedBy must be a user ID";
  if (req.query.changeType && !["settings_update", "sequence_reset", "format_change"].includes(req.query.changeType)) errors.changeType = "Unsupported change type";
  if (req.query.settingKey && !/^[A-Za-z][A-Za-z0-9]{0,149}$/.test(req.query.settingKey)) errors.settingKey = "Invalid setting key";
  if (req.query.page && (!/^\d+$/.test(req.query.page) || Number(req.query.page) < 1)) errors.page = "page must be at least 1";
  if (req.query.perPage && (!/^\d+$/.test(req.query.perPage) || Number(req.query.perPage) < 1 || Number(req.query.perPage) > 100)) errors.perPage = "perPage must be from 1 to 100";
  if (Object.keys(errors).length) return res.status(422).json({ status: false, success: false, message: "Invalid history filters", errors });
  return next();
};

module.exports = { validateSequenceReset, validateTicketHistoryQuery, validateTicketPreview, validateTicketSettingsPayload };
