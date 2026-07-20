const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middlewares/auth.middleware");
const { checkPermission } = require("../middlewares/permission.middleware");

const {
  createRole,
  getRoles,
  getAssignableRoles,
  getPermissions,
  getRolePermissions,
  updateRole,
  updateRolePermissions,
} = require("../controllers/role.controller");

router.get(
  "/assignable",
  verifyToken,
  checkPermission("users.view"),
  getAssignableRoles
);

router.get(
  "/",
  verifyToken,
  checkPermission("roles.view"),
  getRoles
);

router.post(
  "/",
  verifyToken,
  checkPermission("roles.create"),
  createRole
);

router.get(
  "/permissions",
  verifyToken,
  checkPermission("roles.view"),
  getPermissions
);

router.get(
  "/:roleId/permissions",
  verifyToken,
  checkPermission("roles.view"),
  getRolePermissions
);

router.put(
  "/:roleId",
  verifyToken,
  checkPermission("roles.update"),
  updateRole
);

router.put(
  "/:roleId/permissions",
  verifyToken,
  checkPermission("roles.update"),
  updateRolePermissions
);

module.exports = router;
