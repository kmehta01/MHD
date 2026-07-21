const assert = require("node:assert/strict");
const test = require("node:test");
const { generalSettingsDefaults } = require("../src/utils/default-general-settings");
const {
  calculateDueAt,
  createPolicyCalendar,
  getActiveHolidayKeys,
  getZonedParts,
  normalizeHolidayKey,
  parsePortalDateTime,
} = require("../src/services/due-date.service");

const settingsFor = (overrides = {}) => {
  const settings = JSON.parse(JSON.stringify(generalSettingsDefaults));
  Object.assign(settings.dueDate, overrides.dueDate || {});
  Object.assign(settings.portal, overrides.portal || {});
  return settings;
};

test("calendar and working-day calculations preserve portal-local wall time", async () => {
  const calendarSettings = settingsFor({
    dueDate: { defaultResolutionDays: 3, countWorkingDaysOnly: false, excludePublicHolidays: false },
  });
  const workingSettings = settingsFor({
    dueDate: { defaultResolutionDays: 3, countWorkingDaysOnly: true, excludePublicHolidays: true },
  });
  const start = parsePortalDateTime("2026-01-02T10:30", "America/Belize");
  const calendarDue = await calculateDueAt({ startDate: start, settings: calendarSettings });
  const workingDue = await calculateDueAt({
    startDate: start,
    settings: workingSettings,
    holidayKeys: new Set(["2026-01-06"]),
  });

  assert.deepEqual(getZonedParts(calendarDue, "America/Belize"), {
    year: 2026, month: 1, day: 5, hour: 10, minute: 30, second: 0,
  });
  assert.deepEqual(getZonedParts(workingDue, "America/Belize"), {
    year: 2026, month: 1, day: 8, hour: 10, minute: 30, second: 0,
  });
});

test("calendar handles leap dates and daylight-saving transitions", async () => {
  const leapSettings = settingsFor({
    dueDate: { defaultResolutionDays: 1, countWorkingDaysOnly: false, excludePublicHolidays: false },
  });
  assert.equal(
    (await calculateDueAt({
      startDate: new Date("2024-02-28T18:00:00Z"), settings: leapSettings,
    })).toISOString(),
    "2024-02-29T18:00:00.000Z",
  );

  const dstSettings = settingsFor({
    portal: { timeZone: "America/New_York" },
    dueDate: { defaultResolutionDays: 3, countWorkingDaysOnly: false, excludePublicHolidays: false },
  });
  const result = await calculateDueAt({
    startDate: new Date("2026-03-06T15:00:00Z"), settings: dstSettings,
  });
  assert.equal(result.toISOString(), "2026-03-09T14:00:00.000Z");
  assert.equal(getZonedParts(result, "America/New_York").hour, 10);
});

test("office date-only intake uses noon in the configured portal timezone", () => {
  assert.equal(
    parsePortalDateTime("2026-07-21", "America/Belize").toISOString(),
    "2026-07-21T18:00:00.000Z",
  );
});

test("reminders, escalations, and eligible extension dates use one policy calendar", async () => {
  const settings = settingsFor({
    dueDate: {
      countWorkingDaysOnly: true,
      excludePublicHolidays: true,
      dueDateReminderDays: 1,
      escalateAfterDays: 1,
    },
  });
  const calendar = await createPolicyCalendar({
    settings,
    holidayKeys: new Set(["2026-03-10"]),
  });
  const dueAt = parsePortalDateTime("2026-03-09T10:00", "America/Belize");

  assert.equal(calendar.calculateReminderAt(dueAt).toISOString(), "2026-03-06T16:00:00.000Z");
  assert.equal(calendar.calculateEscalationAt(dueAt).toISOString(), "2026-03-11T16:00:00.000Z");
  assert.equal(calendar.isEligibleDate(parsePortalDateTime("2026-03-07", "America/Belize")), false);
  assert.equal(calendar.isEligibleDate(parsePortalDateTime("2026-03-10", "America/Belize")), false);
  assert.equal(calendar.isEligibleDate(parsePortalDateTime("2026-03-11", "America/Belize")), true);
});

test("disabled due dates return null and missing runtime policy fails closed", async () => {
  const settings = settingsFor({ dueDate: { dueDateRequired: false } });
  assert.equal(await calculateDueAt({ settings }), null);
  await assert.rejects(calculateDueAt({ settings: null }), /Runtime General Settings/);
});

test("holiday DATE values are normalized without locale-dependent string slicing", async () => {
  assert.equal(normalizeHolidayKey("2026-09-10T00:00:00.000Z"), "2026-09-10");
  assert.equal(normalizeHolidayKey(new Date("2026-09-10T00:00:00.000Z")), "2026-09-10");
  const keys = await getActiveHolidayKeys({ query: async () => [[
    { holiday_key: "2026-09-10" },
    { holiday_date: new Date("2026-11-19T00:00:00.000Z") },
  ]] });
  assert.deepEqual([...keys], ["2026-09-10", "2026-11-19"]);
});
