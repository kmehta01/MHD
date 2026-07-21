const assert = require("node:assert/strict");
const test = require("node:test");
const { generalSettingsDefaults } = require("../src/utils/default-general-settings");
const { processDueDates } = require("../src/services/runtime-worker.service");

const clone = (value) => JSON.parse(JSON.stringify(value));

test("automatic overdue policy persists the mark and emits an idempotent event", async () => {
  const settings = clone(generalSettingsDefaults);
  settings.notifications.notifyDueDateReminder = false;
  settings.dueDate.enableEscalation = false;
  const queries = [];
  const events = [];
  const dueAt = new Date("2026-07-01T12:00:00.000Z");
  const query = async (sql, values = []) => {
    queries.push({ sql, values });
    if (sql.includes("public_holidays")) return [[]];
    if (sql.includes("complaint_statuses") && sql.includes("c.id>?")) return [[{ id: 44, due_at: dueAt }]];
    return [{ affectedRows: 1 }];
  };

  await processDueDates(settings, {
    acquire: async () => true,
    enqueue: async (event) => { events.push(event); },
    query,
    now: new Date("2026-07-10T12:00:00.000Z"),
  });

  assert.equal(queries.some(({ sql }) => sql.includes("overdue_at=COALESCE")), true);
  assert.deepEqual(events, [{
    eventType: "overdue",
    complaintId: 44,
    eventKey: `overdue:44:${dueAt.getTime()}`,
  }]);
});

test("worker subtracts and adds configured working days with one holiday load", async () => {
  const settings = clone(generalSettingsDefaults);
  settings.dueDate.dueDateReminderDays = 1;
  settings.dueDate.escalateAfterDays = 1;
  settings.dueDate.automaticallyMarkOverdue = false;
  const dueAt = new Date("2026-03-09T18:00:00.000Z");
  const events = [];
  let holidayLoads = 0;
  const query = async (sql) => {
    if (sql.includes("public_holidays")) { holidayLoads += 1; return [[{ holiday_key: "2026-03-10" }]]; }
    if (sql.includes("complaint_statuses")) return [[{ id: 8, due_at: dueAt }]];
    if (sql.includes("INSERT IGNORE")) return [{ affectedRows: 1 }];
    return [{ affectedRows: 1 }];
  };

  await processDueDates(settings, {
    acquire: async () => true,
    enqueue: async (event) => events.push(event),
    query,
    now: new Date("2026-03-11T18:00:00.000Z"),
  });

  assert.equal(holidayLoads, 1);
  assert.equal(events.some((event) => event.eventKey.startsWith("escalation:8:")), true);
  assert.equal(events.some((event) => event.eventType === "due_reminder"), false);
});

test("disabled due-date policy performs no worker queries", async () => {
  const settings = clone(generalSettingsDefaults);
  settings.dueDate.dueDateRequired = false;
  let queried = false;
  await processDueDates(settings, {
    acquire: async () => true,
    query: async () => { queried = true; return [[]]; },
  });
  assert.equal(queried, false);
});
