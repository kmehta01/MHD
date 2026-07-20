const express = require("express");
const router = express.Router();

const {
  checkInstallerStatus,
  runInstallation,
} = require("../controllers/install.controller");

const checkInstallation = require("../middlewares/install.middleware");
const {
  installerSetupLimiter,
  installerStatusLimiter,
} = require("../middlewares/rate-limit.middleware");

router.get("/status", installerStatusLimiter, checkInstallerStatus);
router.post(
  "/setup",
  installerSetupLimiter,
  checkInstallation,
  runInstallation,
);

module.exports = router;
