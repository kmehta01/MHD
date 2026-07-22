const db = require("../src/config/db");

const dashboardWidgetPermissions = [
  ["dashboard_cards", "view_total", "dashboard.cards.total", "View Total Grievances card"],
  ["dashboard_cards", "view_new", "dashboard.cards.new", "View New Grievances card"],
  [
    "dashboard_cards",
    "view_under_review",
    "dashboard.cards.under_review",
    "View Under Review card",
  ],
  [
    "dashboard_cards",
    "view_unassigned",
    "dashboard.cards.unassigned",
    "View Unassigned card",
  ],
  ["dashboard_cards", "view_assigned", "dashboard.cards.assigned", "View Assigned card"],
  [
    "dashboard_cards",
    "view_in_progress",
    "dashboard.cards.in_progress",
    "View In Progress card",
  ],
  [
    "dashboard_cards",
    "view_pending_information",
    "dashboard.cards.pending_information",
    "View Pending Information card",
  ],
  ["dashboard_cards", "view_resolved", "dashboard.cards.resolved", "View Resolved card"],
  ["dashboard_cards", "view_closed", "dashboard.cards.closed", "View Closed card"],
  ["dashboard_cards", "view_overdue", "dashboard.cards.overdue", "View Overdue card"],
  [
    "dashboard_cards",
    "view_high_priority",
    "dashboard.cards.high_priority",
    "View High-Priority Grievances card",
  ],
  [
    "dashboard_cards",
    "view_due_today",
    "dashboard.cards.due_today",
    "View Grievances Due Today card",
  ],
  [
    "dashboard_charts",
    "view_by_status",
    "dashboard.charts.by_status",
    "View Grievances by status chart",
  ],
  [
    "dashboard_charts",
    "view_by_department",
    "dashboard.charts.by_department",
    "View Grievances by department chart",
  ],
  [
    "dashboard_charts",
    "view_monthly_trend",
    "dashboard.charts.monthly_trend",
    "View Monthly grievance trend chart",
  ],
  [
    "dashboard_charts",
    "view_by_priority",
    "dashboard.charts.by_priority",
    "View Priority-wise grievance count chart",
  ],
  [
    "dashboard_charts",
    "view_open_vs_resolved",
    "dashboard.charts.open_vs_resolved",
    "View Open vs resolved grievances chart",
  ],
  [
    "dashboard_charts",
    "view_average_resolution_time",
    "dashboard.charts.average_resolution_time",
    "View Average resolution time chart",
  ],
  [
    "dashboard_charts",
    "view_overdue_by_department",
    "dashboard.charts.overdue_by_department",
    "View Overdue grievances by department chart",
  ],
  [
    "dashboard_activity",
    "view_recent",
    "dashboard.activity.recent",
    "View Recent grievance activity",
  ],
];
const dashboardWidgetPermissionKeys = dashboardWidgetPermissions.map(
  (permission) => permission[2],
);

const permissions = [
  ["dashboard", "view", "dashboard.view", "View admin dashboard"],
  ...dashboardWidgetPermissions,
  ["grievances", "view_all", "grievances.view_all", "View all grievances"],
  [
    "grievances",
    "view_department",
    "grievances.view_department",
    "View grievances assigned to the user department",
  ],
  [
    "grievances",
    "review_new",
    "grievances.review_new",
    "Review newly submitted grievances",
  ],
  ["grievances", "assign", "grievances.assign", "Assign grievances"],
  ["grievances", "reassign", "grievances.reassign", "Reassign grievances"],
  [
    "grievances",
    "request_reassignment",
    "grievances.request_reassignment",
    "Request grievance reassignment",
  ],
  [
    "grievances",
    "update_status",
    "grievances.update_status",
    "Update grievance status",
  ],
  [
    "grievances",
    "add_notes",
    "grievances.add_notes",
    "Add grievance processing notes",
  ],
  [
    "grievances",
    "submit_resolution",
    "grievances.submit_resolution",
    "Submit grievance resolution",
  ],
  [
    "grievances",
    "approve_resolution",
    "grievances.approve_resolution",
    "Approve grievance resolution",
  ],
  ["grievances", "close", "grievances.close", "Close grievances"],
  ["departments", "view", "departments.view", "View departments"],
  [
    "departments",
    "manage",
    "departments.manage",
    "Manage all department configuration",
  ],
  [
    "departments",
    "manage_limited",
    "departments.manage_limited",
    "Manage limited department configuration",
  ],
  ["users", "view", "users.view", "View administrator users"],
  ["users", "create", "users.create", "Create administrator users"],
  ["users", "update", "users.update", "Update administrator users"],
  ["users", "delete", "users.delete", "Delete administrator users"],
  ["users", "manage", "users.manage", "Manage all administrator users"],
  [
    "users",
    "manage_limited",
    "users.manage_limited",
    "Manage Ministry User accounts only",
  ],
  ["roles", "view", "roles.view", "View roles and permissions"],
  ["roles", "create", "roles.create", "Create custom roles"],
  ["roles", "update", "roles.update", "Update role permissions"],
  ["settings", "view", "settings.view", "View website settings"],
  ["settings", "update", "settings.update", "Change system settings"],
  ["settings_general", "view", "settings.general.view", "View General Settings"],
  ["settings_general", "update", "settings.general.update", "Update General Settings"],
  ["settings_general", "reset", "settings.general.reset", "Restore default General Settings"],
  ["settings_general", "history", "settings.general.history", "View General Settings change history"],
  ["settings_ticket_number", "view", "settings.ticket_number.view", "View Ticket Number Format settings"],
  ["settings_ticket_number", "update", "settings.ticket_number.update", "Update Ticket Number Format settings"],
  ["settings_ticket_number", "reset", "settings.ticket_number.reset", "Reset the active ticket sequence"],
  ["settings_ticket_number", "history", "settings.ticket_number.history", "View Ticket Number Format history"],
  ["reports", "view_all", "reports.view_all", "View all reports"],
  [
    "reports",
    "view_operational",
    "reports.view_operational",
    "View operational reports",
  ],
  [
    "reports",
    "view_department",
    "reports.view_department",
    "View reports for the assigned department",
  ],
  ["audit_logs", "view_all", "audit_logs.view_all", "View all audit logs"],
  [
    "audit_logs",
    "view_limited",
    "audit_logs.view_limited",
    "View audit logs excluding Super Admin activity",
  ],
  [
    "audit_logs",
    "view_own",
    "audit_logs.view_own",
    "View own audit activity",
  ],
  ["audit_logs", "export", "audit_logs.export", "Export audit logs"],
];

const rolePermissions = {
  admin: [
    "dashboard.view",
    ...dashboardWidgetPermissionKeys,
    "grievances.view_all",
    "grievances.view_department",
    "grievances.review_new",
    "grievances.assign",
    "grievances.reassign",
    "grievances.update_status",
    "grievances.add_notes",
    "grievances.submit_resolution",
    "grievances.approve_resolution",
    "grievances.close",
    "departments.view",
    "departments.manage_limited",
    "users.view",
    "users.create",
    "users.update",
    "users.delete",
    "users.manage_limited",
    "settings.general.view",
    "settings.ticket_number.view",
    "reports.view_operational",
    "audit_logs.view_limited",
  ],
  "ministry-user": [
    "dashboard.view",
    ...dashboardWidgetPermissionKeys,
    "grievances.view_department",
    "grievances.request_reassignment",
    "grievances.update_status",
    "grievances.add_notes",
    "grievances.submit_resolution",
    "reports.view_department",
    "audit_logs.view_own",
  ],
};

const exists = async (connection, query, values) => {
  const [rows] = await connection.query(query, values);
  return rows.length > 0;
};

const ensureColumn = async (connection, table, column, definition) => {
  const present = await exists(
    connection,
    `SELECT 1
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [table, column],
  );

  if (!present) {
    await connection.query(
      `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`,
    );
  }
};

const ensureIndex = async (connection, table, index, definition) => {
  const present = await exists(
    connection,
    `SELECT 1
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?
     LIMIT 1`,
    [table, index],
  );

  if (!present) {
    await connection.query(
      `ALTER TABLE \`${table}\` ADD ${definition}`,
    );
  }
};

const ensureForeignKey = async (connection, table, constraint, definition) => {
  const present = await exists(
    connection,
    `SELECT 1
     FROM information_schema.TABLE_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND CONSTRAINT_NAME = ?
       AND CONSTRAINT_TYPE = 'FOREIGN KEY'
     LIMIT 1`,
    [table, constraint],
  );

  if (!present) {
    await connection.query(
      `ALTER TABLE \`${table}\` ADD CONSTRAINT \`${constraint}\` ${definition}`,
    );
  }
};

const assignPermissions = async (connection, roleSlug, permissionKeys) => {
  const [roles] = await connection.query(
    "SELECT id FROM roles WHERE slug = ? LIMIT 1",
    [roleSlug],
  );
  const roleId = roles[0]?.id;
  if (!roleId) throw new Error(`Role ${roleSlug} was not created`);

  await connection.query("DELETE FROM role_permissions WHERE role_id = ?", [
    roleId,
  ]);

  if (permissionKeys === "all") {
    await connection.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       SELECT ?, id FROM permissions WHERE is_active = 1`,
      [roleId],
    );
    return;
  }

  await connection.query(
    `INSERT INTO role_permissions (role_id, permission_id)
     SELECT ?, id
     FROM permissions
     WHERE permission_key IN (?)`,
    [roleId, permissionKeys],
  );
};

const assignDefaultPermissionsIfEmpty = async (
  connection,
  roleSlug,
  permissionKeys,
) => {
  const [roles] = await connection.query(
    `SELECT r.id, COUNT(rp.permission_id) AS permission_count
     FROM roles r
     LEFT JOIN role_permissions rp ON rp.role_id = r.id
     WHERE r.slug = ?
     GROUP BY r.id
     LIMIT 1`,
    [roleSlug],
  );

  if (!roles[0]) throw new Error(`Role ${roleSlug} was not created`);

  if (Number(roles[0].permission_count) === 0) {
    await assignPermissions(connection, roleSlug, permissionKeys);
  }
};

const applyDashboardWidgetPermissionMigration = async (connection) => {
  const migrationKey = "2026-07-16-dashboard-widget-permissions-v2";

  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      migration_key VARCHAR(190) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [applied] = await connection.query(
    `SELECT 1
     FROM schema_migrations
     WHERE migration_key = ?
     LIMIT 1`,
    [migrationKey],
  );

  if (applied.length) return;

  await connection.query(
    `INSERT IGNORE INTO role_permissions (role_id, permission_id)
     SELECT dashboard_access.role_id, p.id
     FROM role_permissions dashboard_access
     JOIN permissions dashboard_permission
       ON dashboard_permission.id = dashboard_access.permission_id
      AND dashboard_permission.permission_key = 'dashboard.view'
      AND dashboard_permission.is_active = 1
     JOIN permissions p
       ON p.permission_key IN (?)
      AND p.is_active = 1`,
    [dashboardWidgetPermissionKeys],
  );

  await connection.query(
    `INSERT INTO schema_migrations (migration_key) VALUES (?)`,
    [migrationKey],
  );
};

const run = async () => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(160) NOT NULL,
        slug VARCHAR(160) NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_departments_name (name),
        UNIQUE KEY unique_departments_slug (slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await ensureColumn(
      connection,
      "admin_users",
      "department_id",
      "INT UNSIGNED NULL AFTER role_id",
    );
    await ensureIndex(
      connection,
      "admin_users",
      "index_admin_users_department_id",
      "KEY index_admin_users_department_id (department_id)",
    );
    await ensureForeignKey(
      connection,
      "admin_users",
      "fk_admin_users_department",
      "FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE SET NULL",
    );

    await ensureColumn(
      connection,
      "complaints",
      "assigned_department_id",
      "INT UNSIGNED NULL AFTER token_number",
    );
    await ensureIndex(
      connection,
      "complaints",
      "index_complaints_assigned_department",
      "KEY index_complaints_assigned_department (assigned_department_id)",
    );
    await ensureForeignKey(
      connection,
      "complaints",
      "fk_complaints_assigned_department",
      "FOREIGN KEY (assigned_department_id) REFERENCES departments (id) ON DELETE SET NULL",
    );

    await connection.query(
      `INSERT INTO roles (name, slug, is_active)
       VALUES
         ('Super Admin', 'super-admin', 1),
         ('Admin', 'admin', 1),
         ('Ministry User', 'ministry-user', 1)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         is_active = 1`,
    );

    for (const [module, action, key, description] of permissions) {
      await connection.query(
        `INSERT INTO permissions
           (module, action, permission_key, description, is_active)
         VALUES (?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE
           module = VALUES(module),
           action = VALUES(action),
           description = VALUES(description),
           is_active = 1`,
        [module, action, key, description],
      );
    }

    await connection.query(
      `UPDATE permissions
       SET is_active = 0
       WHERE permission_key = 'grievances.view'`,
    );

    await assignDefaultPermissionsIfEmpty(
      connection,
      "admin",
      rolePermissions.admin,
    );
    await assignDefaultPermissionsIfEmpty(
      connection,
      "ministry-user",
      rolePermissions["ministry-user"],
    );
    await applyDashboardWidgetPermissionMigration(connection);
    await assignPermissions(connection, "super-admin", "all");

    await connection.commit();
    console.log("Role and permission migration complete.");
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await db.end();
  }
};

run().catch((error) => {
  console.error("Role and permission migration failed:", error.message);
  process.exitCode = 1;
});
