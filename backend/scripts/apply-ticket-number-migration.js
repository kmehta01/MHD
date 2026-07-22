const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const { getTicketPeriod } = require("../src/utils/ticket-period-helper");
const { generalSettingsDefaults } = require("../src/utils/default-general-settings");
require("dotenv").config();

const migrationPath = path.resolve(__dirname, "../../database/migrations/20260720_create_ticket_number_settings.sql");

const exists = async (connection, type, table, name) => {
  const tableName = type === "COLUMNS" ? "COLUMNS" : "STATISTICS";
  const field = type === "COLUMNS" ? "COLUMN_NAME" : "INDEX_NAME";
  const [rows] = await connection.query(
    `SELECT 1 FROM information_schema.${tableName}
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND ${field} = ? LIMIT 1`,
    [table, name],
  );
  return rows.length > 0;
};

const run = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, multipleStatements: true,
  });
  try {
    await connection.query(fs.readFileSync(migrationPath, "utf8"));
    if (!(await exists(connection, "COLUMNS", "departments", "code"))) {
      await connection.query("ALTER TABLE departments ADD COLUMN code VARCHAR(20) NULL AFTER slug");
    }
    if (!(await exists(connection, "STATISTICS", "departments", "unique_departments_code"))) {
      await connection.query("ALTER TABLE departments ADD UNIQUE KEY unique_departments_code (code)");
    }

    await connection.query("UPDATE complaints SET token_number = CONCAT('LEGACY-', id) WHERE token_number IS NULL OR token_number = ''");
    await connection.query("ALTER TABLE complaints MODIFY token_number VARCHAR(255) NOT NULL");

    const [legacyRows] = await connection.query(
      `SELECT GREATEST(
         COALESCE((SELECT MAX(last_number) FROM complaint_reference_sequences), 0),
         COALESCE((SELECT MAX(CAST(REGEXP_SUBSTR(token_number, '[0-9]+$') AS UNSIGNED)) FROM complaints), 0)
       ) AS current_sequence`,
    );
    const currentSequence = Number(legacyRows[0]?.current_sequence || 0);
    const [timeZoneRows] = await connection.query(
      "SELECT setting_value FROM system_settings WHERE setting_key='portal.timeZone' LIMIT 1",
    );
    const timeZone = String(timeZoneRows[0]?.setting_value || generalSettingsDefaults.portal.timeZone).trim();
    const period = getTicketPeriod({ prefix: "GRM", sequenceReset: "yearly", timeZone });
    const [lastTickets] = await connection.query("SELECT token_number, created_at FROM complaints ORDER BY id DESC LIMIT 1");
    await connection.query(
      `INSERT INTO ticket_sequences
         (sequence_key, current_sequence, period_start, period_end, last_generated_ticket, last_generated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         current_sequence = GREATEST(current_sequence, VALUES(current_sequence)),
         last_generated_ticket = COALESCE(last_generated_ticket, VALUES(last_generated_ticket)),
         last_generated_at = COALESCE(last_generated_at, VALUES(last_generated_at))`,
      [period.key, currentSequence, period.start, period.end, lastTickets[0]?.token_number || null, lastTickets[0]?.created_at || null],
    );
    console.log(`Ticket Number Format migration completed. Active sequence preserved at ${currentSequence}.`);
  } finally {
    await connection.end();
  }
};

run().catch((error) => {
  console.error("Ticket Number Format migration failed:", error.message);
  process.exit(1);
});
