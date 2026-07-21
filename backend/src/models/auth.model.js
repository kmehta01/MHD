const db = require("../config/db");

const findAdminByEmail = async (email) => {
  const [users] = await db.query(
    `SELECT
      au.id,
      au.name,
      au.email,
      au.profile_photo,
      au.password,
      au.status,
      au.failed_login_attempts,
      au.locked_until,
      au.password_changed_at,
      au.must_change_password,
      au.department_id,
      d.name AS department_name,
      r.id AS role_id,
      r.name AS role_name,
      r.slug AS role_slug,
      r.is_active AS role_is_active
    FROM admin_users au
    LEFT JOIN roles r ON r.id = au.role_id
    LEFT JOIN departments d ON d.id = au.department_id
    WHERE au.email = ?
    LIMIT 1`,
    [email],
  );

  return users[0] || null;
};

const getActivePermissionsByRoleId = async (roleId) => {
  const [permissions] = await db.query(
    `SELECT
      p.permission_key
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    WHERE rp.role_id = ?
    AND p.is_active = 1`,
    [roleId],
  );

  return permissions;
};

const findSessionUserById = async (userId) => {
  const [users] = await db.query(
    `SELECT
      au.id,
      au.name,
      au.email,
      au.phone,
      au.profile_photo,
      au.status,
      au.last_login,
      au.password_changed_at,
      au.must_change_password,
      au.created_at,
      au.department_id,
      d.name AS department_name,
      r.id AS role_id,
      r.name AS role_name,
      r.slug AS role_slug,
      r.is_active AS role_is_active
    FROM admin_users au
    LEFT JOIN roles r ON r.id = au.role_id
    LEFT JOIN departments d ON d.id = au.department_id
    WHERE au.id = ?
    LIMIT 1`,
    [userId],
  );

  return users[0] || null;
};

const findPasswordById = async (userId, executor = db) => {
  const [users] = await executor.query(
    `SELECT id, password
     FROM admin_users
     WHERE id = ?
     LIMIT 1`,
    [userId],
  );

  return users[0] || null;
};

const updateProfile = async (
  userId,
  { name, email, phone },
  executor = db,
) => {
  const [result] = await executor.query(
    `UPDATE admin_users
     SET name = ?, email = ?, phone = ?, updated_at = NOW()
     WHERE id = ?`,
    [name, email, phone, userId],
  );

  return result;
};

const updatePassword = async (userId, password, executor = db) => {
  const [result] = await executor.query(
    `UPDATE admin_users
     SET password = ?, password_changed_at = NOW(), must_change_password = 0,
         failed_login_attempts = 0, locked_until = NULL, updated_at = NOW()
     WHERE id = ?`,
    [password, userId],
  );

  return result;
};

const recordFailedLogin = async (userId, maximumAttempts, lockMinutes) => {
  await db.query(
    `UPDATE admin_users
     SET failed_login_attempts = failed_login_attempts + 1,
         locked_until = CASE
           WHEN failed_login_attempts + 1 >= ? THEN DATE_ADD(NOW(), INTERVAL ? MINUTE)
           ELSE locked_until
         END
     WHERE id = ?`,
    [maximumAttempts, lockMinutes, userId],
  );
};

const clearFailedLogins = async (userId) => {
  await db.query(
    `UPDATE admin_users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?`,
    [userId],
  );
};

const createAdminSession = async ({ sessionToken, userId, twoFactorVerified, ipAddress, userAgent, expiresAt }) => {
  await db.query(
    `INSERT INTO admin_sessions
       (session_token, admin_user_id, two_factor_verified, ip_address, user_agent, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [sessionToken, userId, twoFactorVerified ? 1 : 0, ipAddress, userAgent, expiresAt],
  );
};

const findActiveAdminSession = async (sessionToken, userId) => {
  const [rows] = await db.query(
    `SELECT id, session_token, admin_user_id, two_factor_verified,
            last_activity_at, expires_at, revoked_at
     FROM admin_sessions
     WHERE session_token = ? AND admin_user_id = ?
     LIMIT 1`,
    [sessionToken, userId],
  );
  return rows[0] || null;
};

const touchAdminSession = async (sessionToken) =>
  db.query(`UPDATE admin_sessions SET last_activity_at = NOW() WHERE session_token = ?`, [sessionToken]);

const revokeAdminSession = async (sessionToken, reason = "logout") =>
  db.query(
    `UPDATE admin_sessions SET revoked_at = COALESCE(revoked_at, NOW()), revoke_reason = ? WHERE session_token = ?`,
    [reason, sessionToken],
  );

const revokeOtherAdminSessions = async (userId, keepSessionToken = null, reason = "concurrent_login") =>
  db.query(
    `UPDATE admin_sessions
     SET revoked_at = COALESCE(revoked_at, NOW()), revoke_reason = ?
     WHERE admin_user_id = ? AND revoked_at IS NULL
       AND (? IS NULL OR session_token <> ?)`,
    [reason, userId, keepSessionToken, keepSessionToken],
  );

const revokeAllAdminSessions = async (userId, reason = "password_change") =>
  db.query(
    `UPDATE admin_sessions SET revoked_at = COALESCE(revoked_at, NOW()), revoke_reason = ?
     WHERE admin_user_id = ? AND revoked_at IS NULL`,
    [reason, userId],
  );

const updateProfilePhoto = async (userId, profilePhoto, executor = db) => {
  const [result] = await executor.query(
    `UPDATE admin_users
     SET profile_photo = ?, updated_at = NOW()
     WHERE id = ?`,
    [profilePhoto, userId],
  );

  return result;
};

const updateLastLogin = async (userId) => {
  await db.query(
    `UPDATE admin_users
     SET last_login = NOW()
     WHERE id = ?`,
    [userId],
  );
};

module.exports = {
  findAdminByEmail,
  findPasswordById,
  findSessionUserById,
  findActiveAdminSession,
  getActivePermissionsByRoleId,
  clearFailedLogins,
  createAdminSession,
  recordFailedLogin,
  revokeAdminSession,
  revokeAllAdminSessions,
  revokeOtherAdminSessions,
  touchAdminSession,
  updateLastLogin,
  updatePassword,
  updateProfile,
  updateProfilePhoto,
};
