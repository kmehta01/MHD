const assert = require("node:assert/strict");
const test = require("node:test");
const nodemailer = require("nodemailer");
const {
  applyEmailIdentity,
  resetTransporterForTests,
  resolveEmailIdentity,
  sendEmail,
  sendLoginOtp,
} = require("../src/services/mail.service");

const settings = (overrides = {}) => ({
  organization: {
    organizationName: "Configured Agency",
    organizationShortName: "CA",
    portalName: "Citizen Portal",
    officialEmail: "official@example.test",
    ...(overrides.organization || {}),
  },
  portal: {},
  footer: { supportEmail: "support@example.test", ...(overrides.footer || {}) },
  email: { subjectPrefix: "", replyToAddress: "", footerText: "", ...(overrides.email || {}) },
});

test("email identity follows configured fallback precedence", () => {
  assert.deepEqual(resolveEmailIdentity(settings()), {
    organizationName: "Configured Agency",
    organizationShortName: "CA",
    portalName: "Citizen Portal",
    supportEmail: "support@example.test",
    replyToAddress: "support@example.test",
    emailFooterText: "Configured Agency · Citizen Portal",
    subjectPrefix: "CA",
  });
  const explicit = resolveEmailIdentity(settings({ email: {
    subjectPrefix: "Cases", replyToAddress: "reply@example.test", footerText: "Custom footer",
  } }));
  assert.equal(explicit.subjectPrefix, "Cases");
  assert.equal(explicit.replyToAddress, "reply@example.test");
  assert.equal(explicit.emailFooterText, "Custom footer");
});

test("email identity prefixes subjects and escapes HTML footers", () => {
  const output = applyEmailIdentity({ subject: "Update", text: "Body", html: "<p>Body</p>" }, {
    subjectPrefix: "Portal", emailFooterText: "Agency <Support>",
  });
  assert.equal(output.subject, "[Portal] Update");
  assert.match(output.text, /--\nAgency <Support>$/);
  assert.match(output.html, /Agency &lt;Support&gt;/);
});

test("OTP and queued email use SMTP_FROM, Reply-To, current identity, and escaped HTML", async (t) => {
  const messages = [];
  t.mock.method(nodemailer, "createTransport", () => ({
    sendMail: async (message) => { messages.push(message); },
    verify: async () => true,
  }));
  process.env.SMTP_HOST = "smtp.example.test";
  process.env.SMTP_PORT = "587";
  process.env.SMTP_FROM = "verified@example.test";
  resetTransporterForTests();

  await sendLoginOtp({
    email: "admin@example.test", name: "Admin <User>", otp: "123456",
    expiresInMinutes: 10, settings: settings(),
  });
  await sendEmail({
    to: "citizen@example.test", subject: "Case update", text: "Resolved",
    html: "<p>Resolved</p>", settings: settings(),
  });

  assert.equal(messages[0].from, "verified@example.test");
  assert.equal(messages[0].replyTo, "support@example.test");
  assert.equal(messages[0].subject, "[CA] Administrator verification code");
  assert.match(messages[0].html, /Admin &lt;User&gt;/);
  assert.match(messages[0].html, /Citizen Portal/);
  assert.equal(messages[1].subject, "[CA] Case update");
  assert.match(messages[1].text, /Configured Agency · Citizen Portal$/);
});
