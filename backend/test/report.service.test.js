const assert = require("node:assert/strict");
const test = require("node:test");
const { formatPortalDateTime } = require("../src/services/report.service");

test("report timestamps honor configured date, time, and time-zone formats", () => {
  const value = "2026-07-21T18:05:00.000Z";
  assert.equal(formatPortalDateTime(value, {
    dateFormat: "YYYY-MM-DD", timeFormat: "24 Hour", timeZone: "America/Belize",
  }), "2026-07-21 12:05");
  assert.match(formatPortalDateTime(value, {
    dateFormat: "MM/DD/YYYY", timeFormat: "12 Hour", timeZone: "Asia/Kolkata",
  }), /^07\/21\/2026 11:35 PM$/i);
});
