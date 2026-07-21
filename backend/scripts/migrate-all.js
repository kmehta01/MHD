const path = require("node:path");
const { spawnSync } = require("node:child_process");
const mysql = require("mysql2/promise");
require("dotenv").config();

const migrations = [
  ["20260720-role-permissions", "apply-role-permissions-migration.js"],
  ["20260615-two-factor", "apply-two-factor-migration.js"],
  ["20260720-complaints-foundation", "apply-complaints-migration.js"],
  ["20260720-audit-logs", "apply-audit-log-migration.js"],
  ["20260720-profile-photo", "apply-profile-photo-migration.js"],
  ["20260720-general-settings", "apply-general-settings-migration.js"],
  ["20260720-ticket-number", "apply-ticket-number-migration.js"],
  ["20260720-runtime-settings", "apply-runtime-settings-migration.js"],
  ["20260720-grievance-lifecycle", "apply-grievance-lifecycle-migration.js"],
  ["20260720-operational-runtime", "apply-operational-runtime-migration.js"],
  ["20260721-master-data", "apply-master-data-migration.js"],
];
const requiredRuntimeTables = [
  "admin_audit_logs", "admin_auth_events", "admin_sessions",
  "admin_two_factor_challenges", "admin_two_factor_recovery_codes",
  "system_settings", "system_setting_logs", "ticket_number_settings", "ticket_sequences",
  "complaint_statuses", "complaint_priorities", "complaint_categories", "complaint_locations",
  "department_category_mappings", "workflow_transitions", "complaint_status_history",
  "complaint_assignment_history", "assignment_routing_rules", "public_holidays",
  "notification_outbox", "background_job_leases", "report_jobs",
];

const connect = () => mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const ensureHistory = async (connection) => connection.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    migration_key VARCHAR(190) PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`);

const run = async () => {
  const connection = await connect();
  try {
    await ensureHistory(connection);
    const [baseTables] = await connection.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('roles','admin_users','permissions','complaints')`,
    );
    if (baseTables.length !== 4) throw new Error("The base database.sql schema must be installed before incremental migrations");

    for (const [key, script] of migrations) {
      const [applied] = await connection.query(`SELECT 1 FROM schema_migrations WHERE migration_key=? LIMIT 1`, [key]);
      if (applied.length) {
        console.log(`SKIP ${key} (already recorded)`);
        continue;
      }
      console.log(`RUN  ${key}`);
      const result = spawnSync(process.execPath, [path.join(__dirname, script)], {
        cwd: path.resolve(__dirname, ".."), stdio: "inherit", env: process.env,
      });
      if (result.error) throw result.error;
      if (result.status !== 0) throw new Error(`${key} failed with exit code ${result.status}`);
      await connection.query(`INSERT INTO schema_migrations (migration_key) VALUES (?)`, [key]);
    }

    const [[health]] = await connection.query(`
      SELECT
        (SELECT COUNT(*) FROM departments WHERE code IS NULL OR code='') AS missing_department_codes,
        (SELECT COUNT(*) FROM complaints WHERE status_id IS NULL OR priority_id IS NULL OR category_id IS NULL) AS complaints_missing_master_ids,
        (SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS
          WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='complaints'
            AND CONSTRAINT_NAME IN ('fk_complaints_status','fk_complaints_priority','fk_complaints_category',
              'fk_complaints_location','fk_complaints_submitted_department','fk_complaints_assigned_department')) AS master_foreign_keys
    `);
    const [runtimeTables] = await connection.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (?)`,
      [requiredRuntimeTables],
    );
    const presentTables = new Set(runtimeTables.map((row) => row.TABLE_NAME));
    const missingTables = requiredRuntimeTables.filter((table) => !presentTables.has(table));
    if (missingTables.length || Number(health.missing_department_codes) || Number(health.complaints_missing_master_ids) || Number(health.master_foreign_keys) !== 6) {
      health.missing_runtime_tables = missingTables;
      throw new Error(`Post-migration database validation failed: ${JSON.stringify(health)}`);
    }
    console.log("All database migrations completed and validation passed.");
  } finally { await connection.end(); }
};

run().catch((error) => {
  console.error("Database migration sequence failed:", error.message);
  process.exit(1);
});
