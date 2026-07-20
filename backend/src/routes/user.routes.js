const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middlewares/auth.middleware");
const { checkPermission } = require("../middlewares/permission.middleware");
const { requireSuperAdmin } = require("../middlewares/super-admin.middleware");

const {
  getUsers,
  createUser,
  getUserById,
  updateUser,
  updateUserPassword,
  deleteUser,
  resetUserRecoveryCodes,
} = require("../controllers/user.controller");

router.get(
  "/",
  verifyToken,
  checkPermission("users.view"),
  getUsers
);

router.post(
  "/",
  verifyToken,
  checkPermission("users.create"),
  createUser
);

router.get(
  "/:id",
  verifyToken,
  checkPermission("users.view"),
  getUserById
);

router.put(
  "/:id",
  verifyToken,
  checkPermission("users.update"),
  updateUser
);

router.put(
  "/:id/password",
  verifyToken,
  checkPermission("users.update"),
  updateUserPassword
);

router.post(
  "/:id/2fa/recovery-codes/reset",
  verifyToken,
  requireSuperAdmin,
  resetUserRecoveryCodes
);

router.delete(
  "/:id",
  verifyToken,
  checkPermission("users.delete"),
  deleteUser
);

module.exports = router;
