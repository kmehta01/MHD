const db = require("../config/db");

const OPEN_STATUSES = [
  "New",
  "Under Review",
  "In Progress",
  "Pending Information",
];
const RESOLVED_STATUSES = ["Resolved", "Closed"];
const FINAL_STATUSES = ["Resolved", "Closed", "Rejected", "Duplicate"];

const getScopeFilter = (scope, alias = "c", periodStart = null) => {
  const periodClause = periodStart ? `${alias}.created_at >= ?` : null;
  const withPeriod = (clause, values) => ({
    clause: periodClause ? `(${clause}) AND ${periodClause}` : clause,
    values: periodStart ? [...values, periodStart] : values,
  });
  if (scope.type === "department") {
    return withPeriod(`${alias}.assigned_department_id = ?`, [scope.departmentId]);
  }

  if (scope.type === "none") {
    return withPeriod("1 = 0", []);
  }

  return withPeriod("1 = 1", []);
};

const getDashboardData = async ({
  scope,
  todayStart,
  tomorrowStart,
  trendStart,
  periodStart,
}) => {
  const { clause, values } = getScopeFilter(scope, "c", periodStart);

  const [
    [overviewRows],
    [statusRows],
    [departmentRows],
    [trendRows],
    [priorityRows],
    [openResolvedRows],
    [resolutionRows],
    [resolutionDepartmentRows],
    [overdueDepartmentRows],
    [recentActivityRows],
  ] = await Promise.all([
    db.query(
      `SELECT
         COUNT(*) AS total,
         SUM(c.status = 'New') AS new_count,
         SUM(c.status = 'Under Review') AS under_review,
         SUM(c.assigned_department_id IS NULL) AS unassigned,
         SUM(c.assigned_department_id IS NOT NULL) AS assigned,
         SUM(c.status = 'In Progress') AS in_progress,
         SUM(c.status = 'Pending Information') AS pending_information,
         SUM(c.status = 'Resolved') AS resolved,
         SUM(c.status = 'Closed') AS closed,
         SUM(
           c.due_at < ?
           AND c.status NOT IN (?)
         ) AS overdue,
         SUM(c.ticket_priority IN ('Critical', 'High')) AS high_priority_count,
         SUM(
           c.due_at >= ?
           AND c.due_at < ?
           AND c.status NOT IN (?)
         ) AS due_today
       FROM complaints c
       WHERE ${clause}`,
      [
        todayStart,
        FINAL_STATUSES,
        todayStart,
        tomorrowStart,
        FINAL_STATUSES,
        ...values,
      ],
    ),
    db.query(
      `SELECT c.status AS label, COUNT(*) AS value
       FROM complaints c
       WHERE ${clause}
       GROUP BY c.status
       ORDER BY c.status`,
      values,
    ),
    db.query(
      `SELECT
         COALESCE(d.name, 'Unassigned') AS label,
         COUNT(*) AS value
       FROM complaints c
       LEFT JOIN departments d ON d.id = c.assigned_department_id
       WHERE ${clause}
       GROUP BY c.assigned_department_id, d.name
       ORDER BY value DESC, label ASC`,
      values,
    ),
    db.query(
      `SELECT
         DATE_FORMAT(c.created_at, '%Y-%m') AS period,
         COUNT(*) AS value
       FROM complaints c
       WHERE ${clause}
         AND c.created_at >= ?
       GROUP BY DATE_FORMAT(c.created_at, '%Y-%m')
       ORDER BY period ASC`,
      [...values, trendStart],
    ),
    db.query(
      `SELECT c.ticket_priority AS label, COUNT(*) AS value
       FROM complaints c
       WHERE ${clause}
       GROUP BY c.ticket_priority
       ORDER BY FIELD(c.ticket_priority, 'Critical', 'High', 'Medium', 'Low')`,
      values,
    ),
    db.query(
      `SELECT
         SUM(c.status IN (?)) AS open_count,
         SUM(c.status IN (?)) AS resolved_count
       FROM complaints c
       WHERE ${clause}`,
      [OPEN_STATUSES, RESOLVED_STATUSES, ...values],
    ),
    db.query(
      `SELECT
         ROUND(
           AVG(TIMESTAMPDIFF(MINUTE, c.created_at, c.resolved_at)) / 1440,
           1
         ) AS average_days,
         COUNT(*) AS resolved_samples
       FROM complaints c
       WHERE ${clause}
         AND c.status IN (?)
         AND c.resolved_at IS NOT NULL`,
      [...values, RESOLVED_STATUSES],
    ),
    db.query(
      `SELECT
         COALESCE(d.name, 'Unassigned') AS label,
         ROUND(
           AVG(TIMESTAMPDIFF(MINUTE, c.created_at, c.resolved_at)) / 1440,
           1
         ) AS value,
         COUNT(*) AS sample_size
       FROM complaints c
       LEFT JOIN departments d ON d.id = c.assigned_department_id
       WHERE ${clause}
         AND c.status IN (?)
         AND c.resolved_at IS NOT NULL
       GROUP BY c.assigned_department_id, d.name
       ORDER BY value DESC, label ASC`,
      [...values, RESOLVED_STATUSES],
    ),
    db.query(
      `SELECT
         COALESCE(d.name, 'Unassigned') AS label,
         COUNT(*) AS value
       FROM complaints c
       LEFT JOIN departments d ON d.id = c.assigned_department_id
       WHERE ${clause}
         AND c.due_at < ?
         AND c.status NOT IN (?)
       GROUP BY c.assigned_department_id, d.name
       ORDER BY value DESC, label ASC`,
      [...values, todayStart, FINAL_STATUSES],
    ),
    db.query(
      `SELECT c.id, c.token_number, c.status, c.ticket_priority,
              c.updated_at, c.created_at,
              COALESCE(d.name, 'Unassigned') AS department_name
       FROM complaints c
       LEFT JOIN departments d ON d.id = c.assigned_department_id
       WHERE ${clause}
       ORDER BY COALESCE(c.updated_at, c.created_at) DESC, c.id DESC
       LIMIT 10`,
      values,
    ),
  ]);

  return {
    overview: overviewRows[0] || {},
    status: statusRows,
    departments: departmentRows,
    trend: trendRows,
    priorities: priorityRows,
    openResolved: openResolvedRows[0] || {},
    resolution: resolutionRows[0] || {},
    resolutionByDepartment: resolutionDepartmentRows,
    overdueByDepartment: overdueDepartmentRows,
    recentActivity: recentActivityRows,
  };
};

module.exports = {
  FINAL_STATUSES,
  OPEN_STATUSES,
  RESOLVED_STATUSES,
  getDashboardData,
  getScopeFilter,
};
