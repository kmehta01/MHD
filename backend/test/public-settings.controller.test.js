const assert = require("node:assert/strict");
const test = require("node:test");
const SettingsService = require("../src/services/settings.service");
const { getPublicSettings } = require("../src/controllers/public-settings.controller");

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test("public settings expose CAPTCHA readiness and site key without secrets", async (t) => {
  const previousSiteKey = process.env.RECAPTCHA_SITE_KEY;
  const previousSecret = process.env.RECAPTCHA_SECRET_KEY;
  process.env.RECAPTCHA_SITE_KEY = "browser-site-key";
  process.env.RECAPTCHA_SECRET_KEY = "never-return-this-secret";
  t.after(() => {
    if (previousSiteKey === undefined) delete process.env.RECAPTCHA_SITE_KEY;
    else process.env.RECAPTCHA_SITE_KEY = previousSiteKey;
    if (previousSecret === undefined) delete process.env.RECAPTCHA_SECRET_KEY;
    else process.env.RECAPTCHA_SECRET_KEY = previousSecret;
  });
  t.mock.method(SettingsService, "getPublicGeneralSettings", async () => ({
    grievanceSubmission: { enableCaptcha: true },
  }));
  t.mock.method(SettingsService, "getGeneralSettingsVersion", async () => "settings-version");

  const res = createResponse();
  await getPublicSettings({}, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.meta.capabilities.captcha, {
    enabled: true,
    ready: true,
    siteKey: "browser-site-key",
    provider: "google-recaptcha-v2",
  });
  assert.equal(JSON.stringify(res.body).includes("never-return-this-secret"), false);
});

test("public settings suppress the CAPTCHA site key while CAPTCHA is disabled", async (t) => {
  t.mock.method(SettingsService, "getPublicGeneralSettings", async () => ({
    grievanceSubmission: { enableCaptcha: false },
  }));
  t.mock.method(SettingsService, "getGeneralSettingsVersion", async () => "settings-version");

  const res = createResponse();
  await getPublicSettings({}, res);

  assert.equal(res.body.meta.capabilities.captcha.enabled, false);
  assert.equal(res.body.meta.capabilities.captcha.siteKey, "");
});
