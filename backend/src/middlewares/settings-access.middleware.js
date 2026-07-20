const ensureEligibleRole = (req, res) => {
  if (!["super-admin", "admin"].includes(req.user?.role_slug)) {
    res.status(403).json({
      status: false,
      message: "General Settings are not available to Ministry users",
    });
    return false;
  }
  return true;
};

const requireGeneralSettingsPermission = (permission) => (req, res, next) => {
  if (!ensureEligibleRole(req, res)) return;
  if (req.user.role_slug === "super-admin") return next();
  if (req.user.permissions?.includes(permission)) return next();

  return res.status(403).json({
    status: false,
    message: "You do not have permission to access General Settings",
  });
};

const requireGeneralSettingsSuperAdmin = (req, res, next) => {
  if (!ensureEligibleRole(req, res)) return;
  if (req.user.role_slug === "super-admin") return next();

  return res.status(403).json({
    status: false,
    message: "Only Super Administrators can change General Settings",
  });
};

module.exports = {
  requireGeneralSettingsPermission,
  requireGeneralSettingsSuperAdmin,
};
