const dashboardItems = [
  ["showTotalGrievances", "Total", "1,248"],
  ["showNewGrievances", "New", "36"],
  ["showUnassignedGrievances", "Unassigned", "12"],
  ["showInProgressGrievances", "In Progress", "184"],
  ["showResolvedGrievances", "Resolved", "906"],
  ["showOverdueGrievances", "Overdue", "18"],
];

const DashboardPreview = ({ settings }) => (
  <div className="settings-dashboard-preview">
    <div className="settings-preview-heading"><strong>Dashboard preview</strong><span>Live layout sample</span></div>
    <div className="settings-preview-cards">
      {dashboardItems.filter(([key]) => settings[key]).map(([key, label, value]) => (
        <div key={key}><span>{label}</span><strong>{value}</strong></div>
      ))}
      {!dashboardItems.some(([key]) => settings[key]) ? <p>No summary cards selected.</p> : null}
    </div>
    <div className="settings-preview-panels">
      {settings.showStatusDistributionChart ? <div className="preview-chart"><span>Status distribution</span><i /><i /><i /><i /></div> : null}
      {settings.showMonthlyTrendChart ? <div className="preview-trend"><span>Monthly trend</span><svg viewBox="0 0 180 55"><path d="M2 48 35 38 68 43 102 19 137 29 178 5" /></svg></div> : null}
    </div>
  </div>
);

export default DashboardPreview;
