const assert = require("node:assert/strict");
const test = require("node:test");
const {
  requireGeneralSettingsPermission,
  requireGeneralSettingsSuperAdmin,
} = require("../src/middlewares/settings-access.middleware");
const {
  validateGeneralSettingsPayload,
  validateSettingsReset,
  validateValue,
} = require("../src/validators/settings.validator");
const SettingsService = require("../src/services/settings.service");
const SettingsPolicy = require("../src/services/settings-policy.service");
const { generalSettingDefinitions, generalSettingsDefaults } = require("../src/utils/default-general-settings");
const db = require("../src/config/db");

test.after(async () => db.end());

const clone = (value) => JSON.parse(JSON.stringify(value));

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test("General Settings always denies Ministry users", () => {
  const req = {
    user: {
      role_slug: "ministry-user",
      permissions: ["settings.general.view", "settings.general.history"],
    },
  };
  const res = createResponse();
  let continued = false;

  requireGeneralSettingsPermission("settings.general.view")(req, res, () => {
    continued = true;
  });

  assert.equal(continued, false);
  assert.equal(res.statusCode, 403);
});

test("General Settings allows an Admin with the requested read permission", () => {
  const req = {
    user: { role_slug: "admin", permissions: ["settings.general.view"] },
  };
  const res = createResponse();
  let continued = false;

  requireGeneralSettingsPermission("settings.general.view")(req, res, () => {
    continued = true;
  });

  assert.equal(continued, true);
  assert.equal(res.statusCode, 200);
});

test("General Settings mutations remain Super Admin only", () => {
  const req = {
    user: { role_slug: "admin", permissions: ["settings.general.update"] },
  };
  const res = createResponse();
  let continued = false;

  requireGeneralSettingsSuperAdmin(req, res, () => {
    continued = true;
  });

  assert.equal(continued, false);
  assert.equal(res.statusCode, 403);
});

test("General Settings validates and normalizes supported fields", async (t) => {
  t.mock.method(SettingsService, "getGeneralSettings", async () => clone(generalSettingsDefaults));
  const req = {
    body: {
      settings: {
        organization: {
          organizationName: "  Government of Belize  ",
          settingsUploadMaxKb: 1024,
        },
        grievanceSubmission: { maximumAttachmentCount: 4 },
      },
      reason: "Policy update",
    },
  };
  const res = createResponse();
  let continued = false;

  await validateGeneralSettingsPayload(req, res, () => {
    continued = true;
  });

  assert.equal(continued, true);
  assert.equal(req.validatedSettings.organization.organizationName, "Government of Belize");
  assert.equal(req.validatedSettings.grievanceSubmission.maximumAttachmentCount, 4);
});

test("General Settings rejects unsafe and unknown fields", async (t) => {
  t.mock.method(SettingsService, "getGeneralSettings", async () => clone(generalSettingsDefaults));
  const req = {
    body: {
      settings: {
        organization: {
          organizationName: "<script>alert(1)</script>",
          unknownSetting: true,
        },
      },
    },
  };
  const res = createResponse();

  await validateGeneralSettingsPayload(req, res, () => {});

  assert.equal(res.statusCode, 422);
  assert.ok(res.body.errors["organization.organizationName"]);
  assert.ok(res.body.errors["organization.unknownSetting"]);
});

test("General Settings rejects unsupported and empty attachment policies", async (t) => {
  t.mock.method(SettingsService, "getGeneralSettings", async () => clone(generalSettingsDefaults));
  const req = { body: { settings: {
    grievanceSubmission: { allowedFileTypes: ["PDF", "EXE"] },
    workflow: { resolutionDocumentAllowedFileTypes: [] },
  } } };
  const res = createResponse();
  await validateGeneralSettingsPayload(req, res, () => {});
  assert.equal(res.statusCode, 422);
  assert.ok(res.body.errors["grievanceSubmission.allowedFileTypes"]);
  assert.ok(res.body.errors["workflow.resolutionDocumentAllowedFileTypes"]);
});

test("General Settings reset requires exact confirmation and a reason", () => {
  const invalidReq = { body: { confirmation: "RESET", reason: "no" } };
  const invalidRes = createResponse();
  validateSettingsReset(invalidReq, invalidRes, () => {});
  assert.equal(invalidRes.statusCode, 422);

  const validReq = {
    body: {
      confirmation: "RESET GENERAL SETTINGS",
      reason: "Return to approved defaults",
    },
  };
  const validRes = createResponse();
  let continued = false;
  validateSettingsReset(validReq, validRes, () => {
    continued = true;
  });
  assert.equal(continued, true);
});

test("all 135 authoritative defaults satisfy their field definitions", () => {
  assert.equal(generalSettingDefinitions.length, 135);
  for (const definition of generalSettingDefinitions) {
    const result = validateValue(definition, definition.defaultValue);
    assert.equal(result.error, undefined, `${definition.settingKey}: ${result.error}`);
  }
});

test("General Settings reject invalid IANA time zones", () => {
  const definition = generalSettingDefinitions.find((item) => item.settingKey === "portal.timeZone");
  assert.match(validateValue(definition, "Belize/Somewhere").error, /valid IANA time zone/);
});

test("CAPTCHA readiness is required when enabling it, but not for unrelated recovery edits", async (t) => {
  const current = clone(generalSettingsDefaults);
  t.mock.method(SettingsService, "getGeneralSettings", async () => clone(current));
  t.mock.method(SettingsPolicy, "getRuntimeCapabilities", () => ({
    captcha: { configured: false }, email: { configured: true },
    twoFactor: { configured: true }, pii: { configured: true },
  }));
  const blocked = createResponse();
  await validateGeneralSettingsPayload({
    body: { settings: { grievanceSubmission: { enableCaptcha: true } } },
  }, blocked, () => {});
  assert.equal(blocked.statusCode, 422);
  assert.ok(blocked.body.errors["grievanceSubmission.enableCaptcha"]);

  current.grievanceSubmission.enableCaptcha = true;
  const recovery = createResponse();
  let continued = false;
  await validateGeneralSettingsPayload({
    body: { settings: { portal: { portalSubtitle: "Updated safely" } } },
  }, recovery, () => { continued = true; });
  assert.equal(continued, true);
});
