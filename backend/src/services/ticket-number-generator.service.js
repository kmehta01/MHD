const db = require("../config/db");
const settingsRepository = require("../repositories/ticket-settings.repository");
const sequenceRepository = require("../repositories/ticket-sequence.repository");
const { buildTicketNumber, validateTicketSettings } = require("../utils/ticket-format-parser");
const { getTicketPeriod } = require("../utils/ticket-period-helper");

const rowToSettings = (row) => ({
  autoGenerate: Boolean(row.auto_generate),
  ticketPrefix: row.ticket_prefix,
  ticketFormat: row.ticket_format,
  separator: row.separator,
  letterCase: row.letter_case,
  includeYear: Boolean(row.include_year),
  yearFormat: row.year_format,
  includeMonth: Boolean(row.include_month),
  includeDay: Boolean(row.include_day),
  includeDepartmentCode: Boolean(row.include_department_code),
  includeLocationCode: Boolean(row.include_location_code),
  includeCategoryCode: Boolean(row.include_category_code),
  sequenceLength: Number(row.sequence_length),
  startingSequence: Number(row.starting_sequence),
  sequenceReset: row.sequence_reset,
  sequencePadding: Boolean(row.sequence_padding),
});

const configurationError = (message, code = "TICKET_CONFIGURATION_ERROR") => {
  const error = new Error(message);
  error.code = code;
  error.statusCode = 503;
  return error;
};

const generateUsingTransaction = async ({ context, date, transaction, repositories }) => {
  const settingsRow = await repositories.settings.findSettings(transaction);
  if (!settingsRow) throw configurationError("Ticket number settings are not configured");
  const settings = rowToSettings(settingsRow);
  if (!settings.autoGenerate) {
    throw configurationError("Automatic ticket generation is disabled and no authorized manual workflow is configured", "TICKET_AUTO_GENERATION_DISABLED");
  }
  const validation = validateTicketSettings(settings);
  if (Object.keys(validation.errors).length) throw configurationError("Ticket number settings are invalid");

  const period = getTicketPeriod({
    prefix: settings.ticketPrefix,
    sequenceReset: settings.sequenceReset,
    date,
  });
  const row = await repositories.sequence.ensureSequence({
    key: period.key,
    start: period.start,
    end: period.end,
    initialSequence: settings.startingSequence - 1,
  }, transaction);

  let sequence = Number(row.current_sequence);
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    sequence += 1;
    const ticketNumber = buildTicketNumber({ settings, sequence, context, date });
    if (await repositories.sequence.ticketExists(ticketNumber, transaction)) continue;
    await repositories.sequence.updateSequence({ id: row.id, sequence, ticketNumber }, transaction);
    return { ticketNumber, sequence, sequenceKey: period.key, sequencePeriod: period.label };
  }
  throw configurationError("Unable to allocate a unique ticket number", "TICKET_SEQUENCE_EXHAUSTED");
};

const generateTicketNumber = async ({
  departmentCode,
  locationCode,
  categoryCode,
  transaction,
  date = new Date(),
  repositories = { settings: settingsRepository, sequence: sequenceRepository },
} = {}) => {
  const context = { departmentCode, locationCode, categoryCode };
  if (transaction) return generateUsingTransaction({ context, date, transaction, repositories });

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const result = await generateUsingTransaction({ context, date, transaction: connection, repositories });
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = { generateTicketNumber, rowToSettings };
