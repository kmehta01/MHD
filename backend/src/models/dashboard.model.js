const db = require("../config/db");

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
         SUM(s.status_key = 'new') AS new_count,
         SUM(s.status_key = 'under_review') AS under_review,
         SUM(c.assigned_department_id IS NULL) AS unassigned,
         SUM(c.assigned_department_id IS NOT NULL) AS assigned,
         SUM(s.status_key = 'in_progress') AS in_progress,
         SUM(s.status_key = 'pending_information') AS pending_information,
         SUM(s.reporting_group = 'resolved') AS resolved,
         SUM(s.reporting_group = 'closed') AS closed,
         SUM(
           c.due_at < ?
           AND s.reporting_group = 'open'
         ) AS overdue,
         SUM(p.is_high_priority = 1) AS high_priority_count,
         SUM(
           c.due_at >= ?
           AND c.due_at < ?
           AND s.reporting_group = 'open'
         ) AS due_today
       FROM complaints c
       JOIN complaint_statuses s ON s.id=c.status_id
       JOIN complaint_priorities p ON p.id=c.priority_id
       WHERE ${clause}`,
      [
        todayStart,
        todayStart,
        tomorrowStart,
        ...values,
      ],
    ),
    db.query(
      `SELECT s.status_key AS master_key, s.name AS label, COUNT(*) AS value
       FROM complaints c JOIN complaint_statuses s ON s.id=c.status_id
       WHERE ${clause}
       GROUP BY s.id, s.status_key, s.name, s.sort_order
       ORDER BY s.sort_order, s.id`,
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
      `SELECT p.priority_key AS master_key, p.name AS label, COUNT(*) AS value
       FROM complaints c JOIN complaint_priorities p ON p.id=c.priority_id
       WHERE ${clause}
       GROUP BY p.id, p.priority_key, p.name, p.sort_order
       ORDER BY p.sort_order, p.id`,
      values,
    ),
    db.query(
      `SELECT
         SUM(s.reporting_group = 'open') AS open_count,
         SUM(s.reporting_group IN ('resolved','closed')) AS resolved_count
       FROM complaints c JOIN complaint_statuses s ON s.id=c.status_id
       WHERE ${clause}`,
      values,
    ),
    db.query(
      `SELECT
         ROUND(
           AVG(TIMESTAMPDIFF(MINUTE, c.created_at, c.resolved_at)) / 1440,
           1
         ) AS average_days,
         COUNT(*) AS resolved_samples
       FROM complaints c JOIN complaint_statuses s ON s.id=c.status_id
       WHERE ${clause}
         AND s.reporting_group IN ('resolved','closed')
         AND c.resolved_at IS NOT NULL`,
      values,
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
       JOIN complaint_statuses s ON s.id=c.status_id
       WHERE ${clause}
         AND s.reporting_group IN ('resolved','closed')
         AND c.resolved_at IS NOT NULL
       GROUP BY c.assigned_department_id, d.name
       ORDER BY value DESC, label ASC`,
      values,
    ),
    db.query(
      `SELECT
         COALESCE(d.name, 'Unassigned') AS label,
         COUNT(*) AS value
       FROM complaints c
       LEFT JOIN departments d ON d.id = c.assigned_department_id
       JOIN complaint_statuses s ON s.id=c.status_id
       WHERE ${clause}
         AND c.due_at < ?
         AND s.reporting_group = 'open'
       GROUP BY c.assigned_department_id, d.name
       ORDER BY value DESC, label ASC`,
      [...values, todayStart],
    ),
    db.query(
      `SELECT c.id, c.token_number, s.status_key, s.name AS status, p.priority_key, p.name AS ticket_priority,
              c.updated_at, c.created_at,
              COALESCE(d.name, 'Unassigned') AS department_name
       FROM complaints c
       LEFT JOIN departments d ON d.id = c.assigned_department_id
       JOIN complaint_statuses s ON s.id=c.status_id
       JOIN complaint_priorities p ON p.id=c.priority_id
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
  getDashboardData,
  getScopeFilter,
};
