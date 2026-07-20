const db = require("../config/db");

const requireSuperAdmin = async (req, res, next) => {
  try {
    const [users] = await db.query(
      `SELECT au.id
       FROM admin_users au
       JOIN roles r ON r.id = au.role_id
       WHERE au.id = ?
         AND au.status = 'active'
         AND r.slug = 'super-admin'
         AND r.is_active = 1
       LIMIT 1`,
      [req.user?.id || 0],
    );

    if (users.length === 1) return next();

    return res.status(403).json({
      status: false,
      message: "Only Super Administrators can perform this action",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Unable to verify Super Administrator access",
    });
  }
};

module.exports = {
  requireSuperAdmin,
};
