const assert = require("node:assert/strict");
const test = require("node:test");
const { DEFAULT_TICKET_NUMBER_SETTINGS } = require("../src/utils/ticket-format-parser");
const {
  buildTicketFormatExamples,
  loadTicketSampleContext,
  serializeTicketSampleContext,
  tryBuildTicketExample,
} = require("../src/services/ticket-example.service");

const fixedDate = new Date("2028-12-31T18:00:00Z");
const timeZone = "America/Belize";
const context = {
  departmentCode: "CARE", departmentLabel: "Care Services",
  locationCode: "NORTH", locationLabel: "Northern Office",
  categoryCode: "SUPPORT", categoryLabel: "Support",
};

test("ticket format presets use current date, configured sequence rules, and master codes", () => {
  const settings = {
    ...DEFAULT_TICKET_NUMBER_SETTINGS,
    ticketPrefix: "case",
    letterCase: "lowercase",
    separator: "/",
    startingSequence: 7,
    sequenceLength: 4,
  };
  const examples = buildTicketFormatExamples({ settings, context, date: fixedDate, timeZone });
  assert.equal(examples.find((item) => item.key === "standard").sample, "case/2028/0007");
  assert.equal(examples.find((item) => item.key === "monthly").sample, "case/202812/0007");
  assert.equal(examples.find((item) => item.key === "department").sample, "case/care/2028/0007");
  assert.equal(examples.find((item) => item.key === "location").sample, "case/north/2028/0007");
  assert.ok(examples.every((item) => Object.keys(item.toggles).length === 6));
  assert.equal(examples.find((item) => item.key === "standard").toggles.includeDepartmentCode, false);
});

test("ticket examples change immediately with the configured timezone", () => {
  const settings = { ...DEFAULT_TICKET_NUMBER_SETTINGS, startingSequence: 1 };
  const date = new Date("2027-01-01T02:00:00Z");
  const belize = buildTicketFormatExamples({ settings, context, date, timeZone: "America/Belize" });
  const kolkata = buildTicketFormatExamples({ settings, context, date, timeZone: "Asia/Kolkata" });
  assert.match(belize.find((item) => item.key === "standard").sample, /2026/);
  assert.match(kolkata.find((item) => item.key === "standard").sample, /2027/);
});

test("ticket examples become unavailable instead of inventing missing master codes", () => {
  const settings = {
    ...DEFAULT_TICKET_NUMBER_SETTINGS,
    ticketFormat: "{PREFIX}-{DEPARTMENT}-{SEQUENCE}",
    includeDepartmentCode: true,
  };
  const result = tryBuildTicketExample({ settings, sequence: 1, context: {}, date: fixedDate, timeZone });
  assert.equal(result.value, null);
  assert.match(result.warning, /Department code is required/);
});

test("sample context selects the first active master records by immutable ID", async () => {
  const statements = [];
  const executor = { query: async (sql) => {
    statements.push(sql);
    if (sql.includes("departments")) return [[{ id: 2, code: "DEPT2", name: "Department 2" }]];
    if (sql.includes("complaint_locations")) return [[{ id: 3, code: "LOC3", name: "Location 3" }]];
    return [[{ id: 4, code: "CAT4", name: "Category 4" }]];
  } };
  const result = await loadTicketSampleContext(executor);
  assert.equal(result.departmentCode, "DEPT2");
  assert.equal(result.locationCode, "LOC3");
  assert.equal(result.categoryCode, "CAT4");
  assert.ok(statements.every((sql) => /WHERE is_active=1 ORDER BY id ASC LIMIT 1/.test(sql)));
  assert.deepEqual(serializeTicketSampleContext(result, fixedDate, timeZone).date, { year: "2028", month: "12", day: "31" });
});
