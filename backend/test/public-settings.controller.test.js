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
  const previousSmtpUser = process.env.SMTP_USER;
  const previousSmtpPassword = process.env.SMTP_PASSWORD;
  process.env.RECAPTCHA_SITE_KEY = "browser-site-key";
  process.env.RECAPTCHA_SECRET_KEY = "never-return-this-secret";
  process.env.SMTP_USER = "private-smtp-user";
  process.env.SMTP_PASSWORD = "never-return-this-smtp-password";
  t.after(() => {
    if (previousSiteKey === undefined) delete process.env.RECAPTCHA_SITE_KEY;
    else process.env.RECAPTCHA_SITE_KEY = previousSiteKey;
    if (previousSecret === undefined) delete process.env.RECAPTCHA_SECRET_KEY;
    else process.env.RECAPTCHA_SECRET_KEY = previousSecret;
    if (previousSmtpUser === undefined) delete process.env.SMTP_USER;
    else process.env.SMTP_USER = previousSmtpUser;
    if (previousSmtpPassword === undefined) delete process.env.SMTP_PASSWORD;
    else process.env.SMTP_PASSWORD = previousSmtpPassword;
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
  assert.equal(res.body.meta.capabilities.attachments.types.length, 8);
  assert.deepEqual(Object.keys(res.body.meta.capabilities.attachments.types[0]).sort(), ["extensions", "key", "label", "mimeTypes"].sort());
  assert.equal(JSON.stringify(res.body).includes("never-return-this-secret"), false);
  assert.equal(JSON.stringify(res.body).includes("private-smtp-user"), false);
  assert.equal(JSON.stringify(res.body).includes("never-return-this-smtp-password"), false);
  assert.equal(Object.hasOwn(res.body.data, "email"), false);
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
