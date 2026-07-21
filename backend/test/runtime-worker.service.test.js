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
    if (sql.includes("complaint_statuses") && sql.includes("due_at<NOW()")) return [[{ id: 44, due_at: dueAt }]];
    return [{ affectedRows: 1 }];
  };

  await processDueDates(settings, {
    acquire: async () => true,
    enqueue: async (event) => { events.push(event); },
    query,
  });

  assert.equal(queries.some(({ sql }) => sql.includes("overdue_at=COALESCE")), true);
  assert.deepEqual(events, [{
    eventType: "overdue",
    complaintId: 44,
    eventKey: "overdue:44:2026-07-01",
  }]);
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
