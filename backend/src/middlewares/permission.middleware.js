const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          status: false,
          message: "Unauthorized access",
        });
      }

      // Super admin bypass
      if (user.role_slug === "super-admin") {
        return next();
      }

      const permissions = user.permissions || [];

      if (!permissions.includes(requiredPermission)) {
        return res.status(403).json({
          status: false,
          message: "You do not have permission to access this resource",
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "Permission check failed",
      });
    }
  };
};

const checkAnyPermission = (requiredPermissions) => {
  const permissions = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];

  return (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          status: false,
          message: "Unauthorized access",
        });
      }

      if (user.role_slug === "super-admin") {
        return next();
      }

      const userPermissions = user.permissions || [];

      if (
        !permissions.some((permission) => userPermissions.includes(permission))
      ) {
        return res.status(403).json({
          status: false,
          message: "You do not have permission to access this resource",
        });
      }

      return next();
    } catch {
      return res.status(500).json({
        status: false,
        message: "Permission check failed",
      });
    }
  };
};

module.exports = {
  checkAnyPermission,
  checkPermission,
};
