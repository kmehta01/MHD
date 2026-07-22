const mysql = require("mysql2/promise");
require("dotenv").config();

const EMAIL_IDENTITY_SETTINGS = Object.freeze([
  ["email.subjectPrefix", "string"],
  ["email.replyToAddress", "email"],
  ["email.footerText", "string"],
]);

const connect = () => mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const seedEmailIdentity = async (connection) => {
  for (const [settingKey, valueType] of EMAIL_IDENTITY_SETTINGS) {
    await connection.query(
      `INSERT INTO system_settings
         (setting_group, setting_key, setting_value, value_type, is_public, is_encrypted)
       VALUES ('email', ?, '', ?, 0, 0)
       ON DUPLICATE KEY UPDATE setting_group='email', value_type=VALUES(value_type),
         is_public=0, is_encrypted=0`,
      [settingKey, valueType],
    );
  }
};

const run = async () => {
  const connection = await connect();
  try {
    await connection.beginTransaction();
    await seedEmailIdentity(connection);
    await connection.commit();
    console.log("Email identity migration completed successfully.");
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
};

if (require.main === module) {
  run().catch((error) => {
    console.error("Email identity migration failed:", error.message);
    process.exit(1);
  });
}

module.exports = { EMAIL_IDENTITY_SETTINGS, run, seedEmailIdentity };
