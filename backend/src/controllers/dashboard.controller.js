const DashboardModel = require("../models/dashboard.model");
const {
  DASHBOARD_CARD_PERMISSIONS,
  DASHBOARD_CHART_PERMISSIONS,
} = require("../config/dashboard-permissions");
const { getGrievanceScope } = require("../utils/access-scope");
const { hasPermission } = require("../utils/access-scope");
const SettingsPolicy = require("../services/settings-policy.service");
const { generalSettingsDefaults } = require("../utils/default-general-settings");
const { getZonedParts, zonedPartsToDate } = require("../services/due-date.service");

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

const plainDate = (year, monthIndex, day) => {
  const date = new Date(Date.UTC(year, monthIndex, day));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
};

const zonedStart = (parts, timeZone) => zonedPartsToDate({
  ...parts, hour: 0, minute: 0, second: 0,
}, timeZone);

const getDashboardAnchors = (period = "Last 30 Days", timeZone = "America/Belize", now = new Date()) => {
  const { year, month, day } = getZonedParts(now, timeZone);
  const todayStart = zonedStart({ year, month, day }, timeZone);
  const tomorrowStart = zonedStart(plainDate(year, month - 1, day + 1), timeZone);
  const trendStart = zonedStart(plainDate(year, month - 12, 1), timeZone);
  const periodStarts = {
    "Last 7 Days": zonedStart(plainDate(year, month - 1, day - 6), timeZone),
    "Last 30 Days": zonedStart(plainDate(year, month - 1, day - 29), timeZone),
    "Current Month": zonedStart({ year, month, day: 1 }, timeZone),
    "Current Quarter": zonedStart({ year, month: Math.floor((month - 1) / 3) * 3 + 1, day: 1 }, timeZone),
    "Current Year": zonedStart({ year, month: 1, day: 1 }, timeZone),
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

const fillMasterSeries = (masters, rows, keyName) => {
  if (!masters.length) return rows.map((row) => ({ label: row.label, value: toCount(row.value) }));
  const values = new Map(rows.map((row) => [row.master_key, toCount(row.value)]));
  return masters.filter((item) => item.is_active).map((item) => ({
    key: item[keyName], label: item.name, value: values.get(item[keyName]) || 0,
  }));
};

const buildMonthlyTrend = (rows, timeZone = "America/Belize", now = new Date()) => {
  const values = new Map(
    rows.map((row) => [row.period, toCount(row.value)]),
  );
  const { year, month } = getZonedParts(now, timeZone);

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

const buildDashboardPayload = ({ user, result, scope, workflow = { statuses: [], priorities: [] }, settings = generalSettingsDefaults }) => {
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
    by_status: fillMasterSeries(workflow.statuses, result.status, "status_key"),
    by_department: result.departments.map((row) => ({
      label: row.label,
      value: toCount(row.value),
    })),
    monthly_trend: buildMonthlyTrend(result.trend, settings.portal.timeZone),
    by_priority: fillMasterSeries(workflow.priorities, result.priorities, "priority_key"),
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
      status_key: row.status_key,
      priority_key: row.priority_key,
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
      time_zone: settings.portal.timeZone,
      date_format: settings.portal.dateFormat,
      time_format: settings.portal.timeFormat,
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
    const ConfigurationModel = require("../models/configuration.model");
    const [settings, workflow] = await Promise.all([SettingsPolicy.getPolicy(), ConfigurationModel.listWorkflow()]);
    const scope = getGrievanceScope(req.user);
    const result = await DashboardModel.getDashboardData({
      scope,
      ...getDashboardAnchors(settings.portal.defaultDashboardPeriod, settings.portal.timeZone),
    });

    return res.json({
      status: true,
      message: "Dashboard metrics fetched successfully",
      data: buildDashboardPayload({ user: req.user, result, scope, workflow, settings }),
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
  fillMasterSeries,
  getDashboard,
  getDashboardAnchors,
};
