const express = require("express");
const { verifyToken } = require("../middlewares/auth.middleware");
const { checkAnyPermission, checkPermission } = require("../middlewares/permission.middleware");
const controller = require("../controllers/configuration.controller");

const router = express.Router();
router.use(verifyToken);
router.get("/", checkAnyPermission(["configuration.catalogs.manage", "configuration.routing.manage", "configuration.workflow.manage", "configuration.departments.manage", "departments.view", "departments.manage", "departments.manage_limited"]), controller.getConfiguration);
router.post("/catalogs/:catalog", checkAnyPermission(["configuration.catalogs.manage", "configuration.departments.manage", "departments.manage"]), controller.saveCatalogItem);
router.put("/catalogs/:catalog/:id", checkAnyPermission(["configuration.catalogs.manage", "configuration.departments.manage", "departments.manage"]), controller.saveCatalogItem);
router.delete("/catalogs/:catalog/:id", checkAnyPermission(["configuration.catalogs.manage", "configuration.departments.manage", "departments.manage"]), controller.deactivateCatalogItem);
router.put("/categories/:id/departments", checkAnyPermission(["configuration.catalogs.manage", "configuration.departments.manage", "departments.manage"]), controller.saveCategoryMappings);
router.post("/statuses", checkPermission("configuration.workflow.manage"), controller.saveStatus);
router.put("/statuses/:id", checkPermission("configuration.workflow.manage"), controller.saveStatus);
router.post("/priorities", checkPermission("configuration.workflow.manage"), controller.savePriority);
router.put("/priorities/:id", checkPermission("configuration.workflow.manage"), controller.savePriority);
router.delete("/workflow/:type/:id", checkPermission("configuration.workflow.manage"), controller.deactivateWorkflowItem);
router.put("/transitions", checkPermission("configuration.workflow.manage"), controller.saveTransition);
router.post("/routing-rules", checkPermission("configuration.routing.manage"), controller.saveRoutingRule);
router.put("/routing-rules/:id", checkPermission("configuration.routing.manage"), controller.saveRoutingRule);
router.delete("/routing-rules/:id", checkPermission("configuration.routing.manage"), controller.deactivateRoutingRule);
router.post("/holidays", checkPermission("configuration.catalogs.manage"), controller.saveHoliday);
router.put("/holidays/:id", checkPermission("configuration.catalogs.manage"), controller.saveHoliday);
router.delete("/holidays/:id", checkPermission("configuration.catalogs.manage"), controller.deactivateHoliday);

module.exports = router;
