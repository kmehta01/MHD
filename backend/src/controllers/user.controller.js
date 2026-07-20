const bcrypt = require("bcryptjs");
const UserModel = require("../models/user.model");
const TwoFactorModel = require("../models/two-factor.model");
const { runAuditedMutation } = require("../services/audit-log.service");
const {
  generateRecoveryCodes,
  hashRecoveryCode,
} = require("../services/two-factor.service");

const canManageRole = (actor, targetRoleSlug) =>
  actor?.role_slug === "super-admin" ||
  (actor?.role_slug === "admin" && targetRoleSlug === "ministry-user");

const getDepartmentId = async (role, departmentId) => {
  if (!role.requires_department) return null;

  const normalizedDepartmentId = Number(departmentId);
  if (!Number.isInteger(normalizedDepartmentId) || normalizedDepartmentId <= 0) {
    const error = new Error("A department is required for Ministry Users");
    error.statusCode = 400;
    throw error;
  }

  const department =
    await UserModel.findActiveDepartmentById(normalizedDepartmentId);
  if (!department) {
    const error = new Error("Invalid department selected");
    error.statusCode = 400;
    throw error;
  }

  return normalizedDepartmentId;
};

const getUsers = async (req, res) => {
  try {
    const users = await UserModel.findAll(req.user.role_slug);

    return res.json({
      status: true,
      message: "Users fetched successfully",
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to fetch users",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const createUser = async (req, res) => {
  try {
    const {
      role_id,
      department_id,
      name,
      email,
      phone,
      password,
      status,
    } = req.body;

    if (!role_id || !name || !email || !password) {
      return res.status(400).json({
        status: false,
        message: "Role, name, email and password are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        status: false,
        message: "Password must be at least 8 characters long",
      });
    }

    const existingUser = await UserModel.findByEmail(email);

    if (existingUser) {
      return res.status(409).json({
        status: false,
        message: "Email already exists",
      });
    }

    const role = await UserModel.findActiveRoleById(role_id);

    if (!role) {
      return res.status(400).json({
        status: false,
        message: "Invalid role selected",
      });
    }

    if (!canManageRole(req.user, role.slug)) {
      return res.status(403).json({
        status: false,
        message: "You cannot create users with the selected role",
      });
    }

    const departmentId = await getDepartmentId(role, department_id);
    const hashedPassword = await bcrypt.hash(password, 10);

    await runAuditedMutation(
      req,
      (result) => ({
        eventType: "ADMIN_USER_CREATED",
        resourceType: "admin_user",
        resourceId: result.insertId,
      }),
      (connection) =>
        UserModel.create(
          {
            roleId: role_id,
            departmentId,
            name,
            email,
            phone: phone || null,
            password: hashedPassword,
            status: status || "active",
          },
          connection,
        ),
    );

    return res.status(201).json({
      status: true,
      message: "User created successfully",
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: false,
      message: error.statusCode ? error.message : "Failed to create user",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await UserModel.findById(id);

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    if (!canManageRole(req.user, user.role_slug)) {
      return res.status(403).json({
        status: false,
        message: "You cannot access this user account",
      });
    }

    return res.json({
      status: true,
      message: "User fetched successfully",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to fetch user",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { role_id, department_id, name, email, phone, status } = req.body;

    if (!role_id || !name || !email || !status) {
      return res.status(400).json({
        status: false,
        message: "Role, name, email and status are required",
      });
    }

    const targetUser = await UserModel.findById(id);
    if (!targetUser) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    if (!canManageRole(req.user, targetUser.role_slug)) {
      return res.status(403).json({
        status: false,
        message: "You cannot modify this user account",
      });
    }

    const role = await UserModel.findActiveRoleById(role_id);
    if (!role) {
      return res.status(400).json({ status: false, message: "Invalid role selected" });
    }

    if (!canManageRole(req.user, role.slug)) {
      return res.status(403).json({
        status: false,
        message: "You cannot assign the selected role",
      });
    }

    const departmentId = await getDepartmentId(role, department_id);
    const existingUser = await UserModel.findByEmailExcludingId(email, id);
    if (existingUser) {
      return res.status(409).json({
        status: false,
        message: "Email already exists",
      });
    }

    await runAuditedMutation(
      req,
      {
        eventType: "ADMIN_USER_UPDATED",
        resourceType: "admin_user",
        resourceId: id,
      },
      (connection) =>
        UserModel.update(
          id,
          {
            roleId: role_id,
            departmentId,
            name,
            email,
            phone: phone || null,
            status,
          },
          connection,
        ),
    );

    return res.json({
      status: true,
      message: "User updated successfully",
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: false,
      message: error.statusCode ? error.message : "Failed to update user",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const updateUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({
        status: false,
        message: "Password must be at least 8 characters long",
      });
    }

    const targetUser = await UserModel.findById(id);
    if (!targetUser) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    if (!canManageRole(req.user, targetUser.role_slug)) {
      return res.status(403).json({
        status: false,
        message: "You cannot update this user's password",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await runAuditedMutation(
      req,
      {
        eventType: "ADMIN_USER_PASSWORD_UPDATED",
        resourceType: "admin_user",
        resourceId: id,
      },
      (connection) => UserModel.updatePassword(id, hashedPassword, connection),
    );

    return res.json({
      status: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to update password",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (Number(id) === Number(req.user.id)) {
      return res.status(400).json({
        status: false,
        message: "You cannot delete the account you are currently using",
      });
    }

    const targetUser = await UserModel.findById(id);
    if (!targetUser) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    if (!canManageRole(req.user, targetUser.role_slug)) {
      return res.status(403).json({
        status: false,
        message: "You cannot delete this user account",
      });
    }

    await runAuditedMutation(
      req,
      {
        eventType: "ADMIN_USER_DELETED",
        resourceType: "admin_user",
        resourceId: id,
      },
      (connection) => UserModel.remove(id, connection),
    );

    return res.json({
      status: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to delete user",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const resetUserRecoveryCodes = async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        status: false,
        message: "A valid user ID is required",
      });
    }

    if (userId === Number(req.user.id)) {
      return res.status(400).json({
        status: false,
        message:
          "Use an existing recovery code or the documented break-glass procedure for your own account",
      });
    }

    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const recoveryCodes = generateRecoveryCodes();

    await runAuditedMutation(
      req,
      {
        eventType: "TWO_FACTOR_RECOVERY_CODES_RESET",
        resourceType: "admin_user",
        resourceId: userId,
      },
      (connection) =>
        TwoFactorModel.replaceRecoveryCodes(
          {
            userId,
            codeHashes: recoveryCodes.map(hashRecoveryCode),
            generatedByUserId: req.user.id,
          },
          connection,
        ),
    );

    return res.json({
      status: true,
      message: "Recovery codes were regenerated successfully",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        recovery_codes: recoveryCodes,
      },
    });
  } catch (error) {
    const configurationError = error.code === "TWO_FACTOR_CONFIGURATION_ERROR";

    return res.status(configurationError ? 503 : 500).json({
      status: false,
      message: configurationError
        ? "Recovery code security is not configured"
        : "Failed to reset recovery codes",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  getUsers,
  createUser,
  getUserById,
  updateUser,
  updateUserPassword,
  deleteUser,
  resetUserRecoveryCodes,
};
