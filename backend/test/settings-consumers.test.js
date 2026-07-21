const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const { generalSettingDefinitions } = require("../src/utils/default-general-settings");
const { buildSettingsConsumerRegistry } = require("../src/config/settings-consumers");

test("every retained General Setting declares at least one runtime consumer", () => {
  const registry = buildSettingsConsumerRegistry(generalSettingDefinitions);
  const orphaned = generalSettingDefinitions
    .filter((definition) => !registry.get(definition.settingKey)?.length)
    .map((definition) => definition.settingKey);

  assert.deepEqual(orphaned, []);
  assert.equal(registry.size, generalSettingDefinitions.length);

  const projectRoot = path.resolve(__dirname, "../..");
  const missingModules = [...new Set([...registry.values()].flat())]
    .filter((modulePath) => !fs.existsSync(path.join(projectRoot, modulePath)));
  assert.deepEqual(missingModules, []);

  for (const [settingKey, consumers] of registry) {
    assert.ok(consumers.length, `${settingKey} must declare a source file that directly consumes it`);
  }
});
