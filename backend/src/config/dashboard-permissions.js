const DASHBOARD_CARD_PERMISSIONS = {
  total: "dashboard.cards.total",
  new: "dashboard.cards.new",
  under_review: "dashboard.cards.under_review",
  unassigned: "dashboard.cards.unassigned",
  assigned: "dashboard.cards.assigned",
  in_progress: "dashboard.cards.in_progress",
  pending_information: "dashboard.cards.pending_information",
  resolved: "dashboard.cards.resolved",
  closed: "dashboard.cards.closed",
  overdue: "dashboard.cards.overdue",
  high_priority: "dashboard.cards.high_priority",
  due_today: "dashboard.cards.due_today",
};

const DASHBOARD_CHART_PERMISSIONS = {
  by_status: "dashboard.charts.by_status",
  by_department: "dashboard.charts.by_department",
  monthly_trend: "dashboard.charts.monthly_trend",
  by_priority: "dashboard.charts.by_priority",
  open_vs_resolved: "dashboard.charts.open_vs_resolved",
  average_resolution_time: "dashboard.charts.average_resolution_time",
  overdue_by_department: "dashboard.charts.overdue_by_department",
};

const DASHBOARD_WIDGET_PERMISSIONS = [
  ...Object.values(DASHBOARD_CARD_PERMISSIONS),
  ...Object.values(DASHBOARD_CHART_PERMISSIONS),
];

module.exports = {
  DASHBOARD_CARD_PERMISSIONS,
  DASHBOARD_CHART_PERMISSIONS,
  DASHBOARD_WIDGET_PERMISSIONS,
};
