const express = require("express");
const { verifyToken } = require("../middlewares/auth.middleware");
const { checkAnyPermission, checkPermission } = require("../middlewares/permission.middleware");
const controller = require("../controllers/configuration.controller");

const router = express.Router();
router.use(verifyToken);
router.get("/", checkAnyPermission(["configuration.catalogs.manage", "configuration.routing.manage"]), controller.getConfiguration);
router.post("/catalogs/:catalog", checkPermission("configuration.catalogs.manage"), controller.saveCatalogItem);
router.put("/catalogs/:catalog/:id", checkPermission("configuration.catalogs.manage"), controller.saveCatalogItem);
router.delete("/catalogs/:catalog/:id", checkPermission("configuration.catalogs.manage"), controller.deactivateCatalogItem);
router.post("/routing-rules", checkPermission("configuration.routing.manage"), controller.saveRoutingRule);
router.put("/routing-rules/:id", checkPermission("configuration.routing.manage"), controller.saveRoutingRule);
router.delete("/routing-rules/:id", checkPermission("configuration.routing.manage"), controller.deactivateRoutingRule);
router.post("/holidays", checkPermission("configuration.catalogs.manage"), controller.saveHoliday);
router.put("/holidays/:id", checkPermission("configuration.catalogs.manage"), controller.saveHoliday);
router.delete("/holidays/:id", checkPermission("configuration.catalogs.manage"), controller.deactivateHoliday);

module.exports = router;
