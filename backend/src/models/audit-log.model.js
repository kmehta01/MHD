const db = require("../config/db");

const create = async (
  {
    actorUserId = null,
    actorSnapshot = null,
    eventType,
    action,
    resourceType = null,
    resourceId = null,
    message,
    success = true,
    ipAddress = null,
    userAgent = null,
  },
  executor = db,
) => {
  let actor = actorSnapshot;

  if (!actor && actorUserId) {
    const [actors] = await executor.query(
      `SELECT au.id, au.name, r.slug AS role_slug
       FROM admin_users au
       LEFT JOIN roles r ON r.id = au.role_id
       WHERE au.id = ?
       LIMIT 1`,
      [actorUserId],
    );
    actor = actors[0] || null;
  }

  const [result] = await executor.query(
    `INSERT INTO admin_audit_logs
     (actor_user_id, actor_name, actor_role_slug, event_type, action,
      resource_type, resource_id, message, success, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      actor?.id || null,
      actor?.name || null,
      actor?.role_slug || null,
      eventType,
      action,
      resourceType,
      resourceId === null || resourceId === undefined
        ? null
        : String(resourceId),
      message,
      success ? 1 : 0,
      ipAddress,
      userAgent ? String(userAgent).slice(0, 512) : null,
    ],
  );

  return result;
};

const buildFilters = ({
  search,
  action,
  userId,
  dateFrom,
  dateTo,
  scope = { type: "all", actorUserId: null },
}) => {
  const conditions = [];
  const values = [];

  if (scope.type === "limited") {
    conditions.push(
      "(actor_role_slug IS NULL OR actor_role_slug <> 'super-admin')",
    );
  } else if (scope.type === "own") {
    conditions.push("actor_user_id = ?");
    values.push(scope.actorUserId);
  } else if (scope.type === "none") {
    conditions.push("1 = 0");
  }

  if (search) {
    const term = `%${search}%`;
    conditions.push(`(
      message LIKE ? OR actor_name LIKE ? OR ip_address LIKE ? OR
      CAST(actor_user_id AS CHAR) LIKE ? OR resource_id LIKE ?
    )`);
    values.push(term, term, term, term, term);
  }

  if (action) {
    conditions.push("action = ?");
    values.push(action);
  }

  if (userId) {
    conditions.push("actor_user_id = ?");
    values.push(userId);
  }

  if (dateFrom) {
    conditions.push("created_at >= ?");
    values.push(dateFrom);
  }

  if (dateTo) {
    conditions.push("created_at < ?");
    values.push(dateTo);
  }

  return {
    clause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    values,
  };
};

const findAll = async (filters, { limit, offset }) => {
  const { clause, values } = buildFilters(filters);
  const [rows] = await db.query(
    `SELECT id, actor_user_id, actor_name, actor_role_slug, event_type,
            action, resource_type, resource_id, message, success,
            ip_address, user_agent, created_at
     FROM admin_audit_logs
     ${clause}
     ORDER BY created_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset],
  );

  const [counts] = await db.query(
    `SELECT COUNT(*) AS total FROM admin_audit_logs ${clause}`,
    values,
  );

  return { rows, total: Number(counts[0]?.total || 0) };
};

const findForExport = async (filters) => {
  const { clause, values } = buildFilters(filters);
  const [rows] = await db.query(
    `SELECT id, actor_user_id, actor_name, actor_role_slug, event_type,
            action, resource_type, resource_id, message, success,
            ip_address, user_agent, created_at
     FROM admin_audit_logs
     ${clause}
     ORDER BY created_at DESC, id DESC`,
    values,
  );
  return rows;
};

const findActors = async (
  scope = { type: "all", actorUserId: null },
) => {
  const { clause, values } = buildFilters({ scope });
  const [actors] = await db.query(
    `SELECT DISTINCT actor_user_id AS id, actor_name AS name
     FROM admin_audit_logs
     ${clause || "WHERE 1 = 1"}
       AND actor_user_id IS NOT NULL
       AND actor_name IS NOT NULL
     ORDER BY actor_name ASC, actor_user_id ASC`,
    values,
  );
  return actors;
};

module.exports = {
  create,
  findActors,
  findAll,
  findForExport,
};
