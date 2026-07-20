const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middlewares/auth.middleware");
const { checkPermission } = require("../middlewares/permission.middleware");
const { getDashboard } = require("../controllers/dashboard.controller");

router.get("/", verifyToken, checkPermission("dashboard.view"), getDashboard);

module.exports = router;
