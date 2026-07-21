const mysql = require("mysql2/promise");
const { createPolicyCalendar } = require("../src/services/due-date.service");
const {
  generalSettingsDefinitionMap,
  generalSettingsDefaults,
} = require("../src/utils/default-general-settings");
require("dotenv").config();

const clone = (value) => JSON.parse(JSON.stringify(value));

const deserialize = (value, type, fallback) => {
  if (value === null || value === undefined) return fallback;
  if (type === "boolean") return value === "1" || value === "true";
  if (type === "number") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  if (type === "json") {
    try { return JSON.parse(value); } catch { return fallback; }
  }
  return String(value);
};

const loadRuntimeSettings = async (connection) => {
  const settings = clone(generalSettingsDefaults);
  const [rows] = await connection.query(
    `SELECT setting_key, setting_value, value_type
     FROM system_settings
     WHERE setting_group IN ('dueDate', 'portal')`,
  );
  for (const row of rows) {
    const definition = generalSettingsDefinitionMap.get(row.setting_key);
    if (!definition) continue;
    settings[definition.group][definition.key] = deserialize(
      row.setting_value,
      row.value_type,
      definition.defaultValue,
    );
  }
  return settings;
};

const backfillNullOpenDueDates = async (connection, settings, batchSize = 250) => {
  if (!settings.dueDate.dueDateRequired) return 0;
  const calendar = await createPolicyCalendar({ settings, executor: connection });
  let cursor = 0;
  let updated = 0;
  while (true) {
    const [rows] = await connection.query(
      `SELECT c.id, COALESCE(c.office_received_at, c.created_at) AS due_start_at
       FROM complaints c
       JOIN complaint_statuses s ON s.id=c.status_id
       WHERE c.due_at IS NULL AND s.reporting_group='open' AND c.id>?
       ORDER BY c.id
       LIMIT ?`,
      [cursor, batchSize],
    );
    if (!rows.length) break;
    for (const complaint of rows) {
      const dueAt = calendar.calculateDueAt(complaint.due_start_at);
      const [result] = await connection.query(
        `UPDATE complaints SET due_at=? WHERE id=? AND due_at IS NULL`,
        [dueAt, complaint.id],
      );
      updated += result.affectedRows;
    }
    cursor = Number(rows[rows.length - 1].id);
    if (rows.length < batchSize) break;
  }
  return updated;
};

const connect = () => mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  timezone: process.env.DB_TIMEZONE || "Z",
});

const run = async () => {
  const connection = await connect();
  try {
    const settings = await loadRuntimeSettings(connection);
    const count = await backfillNullOpenDueDates(connection, settings);
    console.log(`Due-date policy migration completed successfully (${count} null due date${count === 1 ? "" : "s"} backfilled).`);
  } finally {
    await connection.end();
  }
};

if (require.main === module) {
  run().catch((error) => {
    console.error("Due-date policy migration failed:", error.message);
    process.exit(1);
  });
}

module.exports = { backfillNullOpenDueDates, loadRuntimeSettings, run };
