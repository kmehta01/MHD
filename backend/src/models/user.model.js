const db = require("../config/db");

const findAll = async (actorRoleSlug = "super-admin") => {
  const roleClause =
    actorRoleSlug === "admin" ? "WHERE r.slug = 'ministry-user'" : "";
  const [users] = await db.query(
    `SELECT
      au.id,
      au.role_id,
      au.department_id,
      au.name,
      au.email,
      au.phone,
      au.status,
      au.last_login,
      au.created_at,
      r.name AS role_name,
      r.slug AS role_slug,
      d.name AS department_name
    FROM admin_users au
    LEFT JOIN roles r ON r.id = au.role_id
    LEFT JOIN departments d ON d.id = au.department_id
    ${roleClause}
    ORDER BY au.id DESC`,
  );

  return users;
};

const findByEmail = async (email) => {
  const [users] = await db.query(
    `SELECT id FROM admin_users WHERE email = ? LIMIT 1`,
    [email],
  );

  return users[0] || null;
};

const findActiveRoleById = async (roleId) => {
  const [roles] = await db.query(
    `SELECT
       r.id,
       r.name,
       r.slug,
       EXISTS (
         SELECT 1
         FROM role_permissions rp
         JOIN permissions p ON p.id = rp.permission_id
         WHERE rp.role_id = r.id
           AND p.permission_key = 'grievances.view_department'
           AND p.is_active = 1
       ) AS requires_department
     FROM roles r
     WHERE r.id = ? AND r.is_active = 1
     LIMIT 1`,
    [roleId],
  );

  return roles[0] || null;
};

const findActiveDepartmentById = async (departmentId) => {
  const [departments] = await db.query(
    `SELECT id, name
     FROM departments
     WHERE id = ? AND is_active = 1
     LIMIT 1`,
    [departmentId],
  );

  return departments[0] || null;
};

const create = async ({
  roleId,
  departmentId,
  name,
  email,
  phone,
  password,
  status,
}, executor = db) => {
  const [result] = await executor.query(
    `INSERT INTO admin_users
     (role_id, department_id, name, email, phone, password, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [roleId, departmentId, name, email, phone, password, status],
  );

  return result;
};

const findById = async (id) => {
  const [users] = await db.query(
    `SELECT
      au.id,
      au.role_id,
      au.department_id,
      au.name,
      au.email,
      au.phone,
      au.status,
      au.created_at,
      r.name AS role_name,
      r.slug AS role_slug,
      d.name AS department_name
    FROM admin_users au
    LEFT JOIN roles r ON r.id = au.role_id
    LEFT JOIN departments d ON d.id = au.department_id
    WHERE au.id = ?
    LIMIT 1`,
    [id],
  );

  return users[0] || null;
};

const findByEmailExcludingId = async (email, id) => {
  const [users] = await db.query(
    `SELECT id FROM admin_users WHERE email = ? AND id != ? LIMIT 1`,
    [email, id],
  );

  return users[0] || null;
};

const update = async (
  id,
  { roleId, departmentId, name, email, phone, status },
  executor = db,
) => {
  const [result] = await executor.query(
    `UPDATE admin_users
     SET role_id = ?, department_id = ?, name = ?, email = ?, phone = ?,
         status = ?, updated_at = NOW()
     WHERE id = ?`,
    [roleId, departmentId, name, email, phone, status, id],
  );

  return result;
};

const updatePassword = async (id, password, executor = db) => {
  const [result] = await executor.query(
    `UPDATE admin_users
     SET password = ?, updated_at = NOW()
     WHERE id = ?`,
    [password, id],
  );

  return result;
};

const remove = async (id, executor = db) => {
  const [result] = await executor.query(`DELETE FROM admin_users WHERE id = ?`, [id]);

  return result;
};

module.exports = {
  findAll,
  findByEmail,
  findActiveRoleById,
  findActiveDepartmentById,
  create,
  findById,
  findByEmailExcludingId,
  update,
  updatePassword,
  remove,
};
