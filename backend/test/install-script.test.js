const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { parseArgs, readConfig } = require("../scripts/install");
const {
  buildClientEnvironmentFiles,
  normalizeConfig,
} = require("../src/services/install.service");

const validInstallerInput = {
  backend_url: "https://api.example.gov.bz",
  admin_url: "https://admin.example.gov.bz",
  frontend_url: "https://www.example.gov.bz",
  db_name: "configured_db",
  db_user: "configured_user",
  admin_name: "Super Admin",
  admin_email: "admin@example.gov.bz",
  admin_password: "StrongPassword123!",
  jwt_secret: "a-unique-production-jwt-secret-value-123456789",
  two_factor_pepper: "a-unique-production-pepper-value-123456789",
};

test("reads installer JSON from the dedicated scripts directory", () => {
  const config = readConfig("backend/scripts/install.config.example.json");

  assert.equal(typeof config, "object");
  assert.equal(config.db_name, "mhd_belize_db");
});

test("rejects installer config paths outside the dedicated directory", () => {
  assert.throws(
    () => readConfig("backend/package.json"),
    /inside backend\/scripts/,
  );
  assert.throws(
    () => readConfig("../../../../Windows/win.ini"),
    /JSON file inside backend\/scripts/,
  );
});

test("rejects unknown installer arguments", () => {
  assert.throws(() => parseArgs(["--unknown"]), /Unknown installer option/);
});

test("rejects malformed and oversized installer configs", () => {
  const scriptsRoot = path.resolve(__dirname, "../scripts");
  const malformedName = `install-malformed-${process.pid}.json`;
  const oversizedName = `install-oversized-${process.pid}.json`;
  const malformedPath = path.join(scriptsRoot, malformedName);
  const oversizedPath = path.join(scriptsRoot, oversizedName);
  try {
    fs.writeFileSync(malformedPath, "{not-json", "utf8");
    fs.writeFileSync(oversizedPath, "x".repeat((64 * 1024) + 1), "utf8");
    assert.throws(() => readConfig(malformedName), /not valid JSON/);
    assert.throws(() => readConfig(oversizedName), /no larger than 64 KB/);
  } finally {
    fs.rmSync(malformedPath, { force: true });
    fs.rmSync(oversizedPath, { force: true });
  }
});

test("development installation retains local URL defaults", () => {
  const config = normalizeConfig({
    ...validInstallerInput,
    node_env: "development",
    backend_url: undefined,
    admin_url: undefined,
    frontend_url: undefined,
  });
  assert.equal(config.backend_url, "http://localhost:5001");
  assert.equal(config.admin_url, "http://localhost:5174");
  assert.equal(config.frontend_url, "http://localhost:5173");
});

test("production installation requires all deployment URLs", () => {
  for (const field of ["backend_url", "admin_url", "frontend_url"]) {
    assert.throws(
      () => normalizeConfig({ ...validInstallerInput, node_env: "production", [field]: "" }),
      /URL is required for production installation/,
    );
  }
});

test("installer generates complete client environment files", () => {
  const config = normalizeConfig({ ...validInstallerInput, node_env: "production" });
  const files = buildClientEnvironmentFiles(config);
  assert.match(files.admin, /VITE_API_BASE_URL=https:\/\/api\.example\.gov\.bz\/api/);
  assert.match(files.admin, /VITE_BACKEND_URL=https:\/\/api\.example\.gov\.bz/);
  assert.match(files.admin, /VITE_PUBLIC_SITE_URL=https:\/\/www\.example\.gov\.bz/);
  assert.match(files.frontend, /VITE_API_BASE_URL=https:\/\/api\.example\.gov\.bz\/api/);
  assert.match(files.frontend, /VITE_BACKEND_URL=https:\/\/api\.example\.gov\.bz/);
});

test("vite production validation rejects missing and malformed URLs but accepts explicit loopback", async () => {
  const { validateViteBuildEnvironment } = await import("../../scripts/validate-vite-env.mjs");
  assert.throws(() => validateViteBuildEnvironment({
    appName: "Admin panel", command: "build", env: {},
    required: [{ name: "VITE_API_BASE_URL", allowRootRelative: true }, { name: "VITE_PUBLIC_SITE_URL" }],
  }), /VITE_API_BASE_URL is required.*VITE_PUBLIC_SITE_URL is required/s);
  assert.throws(() => validateViteBuildEnvironment({
    appName: "Public frontend", command: "build", env: { VITE_API_BASE_URL: "ftp://example.test/api" },
    required: [{ name: "VITE_API_BASE_URL", allowRootRelative: true }],
  }), /must use HTTP or HTTPS/);
  assert.doesNotThrow(() => validateViteBuildEnvironment({
    appName: "Public frontend", command: "build", env: { VITE_API_BASE_URL: "http://127.0.0.1:5001/api" },
    required: [{ name: "VITE_API_BASE_URL", allowRootRelative: true }],
  }));
  assert.doesNotThrow(() => validateViteBuildEnvironment({
    appName: "Public frontend", command: "build", env: { VITE_API_BASE_URL: "/api" },
    required: [{ name: "VITE_API_BASE_URL", allowRootRelative: true }],
  }));
});
