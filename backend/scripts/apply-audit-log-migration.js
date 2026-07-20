const db = require("../src/config/db");

const createAuditTable = async (connection) => {
  const [idColumns] = await connection.query(
    "SHOW COLUMNS FROM admin_users LIKE 'id'",
  );
  const actorIdType = String(idColumns[0]?.Type || "INT UNSIGNED").toUpperCase();

  if (!/^INT(?:\(\d+\))?(?: UNSIGNED)?$/.test(actorIdType)) {
    throw new Error("Unsupported admin_users ID column type");
  }

  await connection.query(`
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      actor_user_id ${actorIdType} NULL,
      actor_name VARCHAR(120) NULL,
      actor_role_slug VARCHAR(100) NULL,
      event_type VARCHAR(100) NOT NULL,
      action VARCHAR(40) NOT NULL,
      resource_type VARCHAR(80) NULL,
      resource_id VARCHAR(100) NULL,
      message VARCHAR(255) NOT NULL,
      success TINYINT(1) NOT NULL DEFAULT 1,
      ip_address VARCHAR(64) NULL,
      user_agent VARCHAR(512) NULL,
      legacy_auth_event_id BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_admin_audit_legacy_auth_event (legacy_auth_event_id),
      KEY index_admin_audit_logs_actor_id (actor_user_id),
      KEY index_admin_audit_logs_type (event_type),
      KEY index_admin_audit_logs_action (action),
      KEY index_admin_audit_logs_resource (resource_type, resource_id),
      KEY index_admin_audit_logs_created_at (created_at),
      CONSTRAINT fk_admin_audit_logs_actor
        FOREIGN KEY (actor_user_id) REFERENCES admin_users (id)
        ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

const tableExists = async (connection, tableName) => {
  const [rows] = await connection.query(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?
     LIMIT 1`,
    [tableName],
  );
  return rows.length > 0;
};

const migrateLegacyEvents = async (connection) => {
  if (!(await tableExists(connection, "admin_auth_events"))) return 0;

  const [result] = await connection.query(`
    INSERT IGNORE INTO admin_audit_logs
      (actor_user_id, actor_name, actor_role_slug, event_type, action,
       resource_type, resource_id, message, success, ip_address, user_agent,
       legacy_auth_event_id, created_at)
    SELECT
      actor.id,
      actor.name,
      actor.role_slug,
      event.event_type,
      CASE
        WHEN event.event_type LIKE 'PASSWORD_LOGIN_%' THEN 'login'
        ELSE 'security'
      END,
      CASE WHEN event.admin_user_id IS NULL THEN NULL ELSE 'admin_user' END,
      CASE WHEN event.admin_user_id IS NULL THEN NULL ELSE CAST(event.admin_user_id AS CHAR) END,
      CONCAT(
        CASE event.event_type
          WHEN 'PASSWORD_LOGIN_FAILED' THEN 'Failed password sign-in'
          WHEN 'PASSWORD_LOGIN_SUCCEEDED' THEN 'Successful password sign-in'
          WHEN 'TWO_FACTOR_LOCKED' THEN 'Locked two-factor verification'
          WHEN 'TWO_FACTOR_CODE_FAILED' THEN 'Failed two-factor verification'
          WHEN 'TWO_FACTOR_DELIVERY_FAILED' THEN 'Failed two-factor code delivery'
          WHEN 'TWO_FACTOR_CODE_SENT' THEN 'Sent two-factor verification code'
          WHEN 'TWO_FACTOR_CODE_RESENT' THEN 'Resent two-factor verification code'
          WHEN 'TWO_FACTOR_VERIFIED' THEN 'Completed two-factor verification'
          WHEN 'TWO_FACTOR_RECOVERY_CODES_ISSUED' THEN 'Issued two-factor recovery codes'
          WHEN 'TWO_FACTOR_RECOVERY_CODE_USED' THEN 'Used a two-factor recovery code'
          WHEN 'TWO_FACTOR_RECOVERY_CODES_RESET' THEN 'Reset recovery codes for admin user'
          ELSE 'Authentication security event'
        END,
        CASE
          WHEN event.admin_user_id IS NULL THEN ''
          ELSE CONCAT(' ID ', event.admin_user_id)
        END
      ),
      event.success,
      event.ip_address,
      event.user_agent,
      event.id,
      event.created_at
    FROM admin_auth_events event
    LEFT JOIN (
      SELECT au.id, au.name, r.slug AS role_slug
      FROM admin_users au
      LEFT JOIN roles r ON r.id = au.role_id
    ) actor ON actor.id = COALESCE(event.actor_user_id, event.admin_user_id)
  `);

  return result.affectedRows;
};

const deprecateDelegablePermission = async (connection) => {
  await connection.query(`
    DELETE rp
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    WHERE p.permission_key = 'audit_logs.view'
  `);
  await connection.query(`
    UPDATE permissions
    SET is_active = 0
    WHERE permission_key = 'audit_logs.view'
  `);
};

const run = async () => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await createAuditTable(connection);
    const migrated = await migrateLegacyEvents(connection);
    await deprecateDelegablePermission(connection);
    await connection.commit();
    console.log(`Audit log migration complete. ${migrated} legacy event(s) copied.`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await db.end();
  }
};

run().catch((error) => {
  console.error("Audit log migration failed:", error.message);
  process.exitCode = 1;
});
