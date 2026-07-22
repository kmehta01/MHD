const path = require("node:path");
const mysql = require("mysql2/promise");
const { ensureForeignKeys, readCompatibleMigration } = require("../src/utils/migration-sql");
require("dotenv").config();

const complaintForeignKeys = [
  ["fk_complaints_status", "complaints", "status_id", "complaint_statuses", "id"],
  ["fk_complaints_priority", "complaints", "priority_id", "complaint_priorities", "id"],
  ["fk_complaints_category", "complaints", "category_id", "complaint_categories", "id"],
  ["fk_complaints_location", "complaints", "location_id", "complaint_locations", "id"],
  ["fk_complaints_submitted_department", "complaints", "submitted_department_id", "departments", "id"],
  ["fk_complaints_assigned_department", "complaints", "assigned_department_id", "departments", "id"],
  ["fk_complaints_intake_classification", "complaints", "office_initial_classification_id", "complaint_intake_classifications", "id"],
];

const run = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });
  try {
    const migrationPath = path.resolve(
      __dirname,
      "../../database/migrations/20260728_schema_contract_repair.sql",
    );
    await connection.query(await readCompatibleMigration(connection, migrationPath));
    await ensureForeignKeys(connection, complaintForeignKeys);

    const [[contract]] = await connection.query(`SELECT
      (SELECT COUNT(*) FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='complaints'
          AND COLUMN_NAME='resolution_summary') AS resolution_summary,
      (SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='complaints'
          AND CONSTRAINT_NAME IN
            ('fk_complaints_status','fk_complaints_priority','fk_complaints_category',
             'fk_complaints_location','fk_complaints_submitted_department',
             'fk_complaints_assigned_department','fk_complaints_intake_classification')) AS complaint_foreign_keys`);
    if (Number(contract.resolution_summary) !== 1 || Number(contract.complaint_foreign_keys) !== 7) {
      throw new Error(`Schema contract repair validation failed: ${JSON.stringify(contract)}`);
    }
    console.log("Schema contract repair migration completed successfully.");
  } finally {
    await connection.end();
  }
};

run().catch((error) => {
  console.error("Schema contract repair migration failed:", error.message);
  process.exit(1);
});

