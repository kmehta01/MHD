const path = require("path");
const mysql = require("mysql2/promise");
const { readCompatibleMigration } = require("../src/utils/migration-sql");
require("dotenv").config();

const run = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    multipleStatements: true,
  });
  try {
    const migrationPath = path.resolve(__dirname, "../../database/migrations/20260720_grievance_lifecycle.sql");
    await connection.query(await readCompatibleMigration(connection, migrationPath));
    console.log("Grievance lifecycle migration completed successfully.");
  } finally {
    await connection.end();
  }
};
run().catch((error) => { console.error("Grievance lifecycle migration failed:", error.message); process.exit(1); });
