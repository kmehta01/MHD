const path = require("path");
const mysql = require("mysql2/promise");
const { readCompatibleMigration } = require("../src/utils/migration-sql");
require("dotenv").config();

const migrationPath = path.resolve(
  __dirname,
  "../../database/migrations/20260615_add_admin_email_two_factor.sql",
);

const applyMigration = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  try {
    const sql = await readCompatibleMigration(connection, migrationPath);
    await connection.query(sql);
    console.log("Two-factor authentication migration applied successfully.");
  } finally {
    await connection.end();
  }
};

applyMigration().catch((error) => {
  console.error("Failed to apply two-factor authentication migration.");
  console.error(error.message);
  process.exit(1);
});
