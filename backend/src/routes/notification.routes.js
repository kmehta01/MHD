const express = require("express");
const { verifyToken } = require("../middlewares/auth.middleware");
const { checkPermission } = require("../middlewares/permission.middleware");
const controller = require("../controllers/notification.controller");

const router = express.Router();
router.use(verifyToken);
router.get("/", checkPermission("notifications.view"), controller.getNotifications);
router.put("/read-all", checkPermission("notifications.view"), controller.markAllNotificationsRead);
router.put("/:id/read", checkPermission("notifications.view"), controller.markNotificationRead);
router.get("/templates/all", checkPermission("notifications.templates.manage"), controller.getTemplates);
router.post("/templates", checkPermission("notifications.templates.manage"), controller.saveTemplate);
router.put("/templates/:id", checkPermission("notifications.templates.manage"), controller.saveTemplate);

module.exports = router;
