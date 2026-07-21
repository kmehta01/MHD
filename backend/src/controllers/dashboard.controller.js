const DashboardModel = require("../models/dashboard.model");
const {
  DASHBOARD_CARD_PERMISSIONS,
  DASHBOARD_CHART_PERMISSIONS,
} = require("../config/dashboard-permissions");
const { getGrievanceScope } = require("../utils/access-scope");
const { hasPermission } = require("../utils/access-scope");
const SettingsPolicy = require("../services/settings-policy.service");
const { generalSettingsDefaults } = require("../utils/default-general-settings");

const STATUSES = [
  "New",
  "Under Review",
  "In Progress",
  "Pending Information",
  "Resolved",
  "Closed",
  "Rejected",
  "Duplicate",
  "Returned",
];
const PRIORITIES = ["Critical", "High", "Medium", "Low"];

const DASHBOARD_CARD_SETTINGS = {
  total: "showTotalGrievances",
  new: "showNewGrievances",
  unassigned: "showUnassignedGrievances",
  in_progress: "showInProgressGrievances",
  resolved: "showResolvedGrievances",
  overdue: "showOverdueGrievances",
  high_priority: "showHighPriorityCases",
  due_today: "showDueTodayPanel",
};

const DASHBOARD_CHART_SETTINGS = {
  by_status: "showStatusDistributionChart",
  by_department: "showDepartmentProgress",
  monthly_trend: "showMonthlyTrendChart",
  recent_activity: "showRecentActivity",
};

const getBelizeDateParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Belize",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
  };
};

const getDashboardAnchors = (period = "Last 30 Days") => {
  const { year, month, day } = getBelizeDateParts();
  const todayStart = new Date(Date.UTC(year, month - 1, day, 6));
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const trendStart = new Date(Date.UTC(year, month - 12, 1, 6));
  const periodStarts = {
    "Last 7 Days": new Date(todayStart.getTime() - 6 * 86400000),
    "Last 30 Days": new Date(todayStart.getTime() - 29 * 86400000),
    "Current Month": new Date(Date.UTC(year, month - 1, 1, 6)),
    "Current Quarter": new Date(Date.UTC(year, Math.floor((month - 1) / 3) * 3, 1, 6)),
    "Current Year": new Date(Date.UTC(year, 0, 1, 6)),
  };

  return { todayStart, tomorrowStart, trendStart, periodStart: periodStarts[period] || periodStarts["Last 30 Days"] };
};

const toCount = (value) => Number(value || 0);

const fillSeries = (labels, rows) => {
  const values = new Map(
    rows.map((row) => [row.label, toCount(row.value)]),
  );

  return labels.map((label) => ({
    label,
    value: values.get(label) || 0,
  }));
};

const buildMonthlyTrend = (rows) => {
  const values = new Map(
    rows.map((row) => [row.period, toCount(row.value)]),
  );
  const { year, month } = getBelizeDateParts();

  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 12 + index, 1));
    const period = `${date.getUTCFullYear()}-${String(
      date.getUTCMonth() + 1,
    ).padStart(2, "0")}`;

    return {
      period,
      label: new Intl.DateTimeFormat("en-GB", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      }).format(date),
      value: values.get(period) || 0,
    };
  });
};

const filterPermittedWidgets = (user, widgets, permissionMap) =>
  Object.fromEntries(
    Object.entries(widgets).filter(([key]) =>
      hasPermission(user, permissionMap[key]),
    ),
  );

const filterEnabledWidgets = (widgets, settings, map) =>
  Object.fromEntries(Object.entries(widgets).filter(([key]) => map[key] ? settings[map[key]] : true));

const buildDashboardPayload = ({ user, result, scope, settings = generalSettingsDefaults }) => {
  const overview = result.overview;
  const overviewWidgets = {
    total: toCount(overview.total),
    new: toCount(overview.new_count),
    under_review: toCount(overview.under_review),
    unassigned: toCount(overview.unassigned),
    assigned: toCount(overview.assigned),
    in_progress: toCount(overview.in_progress),
    pending_information: toCount(overview.pending_information),
    resolved: toCount(overview.resolved),
    closed: toCount(overview.closed),
    overdue: toCount(overview.overdue),
    high_priority: toCount(overview.high_priority_count),
    due_today: toCount(overview.due_today),
  };
  const chartWidgets = {
    by_status: fillSeries(STATUSES, result.status),
    by_department: result.departments.map((row) => ({
      label: row.label,
      value: toCount(row.value),
    })),
    monthly_trend: buildMonthlyTrend(result.trend),
    by_priority: fillSeries(PRIORITIES, result.priorities),
    open_vs_resolved: [
      {
        label: "Open",
        value: toCount(result.openResolved.open_count),
      },
      {
        label: "Resolved",
        value: toCount(result.openResolved.resolved_count),
      },
    ],
    average_resolution_time: {
      average_days:
        result.resolution.average_days === null
          ? null
          : Number(result.resolution.average_days),
      sample_size: toCount(result.resolution.resolved_samples),
      by_department: result.resolutionByDepartment.map((row) => ({
        label: row.label,
        value: Number(row.value || 0),
        sample_size: toCount(row.sample_size),
      })),
    },
    overdue_by_department: result.overdueByDepartment.map((row) => ({
      label: row.label,
      value: toCount(row.value),
    })),
    recent_activity: (result.recentActivity || []).map((row) => ({
      id: row.id,
      token_number: row.token_number,
      status: row.status,
      priority: row.ticket_priority,
      department: row.department_name,
      occurred_at: row.updated_at || row.created_at,
    })),
  };

  return {
    overview: filterPermittedWidgets(
      user,
      filterEnabledWidgets(overviewWidgets, settings.dashboard, DASHBOARD_CARD_SETTINGS),
      DASHBOARD_CARD_PERMISSIONS,
    ),
    charts: filterPermittedWidgets(
      user,
      filterEnabledWidgets(chartWidgets, settings.dashboard, DASHBOARD_CHART_SETTINGS),
      DASHBOARD_CHART_PERMISSIONS,
    ),
    meta: {
      scope: scope.type,
      department_id: scope.departmentId,
      generated_at: new Date().toISOString(),
      dashboard_period: settings.portal.defaultDashboardPeriod,
      due_date_rule: settings.dueDate.dueDateRequired
        ? `${settings.dueDate.defaultResolutionDays} ${settings.dueDate.countWorkingDaysOnly ? "working" : "calendar"} days from submission`
        : "No automatic due date",
      resolution_definition:
        "Resolved or closed grievances with a recorded resolution timestamp",
    },
  };
};

const getDashboard = async (req, res) => {
  try {
    const [scope, settings] = [getGrievanceScope(req.user), await SettingsPolicy.getPolicy()];
    const result = await DashboardModel.getDashboardData({
      scope,
      ...getDashboardAnchors(settings.portal.defaultDashboardPeriod),
    });

    return res.json({
      status: true,
      message: "Dashboard metrics fetched successfully",
      data: buildDashboardPayload({ user: req.user, result, scope, settings }),
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to fetch dashboard metrics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  buildDashboardPayload,
  buildMonthlyTrend,
  fillSeries,
  getDashboard,
  getDashboardAnchors,
};
