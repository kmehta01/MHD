const db = require("../config/db");

const findGeneralSettings = async (executor = db) => {
  const [rows] = await executor.query(
    `SELECT id, setting_group, setting_key, setting_value, value_type,
            is_public, is_encrypted, created_by, updated_by, created_at, updated_at
     FROM system_settings
     WHERE setting_group IN (
       'organization', 'portal', 'grievanceSubmission', 'ticket', 'assignment',
       'dueDate', 'workflow', 'notifications', 'security', 'privacy',
       'dashboard', 'reports', 'footer'
     )
     ORDER BY setting_group, setting_key`,
  );
  return rows;
};

const findSettingForUpdate = async (settingKey, executor) => {
  const [rows] = await executor.query(
    `SELECT id, setting_group, setting_key, setting_value, value_type, is_encrypted
     FROM system_settings
     WHERE setting_key = ?
     LIMIT 1
     FOR UPDATE`,
    [settingKey],
  );
  return rows[0] || null;
};

const createSetting = async (setting, userId, executor) => {
  const [result] = await executor.query(
    `INSERT INTO system_settings
       (setting_group, setting_key, setting_value, value_type, is_public,
        is_encrypted, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      setting.group,
      setting.settingKey,
      setting.serializedValue,
      setting.valueType,
      setting.isPublic ? 1 : 0,
      setting.isEncrypted ? 1 : 0,
      userId || null,
      userId || null,
    ],
  );
  return result.insertId;
};

const updateSetting = async (settingId, setting, userId, executor) => {
  await executor.query(
    `UPDATE system_settings
     SET setting_value = ?, value_type = ?, is_public = ?, is_encrypted = ?,
         updated_by = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      setting.serializedValue,
      setting.valueType,
      setting.isPublic ? 1 : 0,
      setting.isEncrypted ? 1 : 0,
      userId,
      settingId,
    ],
  );
};

const createSettingLog = async (change, requestContext, executor) => {
  await executor.query(
    `INSERT INTO system_setting_logs
       (setting_id, setting_key, old_value, new_value, changed_by,
        change_reason, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      change.settingId,
      change.settingKey,
      change.oldValue,
      change.newValue,
      requestContext.userId,
      requestContext.reason || null,
      requestContext.ipAddress || null,
      requestContext.userAgent || null,
    ],
  );
};

const findGeneralSettingsHistory = async ({ limit = 100, offset = 0 } = {}) => {
  const [rows] = await db.query(
    `SELECT ssl.id, ssl.setting_id, ssl.setting_key, ssl.old_value,
            ssl.new_value, ssl.changed_by, ssl.change_reason,
            ssl.ip_address, ssl.user_agent, ssl.created_at,
            au.name AS changed_by_name, ss.is_encrypted
     FROM system_setting_logs ssl
     LEFT JOIN admin_users au ON au.id = ssl.changed_by
     LEFT JOIN system_settings ss ON ss.id = ssl.setting_id
     ORDER BY ssl.created_at DESC, ssl.id DESC
     LIMIT ? OFFSET ?`,
    [Number(limit), Number(offset)],
  );
  return rows;
};

const findLastGeneralSettingsUpdate = async () => {
  const [rows] = await db.query(
    `SELECT ss.updated_at, ss.updated_by, au.name AS updated_by_name
     FROM system_settings ss
     LEFT JOIN admin_users au ON au.id = ss.updated_by
     WHERE ss.setting_group IN (
       'organization', 'portal', 'grievanceSubmission', 'ticket', 'assignment',
       'dueDate', 'workflow', 'notifications', 'security', 'privacy',
       'dashboard', 'reports', 'footer'
     )
     ORDER BY ss.updated_at DESC, ss.id DESC
     LIMIT 1`,
  );
  return rows[0] || null;
};

const withTransaction = async (operation) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const result = await operation(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  createSetting,
  createSettingLog,
  findGeneralSettings,
  findGeneralSettingsHistory,
  findLastGeneralSettingsUpdate,
  findSettingForUpdate,
  updateSetting,
  withTransaction,
};
