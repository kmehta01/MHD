const path = require("path");
const mysql = require("mysql2/promise");
const { readCompatibleMigration, ensureForeignKeys } = require("../src/utils/migration-sql");
require("dotenv").config();

const complaintForeignKeys = [
  ["fk_complaints_status", "complaints", "status_id", "complaint_statuses", "id"],
  ["fk_complaints_priority", "complaints", "priority_id", "complaint_priorities", "id"],
  ["fk_complaints_category", "complaints", "category_id", "complaint_categories", "id"],
  ["fk_complaints_location", "complaints", "location_id", "complaint_locations", "id"],
  ["fk_complaints_submitted_department", "complaints", "submitted_department_id", "departments", "id"],
  ["fk_complaints_assigned_department", "complaints", "assigned_department_id", "departments", "id"],
];

const run = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    multipleStatements: true,
  });
  try {
    const migrationPath = path.resolve(__dirname, "../../database/migrations/20260721_master_data_runtime.sql");
    await connection.query(await readCompatibleMigration(connection, migrationPath));
    await ensureForeignKeys(connection, complaintForeignKeys);
    console.log("Master-data runtime migration completed successfully.");
  } finally { await connection.end(); }
};

run().catch((error) => { console.error("Master-data runtime migration failed:", error.message); process.exit(1); });
