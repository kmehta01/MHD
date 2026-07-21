const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const { seedGeneralSettings } = require("../src/services/settings.service");
require("dotenv").config();

const run = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });
  try {
    await connection.beginTransaction();
    const migration = path.resolve(__dirname, "../../database/migrations/20260720_runtime_general_settings.sql");
    await connection.query(fs.readFileSync(migration, "utf8"));
    await seedGeneralSettings(connection);
    await connection.commit();
    console.log("Runtime General Settings migration completed successfully.");
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
};

run().catch((error) => {
  console.error("Runtime General Settings migration failed:", error.message);
  process.exit(1);
});
