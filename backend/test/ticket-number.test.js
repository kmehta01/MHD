const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { buildTicketNumber: formatTicketNumber, DEFAULT_TICKET_NUMBER_SETTINGS, validateTicketSettings } = require("../src/utils/ticket-format-parser");
const { getTicketPeriod: calculateTicketPeriod } = require("../src/utils/ticket-period-helper");
const { generateTicketNumber } = require("../src/services/ticket-number-generator.service");
const { requireTicketSettingsPermission, requireTicketSettingsSuperAdmin } = require("../src/middlewares/ticket-settings-access.middleware");

const fixedDate = new Date("2026-07-20T12:00:00Z");
const timeZone = "America/Belize";
const runtimeSettings = { portal: { timeZone } };
const buildTicketNumber = (options) => formatTicketNumber({ ...options, timeZone });
const getTicketPeriod = (options) => calculateTicketPeriod({ ...options, timeZone });
const settings = (changes = {}) => ({ ...DEFAULT_TICKET_NUMBER_SETTINGS, ...changes });
const row = (changes = {}) => {
  const value = settings(changes);
  return {
    id: 1, auto_generate: value.autoGenerate, ticket_prefix: value.ticketPrefix,
    ticket_format: value.ticketFormat, separator: value.separator, letter_case: value.letterCase,
    include_year: value.includeYear, year_format: value.yearFormat,
    include_month: value.includeMonth, include_day: value.includeDay,
    include_department_code: value.includeDepartmentCode,
    include_location_code: value.includeLocationCode,
    include_category_code: value.includeCategoryCode,
    sequence_length: value.sequenceLength, starting_sequence: value.startingSequence,
    sequence_reset: value.sequenceReset, sequence_padding: value.sequencePadding,
  };
};

test("standard yearly format generation", () => {
  assert.equal(buildTicketNumber({ settings: settings(), sequence: 145, date: fixedDate }), "GRM-2026-000145");
});

test("monthly format generation", () => {
  const value = settings({ ticketFormat: "{PREFIX}-{YEAR}{MONTH}-{SEQUENCE}", includeMonth: true });
  assert.equal(buildTicketNumber({ settings: value, sequence: 145, date: fixedDate }), "GRM-202607-000145");
  assert.equal(getTicketPeriod({ prefix: "GRM", sequenceReset: "monthly", date: fixedDate }).key, "GRM:2026-07");
});

test("daily reset format generation", () => {
  const value = settings({ ticketFormat: "{PREFIX}-{YEAR}{MONTH}{DAY}-{SEQUENCE}", includeMonth: true, includeDay: true, sequenceReset: "daily" });
  assert.equal(buildTicketNumber({ settings: value, sequence: 1, date: fixedDate }), "GRM-20260720-000001");
  assert.equal(getTicketPeriod({ prefix: "GRM", sequenceReset: "daily", date: fixedDate }).key, "GRM:2026-07-20");
});

test("sequence padding uses the configured width", () => {
  assert.equal(buildTicketNumber({ settings: settings({ sequenceLength: 8 }), sequence: 45, date: fixedDate }), "GRM-2026-00000045");
});

test("sequence can be generated without padding", () => {
  assert.equal(buildTicketNumber({ settings: settings({ sequencePadding: false }), sequence: 145, date: fixedDate }), "GRM-2026-145");
});

test("four-digit and two-digit year formats are supported", () => {
  assert.equal(buildTicketNumber({ settings: settings(), sequence: 1, date: fixedDate }), "GRM-2026-000001");
  assert.equal(buildTicketNumber({ settings: settings({ yearFormat: "two_digit" }), sequence: 1, date: fixedDate }), "GRM-26-000001");
});

test("department code format uses a code and requires context", () => {
  const value = settings({ ticketFormat: "{PREFIX}-{DEPARTMENT}-{SEQUENCE}", includeDepartmentCode: true });
  assert.equal(buildTicketNumber({ settings: value, sequence: 1, context: { departmentCode: "hlt" }, date: fixedDate }), "GRM-HLT-000001");
  assert.throws(() => buildTicketNumber({ settings: value, sequence: 1, date: fixedDate }), /Department code/);
});

test("location code format uses the configured code", () => {
  const value = settings({ ticketFormat: "{PREFIX}-{LOCATION}-{SEQUENCE}", includeLocationCode: true });
  assert.equal(buildTicketNumber({ settings: value, sequence: 1, context: { locationCode: "bz" }, date: fixedDate }), "GRM-BZ-000001");
});

test("category code format uses the configured code", () => {
  const value = settings({ ticketFormat: "{PREFIX}-{CATEGORY}-{SEQUENCE}", includeCategoryCode: true });
  assert.equal(buildTicketNumber({ settings: value, sequence: 1, context: { categoryCode: "srv" }, date: fixedDate }), "GRM-SRV-000001");
});

test("invalid variables are rejected", () => {
  const result = validateTicketSettings(settings({ ticketFormat: "{PREFIX}-{UNKNOWN}-{SEQUENCE}" }));
  assert.match(result.errors.ticketFormat, /Unsupported variable/);
});

test("a format missing SEQUENCE is rejected", () => {
  const result = validateTicketSettings(settings({ ticketFormat: "{PREFIX}-{YEAR}" }));
  assert.match(result.errors.ticketFormat, /must contain \{SEQUENCE\}/);
});

const createLockedRepositories = ({ existing = [] } = {}) => {
  let current = 0;
  let tail = Promise.resolve();
  const releases = new Map();
  const tickets = new Set(existing);
  return {
    get current() { return current; },
    settings: { findSettings: async () => row() },
    sequence: {
      ensureSequence: async (_payload, transaction) => {
        const previous = tail;
        let release;
        tail = new Promise((resolve) => { release = resolve; });
        await previous;
        releases.set(transaction, release);
        return { id: 1, current_sequence: current };
      },
      ticketExists: async (ticket) => tickets.has(ticket),
      updateSequence: async ({ sequence, ticketNumber }, transaction) => {
        current = sequence; tickets.add(ticketNumber); releases.get(transaction)?.();
      },
    },
  };
};

test("concurrent grievance allocations remain unique", async () => {
  const repositories = createLockedRepositories();
  const results = await Promise.all(Array.from({ length: 25 }, (_, id) =>
    generateTicketNumber({ transaction: { id }, repositories, date: fixedDate, runtimeSettings })));
  assert.equal(new Set(results.map((item) => item.ticketNumber)).size, 25);
  assert.equal(repositories.current, 25);
});

test("duplicate ticket prevention skips an existing permanent number", async () => {
  const repositories = createLockedRepositories({ existing: ["GRM-2026-000001"] });
  const result = await generateTicketNumber({ transaction: { id: 1 }, repositories, date: fixedDate, runtimeSettings });
  assert.equal(result.ticketNumber, "GRM-2026-000002");
});

test("a new yearly period begins from the configured starting sequence", () => {
  assert.equal(getTicketPeriod({ prefix: "GRM", sequenceReset: "yearly", date: new Date("2027-01-01T12:00:00Z") }).key, "GRM:2027");
  assert.equal(buildTicketNumber({ settings: settings(), sequence: 1, date: new Date("2027-01-01T12:00:00Z") }), "GRM-2027-000001");
});

test("preview formatting does not mutate its sequence input", () => {
  const sequence = { current: 145 };
  const before = JSON.stringify(sequence);
  buildTicketNumber({ settings: settings(), sequence: sequence.current, date: fixedDate, preview: true });
  assert.equal(JSON.stringify(sequence), before);
});

const responseMock = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

test("unauthorized and Ministry users cannot access ticket settings", () => {
  const permission = requireTicketSettingsPermission("settings.ticket_number.view");
  for (const user of [{ role_slug: "admin", permissions: [] }, { role_slug: "ministry-user", permissions: ["settings.ticket_number.view"] }]) {
    const res = responseMock(); let nextCalled = false;
    permission({ user }, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 403); assert.equal(nextCalled, false);
  }
});

test("Admin access is read-only and ticket mutations remain Super Admin only", () => {
  const read = requireTicketSettingsPermission("settings.ticket_number.view");
  const write = requireTicketSettingsSuperAdmin;
  const req = { user: { role_slug: "admin", permissions: ["settings.ticket_number.view"] } };
  let readCalled = false; const readRes = responseMock(); read(req, readRes, () => { readCalled = true; });
  assert.equal(readCalled, true);
  const writeRes = responseMock(); write(req, writeRes, () => assert.fail("Admin mutation should not be allowed"));
  assert.equal(writeRes.statusCode, 403);
});

test("reassignment code cannot rewrite a generated ticket number", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../src/models/complaint.model.js"), "utf8");
  assert.doesNotMatch(source, /UPDATE\s+complaints\s+SET\s+token_number/i);
});

test("complaint creation allocates inside its transaction and rolls back failures", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../src/models/complaint.model.js"), "utf8");
  assert.match(source, /generateTicketNumber\(\{ transaction: connection, runtimeSettings: complaint\.settings \}\)/);
  assert.match(source, /catch \(error\) \{\s*await connection\.rollback\(\)/);
  assert.ok(source.indexOf("generateTicketNumber({ transaction: connection, runtimeSettings: complaint.settings })") < source.indexOf("INSERT INTO complaints SET ?"));
});
