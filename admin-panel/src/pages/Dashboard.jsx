import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import API from "../services/api";

const overviewCards = [
  {
    key: "total",
    label: "Total Grievances",
    icon: "grievances",
    tone: "navy",
    path: "/grievances",
  },
  {
    key: "new",
    label: "New Grievances",
    icon: "plus",
    tone: "blue",
    path: "/grievances/new",
  },
  {
    key: "under_review",
    label: "Under Review",
    icon: "eye",
    tone: "gold",
    path: "/grievances/under-review",
  },
  {
    key: "unassigned",
    label: "Unassigned",
    icon: "alert",
    tone: "red",
    path: "/grievances/unassigned",
  },
  {
    key: "assigned",
    label: "Assigned",
    icon: "users",
    tone: "violet",
    path: "/grievances/assigned",
  },
  {
    key: "in_progress",
    label: "In Progress",
    icon: "activity",
    tone: "blue",
    path: "/grievances/in-progress",
  },
  {
    key: "pending_information",
    label: "Pending Information",
    icon: "clock",
    tone: "gold",
    path: "/grievances/pending-information",
  },
  {
    key: "resolved",
    label: "Resolved",
    icon: "check",
    tone: "green",
    path: "/grievances/resolved",
  },
  {
    key: "closed",
    label: "Closed",
    icon: "lock",
    tone: "navy",
    path: "/grievances/closed",
  },
  {
    key: "overdue",
    label: "Overdue",
    icon: "clock",
    tone: "red",
    path: "/grievances/overdue",
  },
  {
    key: "high_priority",
    label: "High-Priority Grievances",
    icon: "alert",
    tone: "red",
    path: "/grievances?priority=High",
  },
  {
    key: "due_today",
    label: "Grievances Due Today",
    icon: "clock",
    tone: "gold",
    path: "/grievances/due-today",
  },
];

const palette = [
  "#2086c8",
  "#adc75f",
  "#fdc939",
  "#ed1d75",
  "#8fa63e",
  "#08213f",
  "#5aa6d7",
  "#64727d",
];

const formatNumber = (value) => Number(value || 0).toLocaleString();

const formatGeneratedAt = (value) => {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Belize",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const EmptyChart = ({ message = "No grievance data available yet." }) => (
  <div className="dashboard-chart-empty">
    <Icon name="activity" size={24} />
    <span>{message}</span>
  </div>
);

const DonutChart = ({ data, centerLabel, centerValue }) => {
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);

  if (!total) return <EmptyChart />;

  const segments = data.map((item, index) => {
    const start =
      (data
        .slice(0, index)
        .reduce((sum, entry) => sum + Number(entry.value || 0), 0) /
        total) *
      100;
    const end =
      start + (Number(item.value || 0) / total) * 100;
    return `${palette[index % palette.length]} ${start}% ${end}%`;
  });

  return (
    <div className="dashboard-donut-layout">
      <div
        aria-label={data
          .map((item) => `${item.label}: ${item.value}`)
          .join(", ")}
        className="dashboard-donut"
        role="img"
        style={{ background: `conic-gradient(${segments.join(",")})` }}
      >
        <div>
          <strong>{centerValue ?? formatNumber(total)}</strong>
          <span>{centerLabel}</span>
        </div>
      </div>

      <div className="dashboard-chart-legend">
        {data.map((item, index) => (
          <div key={item.label}>
            <span>
              <i style={{ background: palette[index % palette.length] }} />
              {item.label}
            </span>
            <strong>{formatNumber(item.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
};

const HorizontalBars = ({
  data,
  valueSuffix = "",
  emptyMessage,
  limit,
}) => {
  const visibleData = limit ? data.slice(0, limit) : data;
  const maximum = Math.max(
    0,
    ...visibleData.map((item) => Number(item.value || 0)),
  );

  if (!maximum) return <EmptyChart message={emptyMessage} />;

  return (
    <div className="dashboard-horizontal-bars">
      {visibleData.map((item, index) => (
        <div className="dashboard-horizontal-row" key={item.label}>
          <div>
            <span title={item.label}>{item.label}</span>
            <strong>
              {item.value}
              {valueSuffix}
            </strong>
          </div>
          <span className="dashboard-horizontal-track">
            <i
              style={{
                "--bar-color": palette[index % palette.length],
                "--bar-width": `${Math.max(
                  3,
                  (Number(item.value || 0) / maximum) * 100,
                )}%`,
              }}
            />
          </span>
        </div>
      ))}
    </div>
  );
};

const MonthlyTrendChart = ({ data }) => {
  const width = 760;
  const height = 230;
  const padding = { top: 20, right: 18, bottom: 38, left: 34 };
  const maximum = Math.max(1, ...data.map((item) => Number(item.value || 0)));
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const points = data.map((item, index) => ({
    ...item,
    x:
      padding.left +
      (data.length === 1 ? chartWidth / 2 : (index / (data.length - 1)) * chartWidth),
    y:
      padding.top +
      chartHeight -
      (Number(item.value || 0) / maximum) * chartHeight,
  }));
  const pointString = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaString = `${padding.left},${padding.top + chartHeight} ${pointString} ${
    padding.left + chartWidth
  },${padding.top + chartHeight}`;

  return (
    <div className="dashboard-line-chart">
      <svg
        aria-label={data
          .map((item) => `${item.label}: ${item.value}`)
          .join(", ")}
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding.top + chartHeight * ratio;
          return (
            <line
              className="dashboard-line-grid"
              key={ratio}
              x1={padding.left}
              x2={padding.left + chartWidth}
              y1={y}
              y2={y}
            />
          );
        })}
        <polygon className="dashboard-line-area" points={areaString} />
        <polyline className="dashboard-line-path" points={pointString} />
        {points.map((point) => (
          <g key={point.period}>
            <circle
              className="dashboard-line-point"
              cx={point.x}
              cy={point.y}
              r="4"
            >
              <title>
                {point.label}: {point.value}
              </title>
            </circle>
            <text
              className="dashboard-line-label"
              textAnchor="middle"
              x={point.x}
              y={height - 12}
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

const VerticalBars = ({ data }) => {
  const maximum = Math.max(0, ...data.map((item) => Number(item.value || 0)));

  if (!maximum) return <EmptyChart />;

  return (
    <div className="dashboard-vertical-bars">
      {data.map((item, index) => (
        <div key={item.label}>
          <strong>{formatNumber(item.value)}</strong>
          <span className="dashboard-vertical-track">
            <i
              style={{
                "--bar-color": palette[index % palette.length],
                "--bar-height": `${Math.max(
                  5,
                  (Number(item.value || 0) / maximum) * 100,
                )}%`,
              }}
            />
          </span>
          <small>{item.label}</small>
        </div>
      ))}
    </div>
  );
};

const ChartCard = ({ title, description, children, wide = false }) => (
  <section
    className={`panel dashboard-chart-card ${wide ? "wide" : ""}`}
  >
    <div className="dashboard-chart-header">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
    {children}
  </section>
);

const DashboardSkeleton = () => (
  <div className="dashboard-skeleton" aria-label="Loading dashboard">
    <div className="skeleton skeleton-welcome" />
    <div className="skeleton-grid">
      {Array.from({ length: 12 }, (_, index) => (
        <div className="skeleton skeleton-card" key={index} />
      ))}
    </div>
    <div className="skeleton-content">
      <div className="skeleton skeleton-table" />
      <div className="skeleton skeleton-panel" />
    </div>
  </div>
);

const Dashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const adminUser = useMemo(
    () => JSON.parse(localStorage.getItem("admin_user") || "null"),
    [],
  );

  useEffect(() => {
    let active = true;

    API.get("/dashboard")
      .then((response) => {
        if (active) setDashboard(response.data.data);
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.response?.data?.message ||
              "Failed to load dashboard metrics",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) return <DashboardSkeleton />;

  if (error || !dashboard) {
    return (
      <div className="dashboard-page">
        <section className="panel dashboard-error-state">
          <Icon name="alert" size={28} />
          <h1>Dashboard unavailable</h1>
          <p>{error || "No dashboard data was returned."}</p>
        </section>
      </div>
    );
  }

  const { overview, charts, meta } = dashboard;
  const visibleOverviewCards = overviewCards.filter((card) =>
    Object.prototype.hasOwnProperty.call(overview, card.key),
  );
  const hasVisibleCharts = Object.keys(charts).length > 0;
  const hasVisibleWidgets =
    visibleOverviewCards.length > 0 || hasVisibleCharts;
  const scopeLabel =
    meta.scope === "department"
      ? adminUser?.department_name || "Your department"
      : meta.scope === "none"
        ? "No grievance access"
        : "All departments";

  return (
    <div className="dashboard-page grievance-dashboard">
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">Grievance operations dashboard</p>
          <h1>Welcome back, {adminUser?.name || "Administrator"} (MHD Belize)</h1>
          <p>
            Monitor grievance volume, workload, deadlines, resolution
            performance, and department-level risk.
          </p>
        </div>
        <div className="dashboard-hero-meta">
          <span>
            <Icon name="database" size={15} /> {scopeLabel}
          </span>
          <span>
            <Icon name="clock" size={15} /> Updated{" "}
            {formatGeneratedAt(meta.generated_at)}
          </span>
        </div>
      </section>

      {visibleOverviewCards.length > 0 ? (
        <section
          aria-label="Dashboard overview cards"
          className="dashboard-overview-grid"
        >
          {visibleOverviewCards.map((card) => (
            <Link className="dashboard-kpi-card" key={card.key} to={card.path}>
              <span className={`metric-icon ${card.tone}`}>
                <Icon name={card.icon} size={20} />
              </span>
              <div>
                <span>{card.label}</span>
                <strong>{formatNumber(overview[card.key])}</strong>
              </div>
              <Icon
                className="dashboard-kpi-arrow"
                name="arrowRight"
                size={16}
              />
            </Link>
          ))}
        </section>
      ) : null}

      {hasVisibleCharts ? (
      <section
        aria-label="Grievance dashboard charts"
        className="dashboard-charts-grid"
      >
        {charts.by_status ? (
        <ChartCard
          description="Current grievance workload across workflow stages."
          title="Grievances by status"
        >
          <DonutChart
            centerLabel="grievances"
            data={charts.by_status}
          />
        </ChartCard>
        ) : null}

        {charts.by_department ? (
        <ChartCard
          description="Total assigned workload, including unassigned grievances."
          title="Grievances by department"
        >
          <HorizontalBars
            data={charts.by_department}
            emptyMessage="No department assignments are available yet."
            limit={8}
          />
        </ChartCard>
        ) : null}

        {charts.monthly_trend ? (
        <ChartCard
          description="Grievances submitted during the last 12 months."
          title="Monthly grievance trend"
          wide
        >
          <MonthlyTrendChart data={charts.monthly_trend} />
        </ChartCard>
        ) : null}

        {charts.by_priority ? (
        <ChartCard
          description="Current grievance volume by priority level."
          title="Priority-wise grievance count"
        >
          <VerticalBars data={charts.by_priority} />
        </ChartCard>
        ) : null}

        {charts.open_vs_resolved ? (
        <ChartCard
          description="Open workflow cases compared with resolved and closed cases."
          title="Open vs resolved grievances"
        >
          <DonutChart
            centerLabel="tracked cases"
            data={charts.open_vs_resolved}
          />
        </ChartCard>
        ) : null}

        {charts.average_resolution_time ? (
        <ChartCard
          description={meta.resolution_definition}
          title="Average resolution time"
        >
          <div className="dashboard-resolution-summary">
            <strong>
              {charts.average_resolution_time.average_days === null
                ? "—"
                : `${charts.average_resolution_time.average_days} days`}
            </strong>
            <span>
              Based on {formatNumber(charts.average_resolution_time.sample_size)}{" "}
              resolved grievances
            </span>
          </div>
          <HorizontalBars
            data={charts.average_resolution_time.by_department}
            emptyMessage="Resolution timing will appear after grievances are resolved."
            limit={6}
            valueSuffix="d"
          />
        </ChartCard>
        ) : null}

        {charts.overdue_by_department ? (
        <ChartCard
          description={`Open grievances past their due date. Default rule: ${meta.due_date_rule}.`}
          title="Overdue grievances by department"
        >
          <HorizontalBars
            data={charts.overdue_by_department}
            emptyMessage="No overdue grievances at this time."
            limit={8}
          />
        </ChartCard>
        ) : null}

        {charts.recent_activity ? (
        <ChartCard
          description={`Most recently created or updated grievances in ${meta.dashboard_period || "the configured period"}.`}
          title="Recent activity"
          wide
        >
          {charts.recent_activity.length ? (
            <div className="dashboard-recent-activity">
              {charts.recent_activity.map((item) => (
                <Link key={item.id} to={`/grievances/${item.id}`}>
                  <strong>{item.token_number}</strong>
                  <span>{item.status} · {item.priority} · {item.department}</span>
                  <time>{formatGeneratedAt(item.occurred_at)}</time>
                </Link>
              ))}
            </div>
          ) : <p>No recent grievance activity.</p>}
        </ChartCard>
        ) : null}
      </section>
      ) : null}

      {!hasVisibleWidgets ? (
        <section className="panel dashboard-permission-empty">
          <Icon name="shieldCheck" size={30} />
          <h2>No dashboard widgets assigned</h2>
          <p>
            This role can open the dashboard, but no overview-card or chart
            permissions have been granted.
          </p>
        </section>
      ) : null}
    </div>
  );
};

export default Dashboard;
