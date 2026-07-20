const fs = require("fs");
const path = require("path");

const installLockPath = path.join(__dirname, "../../install.lock");

const checkInstallation = (req, res, next) => {
  if (fs.existsSync(installLockPath)) {
    return res.status(403).json({
      status: false,
      message: "Project is already installed. Installer is locked.",
    });
  }

  next();
};

module.exports = checkInstallation;