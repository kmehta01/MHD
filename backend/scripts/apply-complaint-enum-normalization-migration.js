const path = require("node:path");
const mysql = require("mysql2/promise");
const { ensureForeignKeys, readCompatibleMigration } = require("../src/utils/migration-sql");
require("dotenv").config();

const connect = () => mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
});

const run = async () => {
  const connection = await connect();
  try {
    const migrationPath = path.resolve(__dirname, "../../database/migrations/20260727_complaint_enum_normalization.sql");
    await connection.query(await readCompatibleMigration(connection, migrationPath));
    await ensureForeignKeys(connection, [[
      "fk_complaints_intake_classification", "complaints", "office_initial_classification_id",
      "complaint_intake_classifications", "id",
    ]]);

    const [[health]] = await connection.query(`SELECT
      SUM(status_id IS NULL) AS missing_status,
      SUM(priority_id IS NULL) AS missing_priority
      FROM complaints`);
    if (Number(health.missing_status) || Number(health.missing_priority)) {
      throw new Error(`Cannot require complaint master IDs while legacy rows remain unmapped: ${JSON.stringify(health)}`);
    }
    const [masterTypes] = await connection.query(
      `SELECT TABLE_NAME, COLUMN_TYPE FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA=DATABASE() AND COLUMN_NAME='id'
          AND TABLE_NAME IN ('complaint_statuses','complaint_priorities')`,
    );
    const integerType = (table) => {
      const type = String(masterTypes.find((row) => row.TABLE_NAME === table)?.COLUMN_TYPE || "");
      if (!/^(?:tinyint|smallint|mediumint|int|bigint)(?:\(\d+\))?(?: unsigned)?$/i.test(type)) {
        throw new Error(`Unsupported master ID type for ${table}`);
      }
      return type.toUpperCase();
    };
    await connection.query(`ALTER TABLE complaints
      MODIFY COLUMN status_id ${integerType("complaint_statuses")} NOT NULL,
      MODIFY COLUMN priority_id ${integerType("complaint_priorities")} NOT NULL`);
    console.log("Complaint ENUM normalization completed successfully.");
  } finally {
    await connection.end();
  }
};

run().catch((error) => {
  console.error("Complaint ENUM normalization failed:", error.message);
  process.exit(1);
});
