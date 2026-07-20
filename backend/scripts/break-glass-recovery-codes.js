const db = require("../src/config/db");
const AuthModel = require("../src/models/auth.model");
const TwoFactorModel = require("../src/models/two-factor.model");
const { runAuditedMutation } = require("../src/services/audit-log.service");
const {
  generateRecoveryCodes,
  hashRecoveryCode,
} = require("../src/services/two-factor.service");

const email = String(process.argv[2] || "").trim();

const resetRecoveryCodes = async () => {
  if (!email) {
    throw new Error(
      "Usage: npm run two-factor:break-glass -- administrator@example.gov.bz",
    );
  }

  const user = await AuthModel.findAdminByEmail(email);

  if (!user) {
    throw new Error("Administrator account not found");
  }

  const recoveryCodes = generateRecoveryCodes();

  const cliRequest = {
    user: null,
    ip: "127.0.0.1",
    get: () => "server-cli/break-glass-recovery",
  };

  await runAuditedMutation(
    cliRequest,
    {
      actorUserId: null,
      eventType: "TWO_FACTOR_BREAK_GLASS_RESET",
      resourceType: "admin_user",
      resourceId: user.id,
    },
    (connection) =>
      TwoFactorModel.replaceRecoveryCodes(
        {
          userId: user.id,
          codeHashes: recoveryCodes.map(hashRecoveryCode),
        },
        connection,
      ),
  );

  console.log(`New recovery codes for ${user.name} (${user.email}):`);
  console.log("");
  recoveryCodes.forEach((code) => console.log(code));
  console.log("");
  console.log("These codes will not be displayed again.");
};

resetRecoveryCodes()
  .catch((error) => {
    console.error("Break-glass recovery failed.");
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.end();
  });
