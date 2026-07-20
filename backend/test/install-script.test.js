const test = require("node:test");
const assert = require("node:assert/strict");
const { readConfig } = require("../scripts/install");

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
