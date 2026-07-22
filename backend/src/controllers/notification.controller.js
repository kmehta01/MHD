const NotificationModel = require("../models/notification.model");
const { recordAuditEvent } = require("../services/audit-log.service");
const SettingsPolicy = require("../services/settings-policy.service");
const { resolveEmailIdentity } = require("../services/mail.service");
const {
  SUPPORTED_NOTIFICATION_TEMPLATE_VARIABLES,
  validateNotificationTemplateInput,
} = require("../config/notification-template-variables");

const getNotifications = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const perPage = Math.min(100, Math.max(1, Number.parseInt(req.query.per_page, 10) || 20));
    const result = await NotificationModel.listForUser({ userId: req.user.id, page, perPage, unreadOnly: req.query.unread === "true" });
    return res.json({ status: true, data: result.rows, pagination: { page, per_page: perPage, total: result.total }, unread_count: result.unread });
  } catch (error) { return res.status(500).json({ status: false, message: "Failed to load notifications", error: process.env.NODE_ENV === "development" ? error.message : undefined }); }
};

const markNotificationRead = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ status: false, message: "A valid notification ID is required" });
    if (!await NotificationModel.markRead({ id, userId: req.user.id })) return res.status(404).json({ status: false, message: "Notification not found" });
    return res.json({ status: true, message: "Notification marked as read" });
  } catch (error) { return res.status(500).json({ status: false, message: "Failed to update notification" }); }
};

const markAllNotificationsRead = async (req, res) => {
  try { return res.json({ status: true, data: { updated: await NotificationModel.markAllRead(req.user.id) } }); }
  catch (error) { return res.status(500).json({ status: false, message: "Failed to update notifications" }); }
};

const getTemplates = async (_req, res) => {
  try {
    const [templates, settings] = await Promise.all([
      NotificationModel.listTemplates(),
      SettingsPolicy.getPolicy(),
    ]);
    const identity = resolveEmailIdentity(settings);
    return res.json({
      status: true,
      data: templates,
      meta: {
        supportedVariables: SUPPORTED_NOTIFICATION_TEMPLATE_VARIABLES,
        emailIdentity: {
          subjectPrefix: identity.subjectPrefix,
          replyToAddress: identity.replyToAddress,
          emailFooterText: identity.emailFooterText,
        },
      },
    });
  }
  catch (error) { return res.status(500).json({ status: false, message: "Failed to load notification templates" }); }
};

const saveTemplate = async (req, res) => {
  try {
    const id = req.params.id ? Number(req.params.id) : null;
    const validation = validateNotificationTemplateInput(req.body);
    if (validation.error) {
      return res.status(400).json({
        status: false,
        message: validation.error,
        ...(validation.unknownVariables ? { errors: { variables: validation.unknownVariables } } : {}),
      });
    }
    const { eventType, channel, name, subjectTemplate, bodyTemplate, isActive } = validation.value;
    const templateId = await NotificationModel.saveTemplate({
      id, eventType, channel, name,
      subjectTemplate, bodyTemplate,
      isActive,
    });
    if (!templateId) return res.status(404).json({ status: false, message: "Notification template not found" });
    try { await recordAuditEvent(req, { eventType: "CONFIGURATION_UPDATED", resourceType: "notification_template", resourceId: templateId }); } catch {}
    return res.status(id ? 200 : 201).json({ status: true, data: { id: templateId } });
  } catch (error) {
    const conflict = error.code === "ER_DUP_ENTRY";
    return res.status(conflict ? 409 : 500).json({ status: false, message: conflict ? "A template already exists for that event and channel" : "Failed to save notification template" });
  }
};

module.exports = { getNotifications, getTemplates, markAllNotificationsRead, markNotificationRead, saveTemplate };
