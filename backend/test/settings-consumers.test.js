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

  const notReferenced = generalSettingDefinitions.filter((definition) => {
    const consumerSource = registry.get(definition.settingKey)
      .map((modulePath) => fs.readFileSync(path.join(projectRoot, modulePath), "utf8"))
      .join("\n");
    const escaped = definition.key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return !new RegExp(`(?:\\.|["'])${escaped}(?:["']|\\b)`).test(consumerSource);
  }).map((definition) => definition.settingKey);
  assert.deepEqual(notReferenced, []);
});
