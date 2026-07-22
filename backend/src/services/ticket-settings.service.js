const db = require("../config/db");
const settingsRepository = require("../repositories/ticket-settings.repository");
const sequenceRepository = require("../repositories/ticket-sequence.repository");
const { rowToSettings } = require("./ticket-number-generator.service");
const { validateTicketSettings } = require("../utils/ticket-format-parser");
const { getTicketPeriod, requireTicketTimeZone } = require("../utils/ticket-period-helper");
const SettingsPolicy = require("./settings-policy.service");
const {
  buildTicketFormatExamples,
  loadTicketSampleContext,
  serializeTicketSampleContext,
  tryBuildTicketExample,
} = require("./ticket-example.service");

const SETTINGS_KEYS = [
  "autoGenerate", "ticketPrefix", "ticketFormat", "separator", "letterCase",
  "includeYear", "yearFormat", "includeMonth", "includeDay",
  "includeDepartmentCode", "includeLocationCode", "includeCategoryCode",
  "sequenceLength", "startingSequence", "sequenceReset", "sequencePadding",
];
const FORMAT_KEYS = new Set(SETTINGS_KEYS.filter((key) => !["autoGenerate", "startingSequence", "sequenceReset"].includes(key)));
const getRuntimeTimeZone = (policy) => {
  try { return requireTicketTimeZone(policy?.portal?.timeZone); }
  catch (error) { error.statusCode = 503; throw error; }
};
const stringify = (value) => typeof value === "string" ? value : JSON.stringify(value);
const requestContext = (req, reason) => ({
  userId: req.user.id,
  reason: reason || null,
  ipAddress: String(req.ip || req.socket?.remoteAddress || "").replace(/^::ffff:/, "").slice(0, 45) || null,
  userAgent: String(req.get?.("user-agent") || "").slice(0, 2000) || null,
});

const sequenceDetails = async (settings, executor = db, { lock = false, date = new Date(), timeZone } = {}) => {
  const period = getTicketPeriod({ prefix: settings.ticketPrefix, sequenceReset: settings.sequenceReset, date, timeZone });
  const row = await sequenceRepository.findSequence(period.key, executor, { forUpdate: lock });
  const currentSequence = row ? Number(row.current_sequence) : settings.startingSequence - 1;
  return { period, row, currentSequence, nextSequence: currentSequence + 1 };
};

const serializeResponse = (row, sequence, timeZone) => ({
  ...rowToSettings(row),
  currentSequence: sequence.currentSequence,
  nextSequence: sequence.nextSequence,
  sequencePeriod: sequence.period.label,
  lastGeneratedTicket: sequence.row?.last_generated_ticket || null,
  lastGeneratedAt: sequence.row?.last_generated_at || null,
  updatedBy: row.updated_by ? { id: row.updated_by, name: row.updated_by_name || null } : null,
  updatedAt: row.updated_at,
  timeZone,
});

const getSettings = async ({ runtimeSettings } = {}) => {
  const [row, policy] = await Promise.all([
    settingsRepository.findSettings(),
    runtimeSettings ? Promise.resolve(runtimeSettings) : SettingsPolicy.getPolicy(),
  ]);
  if (!row) { const error = new Error("Ticket settings are not configured"); error.statusCode = 503; throw error; }
  if (row.updated_by) {
    const [users] = await db.query("SELECT name FROM admin_users WHERE id = ? LIMIT 1", [row.updated_by]);
    row.updated_by_name = users[0]?.name || null;
  }
  const timeZone = getRuntimeTimeZone(policy);
  return serializeResponse(row, await sequenceDetails(rowToSettings(row), db, { timeZone }), timeZone);
};

const preview = async (input, { date = new Date(), runtimeSettings } = {}) => {
  const [storedRow, policy] = await Promise.all([
    settingsRepository.findSettings(),
    runtimeSettings ? Promise.resolve(runtimeSettings) : SettingsPolicy.getPolicy(),
  ]);
  if (!storedRow) { const error = new Error("Ticket settings are not configured"); error.statusCode = 503; throw error; }
  const timeZone = getRuntimeTimeZone(policy);
  const validation = validateTicketSettings({ ...rowToSettings(storedRow), ...input }, { timeZone });
  if (Object.keys(validation.errors).length) {
    const error = new Error("Review the highlighted ticket settings");
    error.statusCode = 422;
    error.errors = validation.errors;
    throw error;
  }
  const settings = validation.normalized;
  const [details, sampleContext] = await Promise.all([
    sequenceDetails(settings, db, { date, timeZone }),
    loadTicketSampleContext(),
  ]);
  const previewSequence = Math.max(details.currentSequence, settings.startingSequence);
  const nextSequence = Math.max(details.nextSequence, settings.startingSequence);
  const currentExample = tryBuildTicketExample({ settings, sequence: previewSequence, context: sampleContext, date, timeZone });
  const nextExample = tryBuildTicketExample({ settings, sequence: nextSequence, context: sampleContext, date, timeZone });
  return {
    preview: currentExample.value,
    nextPreview: nextExample.value,
    currentSequence: details.currentSequence,
    nextSequence,
    sequencePeriod: details.period.label,
    timeZone,
    sampleContext: serializeTicketSampleContext(sampleContext, date, timeZone),
    formatExamples: buildTicketFormatExamples({ settings, context: sampleContext, date, timeZone }),
    warnings: [...validation.warnings, ...new Set([currentExample.warning, nextExample.warning].filter(Boolean))],
  };
};

const getPublicExample = async ({ date = new Date(), runtimeSettings } = {}) => {
  const [row, policy] = await Promise.all([
    settingsRepository.findSettings(),
    runtimeSettings ? Promise.resolve(runtimeSettings) : SettingsPolicy.getPolicy(),
  ]);
  if (!row) return null;
  const settings = rowToSettings(row);
  const timeZone = getRuntimeTimeZone(policy);
  const validation = validateTicketSettings(settings, { timeZone });
  if (Object.keys(validation.errors).length) return null;
  const context = await loadTicketSampleContext();
  return tryBuildTicketExample({
    settings: validation.normalized,
    sequence: validation.normalized.startingSequence,
    context,
    date,
    timeZone,
  }).value;
};

const updateSettings = async ({ settings, req, reason }) => {
  const runtimeSettings = await SettingsPolicy.getPolicy();
  const timeZone = getRuntimeTimeZone(runtimeSettings);
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const oldRow = await settingsRepository.findSettings(connection, { forUpdate: true });
    if (!oldRow) { const error = new Error("Ticket settings are not configured"); error.statusCode = 503; throw error; }
    const oldSettings = rowToSettings(oldRow);
    const oldSequence = await sequenceDetails(oldSettings, connection, { lock: true, timeZone });
    if (settings.startingSequence !== oldSettings.startingSequence && oldSequence.currentSequence >= oldSettings.startingSequence) {
      const error = new Error("Starting Sequence can only change before a ticket is generated in this period. Use Reset Sequence instead.");
      error.statusCode = 409;
      error.errors = { startingSequence: error.message };
      throw error;
    }

    const changes = SETTINGS_KEYS.filter((key) => oldSettings[key] !== settings[key]);
    if (changes.length) {
      await settingsRepository.updateSettings(settings, req.user.id, connection);
      const newPeriod = getTicketPeriod({ prefix: settings.ticketPrefix, sequenceReset: settings.sequenceReset, timeZone });
      if (newPeriod.key !== oldSequence.period.key) {
        const carriedSequence = await sequenceRepository.ensureSequence({
          key: newPeriod.key, start: newPeriod.start, end: newPeriod.end,
          initialSequence: oldSequence.currentSequence,
        }, connection);
        await sequenceRepository.preserveSequenceFloor({ id: carriedSequence.id, sequence: oldSequence.currentSequence }, connection);
      }
      for (const key of changes) {
        await settingsRepository.createLog({
          key,
          oldValue: stringify(oldSettings[key]),
          newValue: stringify(settings[key]),
          type: FORMAT_KEYS.has(key) ? "format_change" : "settings_update",
        }, requestContext(req, reason), connection);
      }
    }
    await connection.commit();
    const data = await getSettings({ runtimeSettings });
    return {
      data,
      changes,
      preview: await preview(data, { runtimeSettings }),
      warnings: changes.some((key) => FORMAT_KEYS.has(key))
        ? ["Format changes apply only to future tickets. Existing grievance ticket numbers remain unchanged."]
        : [],
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const resetSequence = async ({ newStartingSequence, req, reason }) => {
  const runtimeSettings = await SettingsPolicy.getPolicy();
  const timeZone = getRuntimeTimeZone(runtimeSettings);
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const row = await settingsRepository.findSettings(connection, { forUpdate: true });
    const settings = rowToSettings(row);
    const details = await sequenceDetails(settings, connection, { lock: true, timeZone });
    const sequenceRow = details.row || await sequenceRepository.ensureSequence({
      key: details.period.key, start: details.period.start, end: details.period.end,
      initialSequence: settings.startingSequence - 1,
    }, connection);
    const nextSequence = newStartingSequence;
    const sampleContext = await loadTicketSampleContext(connection);
    const nextTicket = tryBuildTicketExample({ settings, sequence: nextSequence, context: sampleContext, date: new Date(), timeZone }).value;
    if (nextTicket && await sequenceRepository.ticketExists(nextTicket, connection)) {
      const error = new Error(`Reset rejected because ${nextTicket} already exists`);
      error.statusCode = 409;
      error.errors = { newStartingSequence: error.message };
      throw error;
    }
    await sequenceRepository.resetSequence({ id: sequenceRow.id, sequence: newStartingSequence - 1 }, connection);
    await settingsRepository.createLog({
      key: "currentSequence",
      oldValue: stringify(details.currentSequence),
      newValue: stringify(newStartingSequence - 1),
      type: "sequence_reset",
    }, requestContext(req, reason), connection);
    await connection.commit();
    return { data: await getSettings({ runtimeSettings }), nextTicket };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const getHistory = async (filters) => {
  const [rows, total] = await Promise.all([
    settingsRepository.findHistory(filters),
    settingsRepository.countHistory(filters),
  ]);
  return { rows, total };
};

module.exports = { getHistory, getPublicExample, getSettings, preview, resetSequence, updateSettings };
