const mysql = require("mysql2/promise");
const {
  DEFAULT_RESOLUTION_ATTACHMENT_TYPES,
} = require("../src/config/attachment-types");
require("dotenv").config();

const connect = () => mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const copySetting = async (connection, { sourceKey, targetKey, valueType, fallback }) => {
  await connection.query(
    `INSERT IGNORE INTO system_settings
       (setting_group, setting_key, setting_value, value_type, is_public, is_encrypted, created_by, updated_by)
     SELECT 'workflow', ?, setting_value, ?, 0, 0, created_by, updated_by
       FROM system_settings WHERE setting_key=? LIMIT 1`,
    [targetKey, valueType, sourceKey],
  );
  await connection.query(
    `INSERT IGNORE INTO system_settings
       (setting_group, setting_key, setting_value, value_type, is_public, is_encrypted)
     VALUES ('workflow', ?, ?, ?, 0, 0)`,
    [targetKey, fallback, valueType],
  );
};

const run = async () => {
  const connection = await connect();
  try {
    await connection.beginTransaction();
    await copySetting(connection, {
      sourceKey: "grievanceSubmission.maximumAttachmentSizeMb",
      targetKey: "workflow.resolutionDocumentMaximumSizeMb",
      valueType: "number",
      fallback: "5",
    });
    await copySetting(connection, {
      sourceKey: "grievanceSubmission.allowedFileTypes",
      targetKey: "workflow.resolutionDocumentAllowedFileTypes",
      valueType: "json",
      fallback: JSON.stringify(DEFAULT_RESOLUTION_ATTACHMENT_TYPES),
    });
    await connection.commit();
    console.log("Attachment policy migration completed successfully.");
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
};

if (require.main === module) {
  run().catch((error) => {
    console.error("Attachment policy migration failed:", error.message);
    process.exit(1);
  });
}

module.exports = { copySetting, run };
