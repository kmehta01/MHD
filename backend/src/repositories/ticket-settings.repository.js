const db = require("../config/db");

const selectFields = `id, auto_generate, ticket_prefix, ticket_format, \`separator\`,
  letter_case, include_year, year_format, include_month, include_day,
  include_department_code, include_location_code, include_category_code,
  sequence_length, starting_sequence, sequence_reset, sequence_padding,
  updated_by, created_at, updated_at`;

const findSettings = async (executor = db, { forUpdate = false } = {}) => {
  const [rows] = await executor.query(
    `SELECT ${selectFields}
     FROM ticket_number_settings
     WHERE id = 1
     LIMIT 1${forUpdate ? " FOR UPDATE" : ""}`,
  );
  return rows[0] || null;
};

const updateSettings = async (settings, userId, executor) => {
  await executor.query(
    `UPDATE ticket_number_settings SET
       auto_generate = ?, ticket_prefix = ?, ticket_format = ?, \`separator\` = ?,
       letter_case = ?, include_year = ?, year_format = ?, include_month = ?,
       include_day = ?, include_department_code = ?, include_location_code = ?,
       include_category_code = ?, sequence_length = ?, starting_sequence = ?,
       sequence_reset = ?, sequence_padding = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = 1`,
    [
      settings.autoGenerate ? 1 : 0, settings.ticketPrefix, settings.ticketFormat,
      settings.separator, settings.letterCase, settings.includeYear ? 1 : 0,
      settings.yearFormat, settings.includeMonth ? 1 : 0, settings.includeDay ? 1 : 0,
      settings.includeDepartmentCode ? 1 : 0, settings.includeLocationCode ? 1 : 0,
      settings.includeCategoryCode ? 1 : 0, settings.sequenceLength,
      settings.startingSequence, settings.sequenceReset, settings.sequencePadding ? 1 : 0,
      userId,
    ],
  );
};

const createLog = async (change, context, executor) => {
  await executor.query(
    `INSERT INTO ticket_number_setting_logs
       (setting_key, old_value, new_value, changed_by, change_type,
        reason, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [change.key, change.oldValue, change.newValue, context.userId, change.type,
      context.reason || null, context.ipAddress || null, context.userAgent || null],
  );
};

const findHistory = async (filters = {}) => {
  const conditions = [];
  const values = [];
  if (filters.dateFrom) { conditions.push("logs.created_at >= ?"); values.push(`${filters.dateFrom} 00:00:00`); }
  if (filters.dateTo) { conditions.push("logs.created_at < DATE_ADD(?, INTERVAL 1 DAY)"); values.push(filters.dateTo); }
  if (filters.changedBy) { conditions.push("logs.changed_by = ?"); values.push(filters.changedBy); }
  if (filters.changeType) { conditions.push("logs.change_type = ?"); values.push(filters.changeType); }
  if (filters.settingKey) { conditions.push("logs.setting_key = ?"); values.push(filters.settingKey); }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [rows] = await db.query(
    `SELECT logs.id, logs.setting_key, logs.old_value, logs.new_value,
            logs.changed_by, logs.change_type, logs.reason, logs.ip_address,
            logs.user_agent, logs.created_at, users.name AS changed_by_name
     FROM ticket_number_setting_logs logs
     LEFT JOIN admin_users users ON users.id = logs.changed_by
     ${where}
     ORDER BY logs.created_at DESC, logs.id DESC
     LIMIT ? OFFSET ?`,
    [...values, filters.limit, filters.offset],
  );
  return rows;
};

const countHistory = async (filters = {}) => {
  const conditions = [];
  const values = [];
  if (filters.dateFrom) { conditions.push("created_at >= ?"); values.push(`${filters.dateFrom} 00:00:00`); }
  if (filters.dateTo) { conditions.push("created_at < DATE_ADD(?, INTERVAL 1 DAY)"); values.push(filters.dateTo); }
  if (filters.changedBy) { conditions.push("changed_by = ?"); values.push(filters.changedBy); }
  if (filters.changeType) { conditions.push("change_type = ?"); values.push(filters.changeType); }
  if (filters.settingKey) { conditions.push("setting_key = ?"); values.push(filters.settingKey); }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total FROM ticket_number_setting_logs ${where}`,
    values,
  );
  return Number(rows[0]?.total || 0);
};

module.exports = { countHistory, createLog, findHistory, findSettings, updateSettings };
