const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { parseArgs, readConfig } = require("../scripts/install");

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
