const jwt = require("jsonwebtoken");
const { getJwtSecret } = require("../config/jwt");
const AuthModel = require("../models/auth.model");
const SettingsPolicy = require("../services/settings-policy.service");

const canChangeExpiredPassword = (req) =>
  ["/api/auth/me", "/api/auth/password", "/api/auth/logout"].some((path) =>
    String(req.originalUrl || req.url || "").startsWith(path),
  );

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ status: false, message: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(authHeader.split(" ")[1], getJwtSecret(), { algorithms: ["HS256"] });
    const settings = await SettingsPolicy.getPolicy();
    if (settings.security.enableTwoFactorAuthentication && decoded.two_factor_verified !== true) {
      return res.status(401).json({
        status: false,
        message: "Two-factor verification is required. Please sign in again.",
        code: "TWO_FACTOR_REQUIRED",
      });
    }

    const currentUser = await AuthModel.findSessionUserById(decoded.id);
    if (!currentUser || currentUser.status !== "active" || !currentUser.role_id ||
        !currentUser.role_slug || !currentUser.role_is_active) {
      return res.status(401).json({
        status: false,
        message: "This account or role is no longer active",
        code: "SESSION_REVOKED",
      });
    }

    if (!decoded.jti) {
      return res.status(401).json({ status: false, message: "Please sign in again", code: "SESSION_REVOKED" });
    }
    const session = await AuthModel.findActiveAdminSession(decoded.jti, decoded.id);
    const idleDeadline = session
      ? new Date(session.last_activity_at).getTime() + settings.security.sessionTimeoutMinutes * 60000
      : 0;
    if (!session || session.revoked_at || new Date(session.expires_at).getTime() <= Date.now() || idleDeadline <= Date.now()) {
      if (session && !session.revoked_at) await AuthModel.revokeAdminSession(decoded.jti, "expired");
      return res.status(401).json({ status: false, message: "Your session has expired", code: "SESSION_EXPIRED" });
    }

    const passwordAgeDays = currentUser.password_changed_at
      ? (Date.now() - new Date(currentUser.password_changed_at).getTime()) / 86400000
      : Number.POSITIVE_INFINITY;
    const passwordChangeRequired = Boolean(currentUser.must_change_password) ||
      (settings.security.passwordExpiryDays > 0 && passwordAgeDays >= settings.security.passwordExpiryDays);

    const permissions = await AuthModel.getActivePermissionsByRoleId(currentUser.role_id);
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
      two_factor_enforced: settings.security.enableTwoFactorAuthentication,
      password_change_required: passwordChangeRequired,
    };
    await AuthModel.touchAdminSession(decoded.jti);

    if (passwordChangeRequired && !canChangeExpiredPassword(req)) {
      return res.status(403).json({
        status: false,
        code: "PASSWORD_CHANGE_REQUIRED",
        message: "Change your password before continuing.",
      });
    }
    return next();
  } catch (error) {
    return res.status(401).json({ status: false, message: "Invalid or expired token" });
  }
};

module.exports = { verifyToken };
