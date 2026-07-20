const jwt = require("jsonwebtoken");
const { getJwtSecret } = require("../config/jwt");
const { isTwoFactorEnforced } = require("../config/two-factor");
const AuthModel = require("../models/auth.model");

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        status: false,
        message: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: ["HS256"],
    });

    if (isTwoFactorEnforced() && decoded.two_factor_verified !== true) {
      return res.status(401).json({
        status: false,
        message: "Two-factor verification is required. Please sign in again.",
        code: "TWO_FACTOR_REQUIRED",
      });
    }

    const currentUser = await AuthModel.findSessionUserById(decoded.id);

    if (
      !currentUser ||
      currentUser.status !== "active" ||
      !currentUser.role_id ||
      !currentUser.role_slug ||
      !currentUser.role_is_active
    ) {
      return res.status(401).json({
        status: false,
        message: "This account or role is no longer active",
        code: "SESSION_REVOKED",
      });
    }

    const permissions = await AuthModel.getActivePermissionsByRoleId(
      currentUser.role_id,
    );

    req.user = {
      ...decoded,
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      phone: currentUser.phone || null,
      profile_photo: currentUser.profile_photo || null,
      last_login: currentUser.last_login || null,
      created_at: currentUser.created_at || null,
      role_id: currentUser.role_id,
      role_name: currentUser.role_name,
      role_slug: currentUser.role_slug,
      department_id: currentUser.department_id || null,
      department_name: currentUser.department_name || null,
      permissions: permissions.map((permission) => permission.permission_key),
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      status: false,
      message: "Invalid or expired token",
    });
  }
};

module.exports = {
  verifyToken,
};
