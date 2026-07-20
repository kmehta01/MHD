const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config();

const migrationPath = path.resolve(
  __dirname,
  "../../database/migrations/20260720_add_admin_profile_photo.sql",
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
    const sql = fs.readFileSync(migrationPath, "utf8");
    await connection.query(sql);
    console.log("Profile picture migration applied successfully.");
  } finally {
    await connection.end();
  }
};

applyMigration().catch((error) => {
  console.error("Failed to apply profile picture migration.");
  console.error(error.message);
  process.exit(1);
});
