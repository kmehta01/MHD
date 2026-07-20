const express = require("express");
const { getDepartments } = require("../controllers/department.controller");
const { verifyToken } = require("../middlewares/auth.middleware");
const { checkAnyPermission } = require("../middlewares/permission.middleware");

const router = express.Router();

router.get(
  "/",
  verifyToken,
  checkAnyPermission(["departments.view", "users.view"]),
  getDepartments,
);

module.exports = router;
