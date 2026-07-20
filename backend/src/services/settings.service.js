const SettingsModel = require("../models/settings.model");
const {
  generalSettingDefinitions,
  generalSettingsDefinitionMap,
  generalSettingsDefaults,
} = require("../utils/default-general-settings");

const CACHE_TTL_MS = 5 * 60 * 1000;
let generalSettingsCache = null;

const clone = (value) => JSON.parse(JSON.stringify(value));

const serializeValue = (value, valueType) => {
  if (valueType === "boolean") return value ? "1" : "0";
  if (valueType === "json") return JSON.stringify(value);
  return String(value ?? "");
};

const deserializeValue = (value, valueType, fallback) => {
  if (value === null || value === undefined) return fallback;
  if (valueType === "boolean") return value === "1" || value === "true";
  if (valueType === "number") {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }
  if (valueType === "json") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return String(value);
};

const clearGeneralSettingsCache = () => {
  generalSettingsCache = null;
};

const getGeneralSettings = async ({ bypassCache = false } = {}) => {
  if (
    !bypassCache &&
    generalSettingsCache &&
    generalSettingsCache.expiresAt > Date.now()
  ) {
    return clone(generalSettingsCache.value);
  }

  const rows = await SettingsModel.findGeneralSettings();
  const settings = clone(generalSettingsDefaults);
  for (const row of rows) {
    const definition = generalSettingsDefinitionMap.get(row.setting_key);
    if (!definition) continue;
    settings[definition.group][definition.key] = deserializeValue(
      row.setting_value,
      row.value_type,
      definition.defaultValue,
    );
  }

  generalSettingsCache = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value: clone(settings),
  };
  return settings;
};

const getRequestContext = (req, reason) => ({
  userId: req.user.id,
  reason: reason || null,
  ipAddress: String(req.ip || req.socket?.remoteAddress || "").replace(/^::ffff:/, "").slice(0, 45) || null,
  userAgent: String(req.get?.("user-agent") || "").slice(0, 2000) || null,
});

const updateGeneralSettings = async ({ settings, req, reason }) => {
  const changes = await SettingsModel.withTransaction(async (connection) => {
    const appliedChanges = [];

    for (const [group, values] of Object.entries(settings)) {
      for (const [key, value] of Object.entries(values)) {
        const definition = generalSettingsDefinitionMap.get(`${group}.${key}`);
        if (!definition) continue;

        const serializedValue = serializeValue(value, definition.valueType);
        const existing = await SettingsModel.findSettingForUpdate(
          definition.settingKey,
          connection,
        );
        if (existing && existing.setting_value === serializedValue) continue;

        const setting = {
          ...definition,
          serializedValue,
          isEncrypted: false,
        };
        const settingId = existing
          ? existing.id
          : await SettingsModel.createSetting(setting, req.user.id, connection);

        if (existing) {
          await SettingsModel.updateSetting(settingId, setting, req.user.id, connection);
        }

        await SettingsModel.createSettingLog(
          {
            settingId,
            settingKey: definition.settingKey,
            oldValue: existing?.setting_value ?? null,
            newValue: serializedValue,
          },
          getRequestContext(req, reason),
          connection,
        );
        appliedChanges.push(definition.settingKey);
      }
    }

    return appliedChanges;
  });

  clearGeneralSettingsCache();
  return {
    changes,
    settings: await getGeneralSettings({ bypassCache: true }),
    meta: await SettingsModel.findLastGeneralSettingsUpdate(),
  };
};

const resetGeneralSettings = async ({ req, reason }) =>
  updateGeneralSettings({ settings: clone(generalSettingsDefaults), req, reason });

const updateGeneralSettingsAsset = async ({ assetType, filePath, req }) => {
  const definition = generalSettingsDefinitionMap.get(`organization.${assetType}`);
  if (!definition) throw new Error("Unsupported settings asset");

  const current = await getGeneralSettings();
  const previousFilePath = current.organization[assetType] || "";
  const result = await updateGeneralSettings({
    settings: { organization: { [assetType]: filePath } },
    req,
    reason: `Replaced organization ${assetType}`,
  });

  return { ...result, previousFilePath };
};

const getGeneralSettingsHistory = async ({ limit, offset }) => {
  const rows = await SettingsModel.findGeneralSettingsHistory({ limit, offset });
  return rows.map((row) => ({
    ...row,
    old_value: row.is_encrypted ? "••••••••" : row.old_value,
    new_value: row.is_encrypted ? "••••••••" : row.new_value,
  }));
};

const seedGeneralSettings = async (executor, userId = null) => {
  for (const definition of generalSettingDefinitions) {
    await executor.query(
      `INSERT INTO system_settings
         (setting_group, setting_key, setting_value, value_type, is_public,
          is_encrypted, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)
       ON DUPLICATE KEY UPDATE
         setting_group = VALUES(setting_group),
         value_type = VALUES(value_type),
         is_public = VALUES(is_public)`,
      [
        definition.group,
        definition.settingKey,
        serializeValue(definition.defaultValue, definition.valueType),
        definition.valueType,
        definition.isPublic ? 1 : 0,
        userId,
        userId,
      ],
    );
  }
};

module.exports = {
  clearGeneralSettingsCache,
  getGeneralSettings,
  getGeneralSettingsHistory,
  resetGeneralSettings,
  seedGeneralSettings,
  updateGeneralSettings,
  updateGeneralSettingsAsset,
};
