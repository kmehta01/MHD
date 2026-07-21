const express = require("express");
const { verifyToken } = require("../middlewares/auth.middleware");
const { checkAnyPermission, checkPermission } = require("../middlewares/permission.middleware");
const controller = require("../controllers/report.controller");

const router = express.Router();
router.use(verifyToken);
router.get("/", checkAnyPermission(["reports.view_all", "reports.view_operational", "reports.view_department"]), controller.listReports);
router.get("/options", checkAnyPermission(["reports.view_all", "reports.view_operational", "reports.view_department"]), controller.getReportOptions);
router.post("/", checkPermission("reports.export"), controller.createReport);
router.get("/:id", checkAnyPermission(["reports.view_all", "reports.view_operational", "reports.view_department"]), controller.getReport);
router.get("/:id/download", checkPermission("reports.export"), controller.downloadReport);
module.exports = router;
