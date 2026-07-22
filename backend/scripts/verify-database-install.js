#!/usr/bin/env node

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const mysql = require("mysql2/promise");
const {
  InstallerError,
  runInstaller,
  validateSchemaInstallation,
} = require("../src/services/install.service");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const projectRoot = path.resolve(__dirname, "../..");
const migrationRoot = path.join(projectRoot, "database", "migrations");
const suffix = `${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
const databaseName = `mhd_grm_install_verify_${suffix}`;
const lockPath = path.join(os.tmpdir(), `${databaseName}.lock`);

if (!/^mhd_grm_install_verify_[0-9]+_[a-f0-9]{6}$/.test(databaseName)) {
  throw new Error("Unsafe disposable database name");
}

const installerConfig = {
  backend_url: "http://localhost:5001",
  admin_url: "http://localhost:5174",
  frontend_url: "http://localhost:5173",
  db_host: process.env.DB_HOST,
  db_name: databaseName,
  db_user: process.env.DB_USER,
  db_password: process.env.DB_PASSWORD || "",
  db_timezone: process.env.DB_TIMEZONE || "+00:00",
  admin_name: "Database Verification Admin",
  admin_email: "database-verification@example.invalid",
  admin_password: `DbVerify-${crypto.randomBytes(12).toString("hex")}!`,
  jwt_secret: crypto.randomBytes(48).toString("hex"),
  two_factor_pepper: crypto.randomBytes(48).toString("hex"),
  node_env: "development",
  reset_database: true,
};

const installerOptions = {
  lockPath,
  writeEnvironmentFiles: () => {},
};

const connectServer = () => mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  multipleStatements: true,
});

const expectInstallerError = async (action, statusCode) => {
  try {
    await action();
    assert.fail(`Expected InstallerError ${statusCode}`);
  } catch (error) {
    assert.ok(error instanceof InstallerError);
    assert.equal(error.statusCode, statusCode);
  }
};

const verify = async () => {
  const server = await connectServer();
  try {
    fs.rmSync(lockPath, { force: true });
    await runInstaller(installerConfig, installerOptions);
    assert.ok(fs.existsSync(lockPath), "successful install must create its lock");
    await expectInstallerError(
      () => runInstaller(installerConfig, installerOptions),
      403,
    );

    await server.query(`USE \`${databaseName}\``);
    const [[fresh]] = await server.query(`SELECT
      (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()) AS tables,
      (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
        AND TABLE_NAME='complaints' AND COLUMN_NAME='resolution_summary') AS resolution_summary,
      (SELECT COUNT(*) FROM admin_users) AS admin_users,
      (SELECT COUNT(*) FROM complaints) AS complaints,
      (SELECT COUNT(*) FROM admin_sessions) AS sessions,
      (SELECT COUNT(*) FROM admin_audit_logs) AS audit_logs`);
    assert.equal(Number(fresh.tables), 45);
    assert.equal(Number(fresh.resolution_summary), 1);
    assert.equal(Number(fresh.admin_users), 1);
    assert.equal(Number(fresh.complaints), 0);
    assert.equal(Number(fresh.sessions), 0);
    assert.equal(Number(fresh.audit_logs), 0);

    fs.rmSync(lockPath, { force: true });
    await expectInstallerError(
      () => runInstaller({ ...installerConfig, reset_database: false }, installerOptions),
      409,
    );
    assert.equal(fs.existsSync(lockPath), false, "rejected install must not create a lock");

    await server.query(`INSERT INTO complaints
      (token_number, priority_id, status_id, category_id, submission_type, declaration_confirm, intake_source)
      VALUES ('VERIFY-PRESERVE-1', 2, 1, 12, 'named', 1, 'public')`);
    await server.query("ALTER TABLE complaints DROP COLUMN resolution_summary");
    await server.query(
      "DELETE FROM schema_migrations WHERE migration_key='20260728-schema-contract-repair'",
    );
    const migrationRun = spawnSync(
      process.execPath,
      [path.resolve(__dirname, "migrate-all.js")],
      {
        cwd: path.resolve(__dirname, ".."),
        encoding: "utf8",
        env: { ...process.env, DB_NAME: databaseName },
      },
    );
    if (migrationRun.status !== 0) {
      throw new Error(`Migration runner failed: ${migrationRun.stderr || migrationRun.stdout}`);
    }
    assert.match(migrationRun.stdout, /RUN\s+20260728-schema-contract-repair/);
    const [[upgrade]] = await server.query(`SELECT
      (SELECT COUNT(*) FROM complaints WHERE token_number='VERIFY-PRESERVE-1') AS preserved,
      (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
        AND TABLE_NAME='complaints' AND COLUMN_NAME='resolution_summary') AS repaired`);
    assert.equal(Number(upgrade.preserved), 1);
    assert.equal(Number(upgrade.repaired), 1);
    await validateSchemaInstallation(server, installerConfig.admin_email);

    const migrationFiles = fs.readdirSync(migrationRoot)
      .filter((file) => file.endsWith(".sql"))
      .sort();
    for (let pass = 1; pass <= 2; pass += 1) {
      for (const file of migrationFiles) {
        await server.query(fs.readFileSync(path.join(migrationRoot, file), "utf8"));
      }
      console.log(`Migration SQL pass ${pass} completed (${migrationFiles.length} files).`);
    }

    fs.rmSync(lockPath, { force: true });
    await runInstaller(installerConfig, installerOptions);
    await server.query(`USE \`${databaseName}\``);
    const [[reset]] = await server.query(
      "SELECT COUNT(*) AS complaints FROM complaints WHERE token_number='VERIFY-PRESERVE-1'",
    );
    assert.equal(Number(reset.complaints), 0, "explicit reset must remove prior operational data");
    console.log(`Disposable installer verification passed: ${databaseName}`);
  } finally {
    fs.rmSync(lockPath, { force: true });
    await server.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
    await server.end();
    console.log(`Disposable database removed: ${databaseName}`);
  }
};

verify().catch((error) => {
  console.error("Disposable database verification failed:", error.message);
  process.exitCode = 1;
});
