const assert = require("node:assert/strict");
const test = require("node:test");
const {
  SUPPORTED_NOTIFICATION_TEMPLATE_VARIABLES,
  extractTemplateVariables,
  findUnknownTemplateVariables,
  validateNotificationTemplateInput,
} = require("../src/config/notification-template-variables");

test("notification templates expose identity and complaint variables", () => {
  for (const key of ["ticketNumber", "organizationName", "organizationShortName", "portalName", "supportEmail", "replyToAddress", "emailFooterText"]) {
    assert.ok(SUPPORTED_NOTIFICATION_TEMPLATE_VARIABLES.includes(key));
  }
  assert.deepEqual(extractTemplateVariables("{{ticketNumber}} for {{portalName}}"), ["ticketNumber", "portalName"]);
  assert.deepEqual(findUnknownTemplateVariables("{{ticketNumber}}", "{{injectedSecret}} {{portalName}}"), ["injectedSecret"]);
});

test("notification template validation requires email subjects and rejects unknown tokens", () => {
  const valid = validateNotificationTemplateInput({
    eventType: "status_change", channel: "email", name: "Citizen update",
    subjectTemplate: "{{portalName}} case {{ticketNumber}}", bodyTemplate: "Hello {{citizenName}}",
  });
  assert.equal(valid.error, undefined);
  assert.equal(valid.value.isActive, true);

  assert.match(validateNotificationTemplateInput({
    eventType: "status_change", channel: "email", name: "Missing subject", bodyTemplate: "Body",
  }).error, /email subject/i);

  const unknown = validateNotificationTemplateInput({
    eventType: "status_change", channel: "dashboard", name: "Injected", bodyTemplate: "{{smtpPassword}}",
  });
  assert.deepEqual(unknown.unknownVariables, ["smtpPassword"]);
});
