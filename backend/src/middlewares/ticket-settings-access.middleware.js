const ensureEligibleRole = (req, res) => {
  if (!["super-admin", "admin"].includes(req.user?.role_slug)) {
    res.status(403).json({
      status: false,
      success: false,
      message: "Ticket Number Format settings are not available to Ministry users",
    });
    return false;
  }
  return true;
};

const requireTicketSettingsPermission = (permission) => (req, res, next) => {
  if (!ensureEligibleRole(req, res)) return;
  if (req.user.role_slug === "super-admin" || req.user.permissions?.includes(permission)) return next();
  return res.status(403).json({
    status: false,
    success: false,
    message: "You do not have permission to access Ticket Number Format settings",
  });
};

const requireTicketSettingsSuperAdmin = (req, res, next) => {
  if (!ensureEligibleRole(req, res)) return;
  if (req.user.role_slug === "super-admin") return next();
  return res.status(403).json({
    status: false,
    success: false,
    message: "Only Super Administrators can change Ticket Number Format settings",
  });
};

module.exports = { requireTicketSettingsPermission, requireTicketSettingsSuperAdmin };
