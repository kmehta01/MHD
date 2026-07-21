const {
  generalSettingDefinitions,
} = require("../src/utils/default-general-settings");
const {
  buildSettingsConsumerRegistry,
  SETTINGS_GROUP_RUNTIME,
} = require("../src/config/settings-consumers");

const registry = buildSettingsConsumerRegistry(generalSettingDefinitions);
const missing = [];

console.log("# General Settings runtime audit\n");
console.log(`Generated from the ${generalSettingDefinitions.length} authoritative definitions.\n`);

for (const definition of generalSettingDefinitions) {
  const consumers = registry.get(definition.settingKey) || [];
  const runtime = SETTINGS_GROUP_RUNTIME[definition.group];
  if (!consumers.length) missing.push(definition.settingKey);
  console.log(`## \`${definition.settingKey}\``);
  console.log(`- Type: ${definition.valueType}; public: ${definition.isPublic ? "yes" : "no"}`);
  console.log(`- Activation: ${runtime?.activation || "undocumented"}`);
  console.log(`- Enforcement: ${runtime?.enforcement || "undocumented"}`);
  console.log(`- Direct consumers: ${consumers.length ? consumers.map((item) => `\`${item}\``).join(", ") : "**NONE**"}\n`);
}

if (missing.length) {
  console.error(`Missing runtime consumers: ${missing.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log(`Audit passed: ${generalSettingDefinitions.length} settings have direct runtime consumers.`);
}
