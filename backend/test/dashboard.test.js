const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildDashboardPayload,
  buildMonthlyTrend,
  fillSeries,
  getDashboardAnchors,
} = require("../src/controllers/dashboard.controller");
const { getScopeFilter } = require("../src/models/dashboard.model");

test("dashboard fills missing status and priority values with zero", () => {
  assert.deepEqual(
    fillSeries(
      ["New", "Resolved", "Closed"],
      [
        { label: "New", value: 4 },
        { label: "Closed", value: "2" },
      ],
    ),
    [
      { label: "New", value: 4 },
      { label: "Resolved", value: 0 },
      { label: "Closed", value: 2 },
    ],
  );
});

test("dashboard trend always contains the latest 12 Belize calendar months", () => {
  const trend = buildMonthlyTrend([]);

  assert.equal(trend.length, 12);
  assert.equal(trend.every((item) => item.value === 0), true);
  assert.match(trend[0].period, /^\d{4}-\d{2}$/);
  assert.match(trend[11].period, /^\d{4}-\d{2}$/);
});

test("dashboard trend maps database values into the matching month", () => {
  const baseline = buildMonthlyTrend([]);
  const target = baseline[5];
  const trend = buildMonthlyTrend([
    { period: target.period, value: "7" },
  ]);

  assert.equal(trend[5].value, 7);
  assert.equal(
    trend.filter((item) => item.value !== 0).length,
    1,
  );
});

test("dashboard scope filter restricts ministry users to their department", () => {
  assert.deepEqual(
    getScopeFilter({ type: "department", departmentId: 14 }),
    {
      clause: "c.assigned_department_id = ?",
      values: [14],
    },
  );
  assert.deepEqual(getScopeFilter({ type: "none" }), {
    clause: "1 = 0",
    values: [],
  });
});

test("dashboard Belize date anchors define one full local calendar day", () => {
  const { todayStart, tomorrowStart, trendStart } = getDashboardAnchors();

  assert.equal(
    tomorrowStart.getTime() - todayStart.getTime(),
    24 * 60 * 60 * 1000,
  );
  assert.equal(todayStart.getUTCHours(), 6);
  assert.equal(trendStart.getUTCDate(), 1);
  assert.equal(trendStart.getUTCHours(), 6);
});

test("dashboard anchors honor configured time zones and daylight-saving boundaries", () => {
  const { todayStart, tomorrowStart } = getDashboardAnchors(
    "Last 30 Days",
    "America/New_York",
    new Date("2026-03-08T12:00:00.000Z"),
  );

  assert.equal(todayStart.toISOString(), "2026-03-08T05:00:00.000Z");
  assert.equal(tomorrowStart.toISOString(), "2026-03-09T04:00:00.000Z");
});

test("dashboard payload only includes widgets granted to the role", () => {
  const payload = buildDashboardPayload({
    user: {
      role_slug: "admin",
      permissions: [
        "dashboard.view",
        "dashboard.cards.total",
        "dashboard.cards.overdue",
        "dashboard.charts.by_status",
      ],
    },
    scope: { type: "all", departmentId: null },
    result: {
      overview: {
        total: 12,
        new_count: 4,
        under_review: 2,
        unassigned: 1,
        assigned: 11,
        in_progress: 3,
        pending_information: 1,
        resolved: 5,
        closed: 2,
        overdue: 3,
        high_priority_count: 4,
        due_today: 2,
      },
      status: [{ label: "New", value: 4 }],
      departments: [{ label: "Human Services", value: 7 }],
      trend: [],
      priorities: [{ label: "High", value: 4 }],
      openResolved: { open_count: 7, resolved_count: 5 },
      resolution: { average_days: 3.5, resolved_samples: 5 },
      resolutionByDepartment: [],
      overdueByDepartment: [],
    },
  });

  assert.deepEqual(payload.overview, {
    total: 12,
    overdue: 3,
  });
  assert.deepEqual(Object.keys(payload.charts), ["by_status"]);
  assert.equal(payload.charts.by_status[0].label, "New");
  assert.equal("new" in payload.overview, false);
  assert.equal("by_department" in payload.charts, false);
});

test("Super Admin receives every dashboard widget", () => {
  const payload = buildDashboardPayload({
    user: { role_slug: "super-admin", permissions: [] },
    scope: { type: "all", departmentId: null },
    result: {
      overview: {},
      status: [],
      departments: [],
      trend: [],
      priorities: [],
      openResolved: {},
      resolution: { average_days: null, resolved_samples: 0 },
      resolutionByDepartment: [],
      overdueByDepartment: [],
    },
  });

  assert.equal(Object.keys(payload.overview).length, 12);
  assert.equal(Object.keys(payload.charts).length, 8);
});
