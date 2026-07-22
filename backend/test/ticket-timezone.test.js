const assert = require("node:assert/strict");
const test = require("node:test");
const { DEFAULT_TICKET_NUMBER_SETTINGS } = require("../src/utils/ticket-format-parser");
const { generateTicketNumber } = require("../src/services/ticket-number-generator.service");
const { getTicketDateParts, getTicketPeriod } = require("../src/utils/ticket-period-helper");

const boundaryInstant = new Date("2027-01-01T02:00:00Z");
const toSettingsRow = (value = DEFAULT_TICKET_NUMBER_SETTINGS) => ({
  auto_generate: value.autoGenerate, ticket_prefix: value.ticketPrefix, ticket_format: value.ticketFormat,
  separator: value.separator, letter_case: value.letterCase, include_year: value.includeYear,
  year_format: value.yearFormat, include_month: value.includeMonth, include_day: value.includeDay,
  include_department_code: value.includeDepartmentCode, include_location_code: value.includeLocationCode,
  include_category_code: value.includeCategoryCode, sequence_length: value.sequenceLength,
  starting_sequence: value.startingSequence, sequence_reset: value.sequenceReset, sequence_padding: value.sequencePadding,
});

test("ticket date parts follow the configured IANA timezone at year boundaries", () => {
  assert.deepEqual(getTicketDateParts(boundaryInstant, "America/Belize"), { year: "2026", month: "12", day: "31" });
  assert.deepEqual(getTicketDateParts(boundaryInstant, "Asia/Kolkata"), { year: "2027", month: "01", day: "01" });
  assert.deepEqual(getTicketDateParts(new Date("2026-03-08T07:30:00Z"), "America/New_York"), { year: "2026", month: "03", day: "08" });
});

test("daily, monthly, and yearly periods use local dates while never remains stable", () => {
  for (const reset of ["daily", "monthly", "yearly"]) {
    const belize = getTicketPeriod({ prefix: "GRM", sequenceReset: reset, date: boundaryInstant, timeZone: "America/Belize" });
    const kolkata = getTicketPeriod({ prefix: "GRM", sequenceReset: reset, date: boundaryInstant, timeZone: "Asia/Kolkata" });
    assert.notEqual(belize.key, kolkata.key);
  }
  const neverBelize = getTicketPeriod({ prefix: "GRM", sequenceReset: "never", date: boundaryInstant, timeZone: "America/Belize" });
  const neverKolkata = getTicketPeriod({ prefix: "GRM", sequenceReset: "never", date: boundaryInstant, timeZone: "Asia/Kolkata" });
  assert.equal(neverBelize.key, "GRM:NEVER");
  assert.equal(neverBelize.key, neverKolkata.key);
});

test("ticket allocation selects the sequence row for the timezone-local period", async () => {
  const ensuredKeys = [];
  const value = { ...DEFAULT_TICKET_NUMBER_SETTINGS, sequenceReset: "daily", ticketFormat: "{PREFIX}-{YEAR}{MONTH}{DAY}-{SEQUENCE}", includeMonth: true, includeDay: true };
  const settingsRow = toSettingsRow(value);
  const repositories = {
    settings: { findSettings: async () => settingsRow },
    sequence: {
      ensureSequence: async ({ key }) => { ensuredKeys.push(key); return { id: ensuredKeys.length, current_sequence: 0 }; },
      ticketExists: async () => false,
      updateSequence: async () => {},
    },
  };
  const belize = await generateTicketNumber({ transaction: {}, repositories, date: boundaryInstant, runtimeSettings: { portal: { timeZone: "America/Belize" } } });
  const kolkata = await generateTicketNumber({ transaction: {}, repositories, date: boundaryInstant, runtimeSettings: { portal: { timeZone: "Asia/Kolkata" } } });
  assert.deepEqual(ensuredKeys, ["GRM:2026-12-31", "GRM:2027-01-01"]);
  assert.match(belize.ticketNumber, /20261231/);
  assert.match(kolkata.ticketNumber, /20270101/);
});

test("ticket processing fails closed for missing or invalid runtime timezone", async () => {
  const repositories = {
    settings: { findSettings: async () => toSettingsRow() },
    sequence: {},
  };
  await assert.rejects(
    generateTicketNumber({ transaction: {}, repositories, runtimeSettings: { portal: {} } }),
    (error) => error.code === "TICKET_TIME_ZONE_REQUIRED" && error.statusCode === 503,
  );
  assert.throws(() => getTicketDateParts(new Date(), "Invalid/Zone"), (error) => error.code === "TICKET_TIME_ZONE_INVALID");
});
