const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  InstallerError,
  assertInstallationTargetEmpty,
  installerTables,
} = require("../src/services/install.service");

const projectRoot = path.resolve(__dirname, "../..");
const baselinePath = path.join(projectRoot, "database", "database.sql");
const migrationRoot = path.join(projectRoot, "database", "migrations");
const baseline = fs.readFileSync(baselinePath, "utf8");

test("canonical baseline contains the complete sanitized runtime contract", () => {
  const createdTables = [...baseline.matchAll(/CREATE TABLE IF NOT EXISTS `([^`]+)`/g)]
    .map((match) => match[1]);
  assert.equal(createdTables.length, 45);
  assert.deepEqual(new Set(createdTables), new Set(installerTables));
  assert.match(baseline, /`resolution_summary` text DEFAULT NULL/i);
  assert.doesNotMatch(baseline, /\b(?:CREATE DATABASE|USE\s+`|DROP TABLE|DROP DATABASE)\b/i);
  assert.doesNotMatch(baseline, /AUTO_INCREMENT=\d+/i);

  const allowedSeedTables = new Set([
    "roles", "departments", "permissions", "role_permissions",
    "complaint_intake_classifications", "complaint_statuses", "complaint_priorities",
    "complaint_categories", "complaint_locations", "grievance_form_options",
    "department_category_mappings", "workflow_transitions", "notification_templates",
    "system_settings", "ticket_number_settings", "schema_migrations",
  ]);
  const seededTables = [...baseline.matchAll(/INSERT(?: IGNORE)? INTO `([^`]+)`/gi)]
    .map((match) => match[1]);
  assert.ok(seededTables.length > 0);
  assert.deepEqual(seededTables.filter((table) => !allowedSeedTables.has(table)), []);
  for (const table of ["admin_users", "complaints", "admin_sessions", "admin_audit_logs", "report_jobs"]) {
    assert.equal(seededTables.includes(table), false);
  }
});

test("every migration referenced by an application script exists", () => {
  const scriptsRoot = path.resolve(__dirname, "../scripts");
  for (const filename of fs.readdirSync(scriptsRoot).filter((file) => file.endsWith(".js"))) {
    const source = fs.readFileSync(path.join(scriptsRoot, filename), "utf8");
    for (const match of source.matchAll(/database[\\/]migrations[\\/]([A-Za-z0-9_.-]+\.sql)/g)) {
      assert.ok(fs.existsSync(path.join(migrationRoot, match[1])), `${filename} references missing ${match[1]}`);
    }
  }
  assert.ok(fs.existsSync(path.join(migrationRoot, "20260728_schema_contract_repair.sql")));
  for (const file of fs.readdirSync(migrationRoot).filter((entry) => entry.endsWith(".sql"))) {
    const sql = fs.readFileSync(path.join(migrationRoot, file), "utf8");
    assert.doesNotMatch(
      sql,
      /ADD COLUMN IF NOT EXISTS/i,
      `${file} must not use MariaDB-only conditional-column syntax`,
    );
  }
});

test("non-reset installation rejects a database containing managed tables", async () => {
  const connection = {
    query: async () => [[{ TABLE_NAME: "complaints" }, { TABLE_NAME: "roles" }]],
  };
  await assert.rejects(
    () => assertInstallationTargetEmpty(connection),
    (error) => error instanceof InstallerError && error.statusCode === 409 &&
      error.details.existing_tables.includes("complaints"),
  );
});

test("non-reset installation accepts an empty target", async () => {
  const connection = { query: async () => [[]] };
  await assert.doesNotReject(() => assertInstallationTargetEmpty(connection));
});
