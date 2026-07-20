const RoleModel = require("../models/role.model");
const { runAuditedMutation } = require("../services/audit-log.service");

const SYSTEM_ROLE_SLUGS = new Set([
  "super-admin",
  "admin",
  "ministry-user",
]);

const normalizeRoleName = (value) =>
  String(value || "").trim().replace(/\s+/g, " ");

const buildRoleSlug = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);

const normalizePermissionIds = (permissionIds) => {
  if (!Array.isArray(permissionIds)) {
    const error = new Error("permission_ids must be an array");
    error.statusCode = 400;
    throw error;
  }

  return [...new Set(permissionIds.map((permissionId) => Number(permissionId)))];
};

const validateRoleName = (name) => {
  if (name.length < 2 || name.length > 100) {
    const error = new Error("Role name must be between 2 and 100 characters");
    error.statusCode = 400;
    throw error;
  }
};

const getRoles = async (req, res) => {
  try {
    const roles = await RoleModel.findAll();

    return res.json({
      status: true,
      message: "Roles fetched successfully",
      data: roles,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to fetch roles",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const getAssignableRoles = async (req, res) => {
  try {
    const roles = await RoleModel.findAssignable(req.user.role_slug);

    return res.json({
      status: true,
      message: "Assignable roles fetched successfully",
      data: roles,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to fetch assignable roles",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const getPermissions = async (req, res) => {
  try {
    const permissions = await RoleModel.findActivePermissions();

    return res.json({
      status: true,
      message: "Permissions fetched successfully",
      data: permissions,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to fetch permissions",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const getRolePermissions = async (req, res) => {
  try {
    const { roleId } = req.params;

    const permissions = await RoleModel.findPermissionsByRoleId(roleId);

    return res.json({
      status: true,
      message: "Role permissions fetched successfully",
      data: permissions,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to fetch role permissions",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const createRole = async (req, res) => {
  try {
    const name = normalizeRoleName(req.body.name);
    const permissionIds = normalizePermissionIds(
      req.body.permission_ids || [],
    );
    const isActive = req.body.is_active !== false;

    validateRoleName(name);

    const slug = buildRoleSlug(name);
    if (!slug) {
      return res.status(400).json({
        status: false,
        message: "Role name must contain letters or numbers",
      });
    }

    if (SYSTEM_ROLE_SLUGS.has(slug) || (await RoleModel.findBySlug(slug))) {
      return res.status(409).json({
        status: false,
        message: "A role with this name already exists",
      });
    }

    const result = await runAuditedMutation(
      req,
      (createdRole) => ({
        eventType: "ROLE_CREATED",
        resourceType: "role",
        resourceId: createdRole.insertId,
      }),
      async (connection) => {
        const createdRole = await RoleModel.create(
          { name, slug, isActive },
          connection,
        );
        await RoleModel.updatePermissions(
          createdRole.insertId,
          permissionIds,
          connection,
        );
        return createdRole;
      },
    );

    return res.status(201).json({
      status: true,
      message: "Role created successfully",
      data: {
        id: result.insertId,
        name,
        slug,
        is_active: isActive,
      },
    });
  } catch (error) {
    const clientError =
      error.statusCode ||
      error.code === "INVALID_PERMISSION" ||
      error.code === "ER_DUP_ENTRY";

    return res.status(
      error.statusCode ||
        (error.code === "ER_DUP_ENTRY" ? 409 : clientError ? 400 : 500),
    ).json({
      status: false,
      message:
        error.code === "ER_DUP_ENTRY"
          ? "A role with this name already exists"
          : clientError
            ? error.message
            : "Failed to create role",
      error:
        process.env.NODE_ENV === "development" && !clientError
          ? error.message
          : undefined,
    });
  }
};

const updateRole = async (req, res) => {
  try {
    const roleId = Number(req.params.roleId);
    const name = normalizeRoleName(req.body.name);
    const isActive = req.body.is_active !== false;

    if (!Number.isInteger(roleId) || roleId <= 0) {
      return res.status(400).json({
        status: false,
        message: "A valid role ID is required",
      });
    }

    validateRoleName(name);

    const role = await RoleModel.findById(roleId);
    if (!role) {
      return res.status(404).json({
        status: false,
        message: "Role not found",
      });
    }

    if (SYSTEM_ROLE_SLUGS.has(role.slug)) {
      return res.status(403).json({
        status: false,
        message: "System role details cannot be modified",
      });
    }

    await runAuditedMutation(
      req,
      {
        eventType: "ROLE_UPDATED",
        resourceType: "role",
        resourceId: roleId,
      },
      (connection) =>
        RoleModel.update(roleId, { name, isActive }, connection),
    );

    return res.json({
      status: true,
      message: "Role updated successfully",
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: false,
      message: error.statusCode ? error.message : "Failed to update role",
      error:
        process.env.NODE_ENV === "development" && !error.statusCode
          ? error.message
          : undefined,
    });
  }
};

const updateRolePermissions = async (req, res) => {
  try {
    const { roleId } = req.params;
    const permissionIds = normalizePermissionIds(req.body.permission_ids);

    const roles = await RoleModel.findAll();
    const targetRole = roles.find((role) => Number(role.id) === Number(roleId));

    if (!targetRole) {
      return res.status(404).json({
        status: false,
        message: "Role not found",
      });
    }

    // Do not allow removing Super Admin permissions
    if (targetRole.slug === "super-admin") {
      return res.status(403).json({
        status: false,
        message: "Super Admin permissions cannot be modified",
      });
    }

    await runAuditedMutation(
      req,
      {
        eventType: "ROLE_PERMISSIONS_UPDATED",
        resourceType: "role",
        resourceId: roleId,
      },
      (connection) =>
        RoleModel.updatePermissions(roleId, permissionIds, connection),
    );

    return res.json({
      status: true,
      message: "Role permissions updated successfully",
    });
  } catch (error) {
    const statusCode =
      error.statusCode ||
      (error.code === "INVALID_PERMISSION" ? 400 : 500);

    return res.status(statusCode).json({
      status: false,
      message:
        error.statusCode || error.code === "INVALID_PERMISSION"
          ? error.message
          : "Failed to update role permissions",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  createRole,
  getRoles,
  getAssignableRoles,
  getPermissions,
  getRolePermissions,
  updateRole,
  updateRolePermissions,
};
