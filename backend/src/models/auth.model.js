const db = require("../config/db");

const findAdminByEmail = async (email) => {
  const [users] = await db.query(
    `SELECT
      au.id,
      au.name,
      au.email,
      au.password,
      au.status,
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
      au.status,
      au.last_login,
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
     SET password = ?, updated_at = NOW()
     WHERE id = ?`,
    [password, userId],
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
  getActivePermissionsByRoleId,
  updateLastLogin,
  updatePassword,
  updateProfile,
};
