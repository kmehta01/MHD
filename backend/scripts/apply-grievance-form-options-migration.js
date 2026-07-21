const path = require("node:path");
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
    const migration = path.resolve(__dirname, "../../database/migrations/20260722_grievance_form_options.sql");
    await connection.query(await readCompatibleMigration(connection, migration));
    console.log("Grievance form options migration completed successfully.");
  } finally { await connection.end(); }
};

run().catch((error) => { console.error("Grievance form options migration failed:", error.message); process.exit(1); });
