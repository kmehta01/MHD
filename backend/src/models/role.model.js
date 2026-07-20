const db = require("../config/db");

const findAll = async () => {
  const [roles] = await db.query(
    `SELECT
       r.id,
       r.name,
       r.slug,
       r.is_active,
       r.created_at,
       COUNT(DISTINCT rp.permission_id) AS permission_count,
       COUNT(DISTINCT au.id) AS user_count
     FROM roles r
     LEFT JOIN role_permissions rp ON rp.role_id = r.id
     LEFT JOIN admin_users au ON au.role_id = r.id
     GROUP BY r.id, r.name, r.slug, r.is_active, r.created_at
     ORDER BY r.id ASC`,
  );

  return roles;
};

const findAssignable = async (actorRoleSlug) => {
  const values = [];
  let roleClause = "";

  if (actorRoleSlug === "admin") {
    roleClause = "AND r.slug = ?";
    values.push("ministry-user");
  }

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
     WHERE r.is_active = 1
       ${roleClause}
     ORDER BY r.id ASC`,
    values,
  );

  return roles;
};

const findActivePermissions = async () => {
  const [permissions] = await db.query(
    `SELECT id, module, action, permission_key, description
     FROM permissions
     WHERE is_active = 1
       AND permission_key <> 'grievances.view'
     ORDER BY module ASC, action ASC`,
  );

  return permissions;
};

const findById = async (roleId, executor = db) => {
  const [roles] = await executor.query(
    `SELECT id, name, slug, is_active, created_at
     FROM roles
     WHERE id = ?
     LIMIT 1`,
    [roleId],
  );

  return roles[0] || null;
};

const findBySlug = async (slug, executor = db) => {
  const [roles] = await executor.query(
    `SELECT id, name, slug, is_active
     FROM roles
     WHERE slug = ?
     LIMIT 1`,
    [slug],
  );

  return roles[0] || null;
};

const create = async ({ name, slug, isActive = true }, executor = db) => {
  const [result] = await executor.query(
    `INSERT INTO roles (name, slug, is_active)
     VALUES (?, ?, ?)`,
    [name, slug, isActive ? 1 : 0],
  );

  return result;
};

const update = async (
  roleId,
  { name, isActive },
  executor = db,
) => {
  const [result] = await executor.query(
    `UPDATE roles
     SET name = ?, is_active = ?, updated_at = NOW()
     WHERE id = ?`,
    [name, isActive ? 1 : 0, roleId],
  );

  return result;
};

const findPermissionsByRoleId = async (roleId) => {
  const [permissions] = await db.query(
    `SELECT p.id, p.permission_key
     FROM role_permissions rp
     JOIN permissions p ON p.id = rp.permission_id
     WHERE rp.role_id = ?
       AND p.is_active = 1
       AND p.permission_key <> 'grievances.view'`,
    [roleId],
  );

  return permissions;
};

const updatePermissionsWithExecutor = async (roleId, permissionIds, executor) => {
  const uniquePermissionIds = [
    ...new Set(
      permissionIds.map((permissionId) => Number(permissionId)),
    ),
  ];

  if (
    uniquePermissionIds.some(
      (permissionId) =>
        !Number.isInteger(permissionId) || permissionId <= 0,
    )
  ) {
    const error = new Error("One or more permissions are invalid");
    error.code = "INVALID_PERMISSION";
    throw error;
  }

  if (uniquePermissionIds.length > 0) {
    const [validPermissions] = await executor.query(
      `SELECT id
       FROM permissions
       WHERE id IN (?)
         AND is_active = 1
         AND permission_key <> 'grievances.view'`,
      [uniquePermissionIds],
    );

    if (validPermissions.length !== uniquePermissionIds.length) {
      const error = new Error(
        "One or more permissions are invalid or inactive",
      );
      error.code = "INVALID_PERMISSION";
      throw error;
    }
  }

  await executor.query(
    `DELETE FROM role_permissions WHERE role_id = ?`,
    [roleId],
  );

  for (const permissionId of uniquePermissionIds) {
    await executor.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       VALUES (?, ?)`,
      [roleId, permissionId],
    );
  }
};

const updatePermissions = async (roleId, permissionIds, executor = null) => {
  if (executor) {
    return updatePermissionsWithExecutor(roleId, permissionIds, executor);
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await updatePermissionsWithExecutor(roleId, permissionIds, connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  create,
  findAll,
  findAssignable,
  findActivePermissions,
  findById,
  findBySlug,
  findPermissionsByRoleId,
  update,
  updatePermissions,
};
