const {
  InstallerError,
  getInstallerStatus,
  runInstaller,
} = require("../services/install.service");

const checkInstallerStatus = async (req, res) => {
  const installerStatus = getInstallerStatus();

  return res.status(200).json({
    status: true,
    ...installerStatus,
  });
};

const runInstallation = async (req, res) => {
  try {
    const result = await runInstaller(req.body);

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof InstallerError) {
      return res.status(error.statusCode).json({
        status: false,
        message: error.message,
        details: error.details,
      });
    }

    return res.status(500).json({
      status: false,
      message: "Installation failed",
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  checkInstallerStatus,
  runInstallation,
};
