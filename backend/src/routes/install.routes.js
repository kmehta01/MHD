const express = require("express");
const router = express.Router();

const {
  checkInstallerStatus,
  runInstallation,
} = require("../controllers/install.controller");

const checkInstallation = require("../middlewares/install.middleware");

router.get("/status", checkInstallerStatus);
router.post("/setup", checkInstallation, runInstallation);

module.exports = router;
