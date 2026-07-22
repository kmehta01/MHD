const SUPPORTED_NOTIFICATION_TEMPLATE_VARIABLES = Object.freeze([
  "ticketNumber",
  "citizenName",
  "status",
  "dueAt",
  "departmentName",
  "acknowledgementMessage",
  "recipientName",
  "organizationName",
  "organizationShortName",
  "portalName",
  "supportEmail",
  "replyToAddress",
  "emailFooterText",
]);

const supportedVariables = new Set(SUPPORTED_NOTIFICATION_TEMPLATE_VARIABLES);
const extractTemplateVariables = (template) => [
  ...String(template || "").matchAll(/\{\{([A-Za-z0-9_]+)\}\}/g),
].map((match) => match[1]);

const findUnknownTemplateVariables = (...templates) => [
  ...new Set(templates.flatMap(extractTemplateVariables).filter((key) => !supportedVariables.has(key))),
];

const validateNotificationTemplateInput = (input = {}) => {
  const value = {
    eventType: String(input.eventType || "").trim(),
    channel: String(input.channel || "").trim(),
    name: String(input.name || "").trim(),
    subjectTemplate: String(input.subjectTemplate || "").trim(),
    bodyTemplate: String(input.bodyTemplate || "").trim(),
    isActive: input.isActive !== false,
  };
  if (!value.eventType || !["email", "dashboard"].includes(value.channel) || !value.name ||
      !value.bodyTemplate || (value.channel === "email" && !value.subjectTemplate)) {
    return { error: "Event type, channel, name, body template, and an email subject for email templates are required" };
  }
  if (value.eventType.length > 50 || value.name.length > 160 || value.subjectTemplate.length > 255 || value.bodyTemplate.length > 10000) {
    return { error: "Notification template fields exceed their permitted length" };
  }
  const unknownVariables = findUnknownTemplateVariables(value.subjectTemplate, value.bodyTemplate);
  if (unknownVariables.length) {
    return {
      error: `Unsupported template variables: ${unknownVariables.map((key) => `{{${key}}}`).join(", ")}`,
      unknownVariables,
    };
  }
  return { value };
};

module.exports = {
  SUPPORTED_NOTIFICATION_TEMPLATE_VARIABLES,
  extractTemplateVariables,
  findUnknownTemplateVariables,
  validateNotificationTemplateInput,
};
