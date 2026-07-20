const assert = require("node:assert/strict");
const test = require("node:test");
const {
  requireGeneralSettingsPermission,
  requireGeneralSettingsSuperAdmin,
} = require("../src/middlewares/settings-access.middleware");
const {
  validateGeneralSettingsPayload,
  validateSettingsReset,
} = require("../src/validators/settings.validator");

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

test("General Settings validates and normalizes supported fields", () => {
  const req = {
    body: {
      settings: {
        organization: {
          organizationName: "  Government of Belize  ",
          settingsUploadMaxKb: 1024,
        },
        ticket: { ticketPrefix: "GRM-TEST" },
      },
      reason: "Policy update",
    },
  };
  const res = createResponse();
  let continued = false;

  validateGeneralSettingsPayload(req, res, () => {
    continued = true;
  });

  assert.equal(continued, true);
  assert.equal(req.validatedSettings.organization.organizationName, "Government of Belize");
  assert.equal(req.validatedSettings.ticket.ticketPrefix, "GRM-TEST");
});

test("General Settings rejects unsafe and unknown fields", () => {
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

  validateGeneralSettingsPayload(req, res, () => {});

  assert.equal(res.statusCode, 422);
  assert.ok(res.body.errors["organization.organizationName"]);
  assert.ok(res.body.errors["organization.unknownSetting"]);
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
