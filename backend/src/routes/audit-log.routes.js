const express = require("express");
const { verifyToken } = require("../middlewares/auth.middleware");
const {
  checkAnyPermission,
  checkPermission,
} = require("../middlewares/permission.middleware");
const {
  exportAuditLogs,
  getAuditActors,
  getAuditLogs,
} = require("../controllers/audit-log.controller");

const router = express.Router();

const canViewAuditLogs = checkAnyPermission([
  "audit_logs.view_all",
  "audit_logs.view_limited",
  "audit_logs.view_own",
]);

router.use(verifyToken);
router.get("/export", checkPermission("audit_logs.export"), exportAuditLogs);
router.get("/actors", canViewAuditLogs, getAuditActors);
router.get("/", canViewAuditLogs, getAuditLogs);

module.exports = router;
