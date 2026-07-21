const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config();

const run = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, multipleStatements: true,
  });
  try {
    const migration = path.resolve(__dirname, "../../database/migrations/20260720_operational_runtime.sql");
    await connection.query(fs.readFileSync(migration, "utf8"));
    console.log("Operational runtime migration completed successfully.");
  } finally { await connection.end(); }
};

run().catch((error) => { console.error("Operational runtime migration failed:", error.message); process.exit(1); });
