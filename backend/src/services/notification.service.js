const crypto = require("crypto");
const NotificationModel = require("../models/notification.model");
const SettingsPolicy = require("./settings-policy.service");
const { resolveEmailIdentity, sendEmail } = require("./mail.service");

const EVENT_TOGGLES = Object.freeze({
  due_reminder: "notifyDueDateReminder", overdue: "notifyOverdueGrievance",
  resolution: "notifyAdminResolutionSubmission", returned: "notifyDepartmentResolutionReturned",
  status_change: "notifyCitizenStatusChange", closure: "notifyCitizenGrievanceClosed",
});

const render = (template, payload) => String(template || "").replace(/\{\{([A-Za-z0-9_]+)\}\}/g, (_match, key) => String(payload[key] ?? ""));

const getAdminRecipients = async (eventType, context, settings) => {
  if (eventType === "submission") {
    const roles = [];
    if (settings.notifications.notifySuperAdminNewGrievance) roles.push("super-admin");
    if (settings.notifications.notifyAdminNewGrievance) roles.push("admin");
    return roles.length ? NotificationModel.findAdministratorRecipients({ roleSlugs: roles }) : [];
  }
  if (["assignment", "due_reminder", "overdue", "returned"].includes(eventType)) {
    if (eventType === "assignment" && !(settings.assignment.notifyDepartmentOnAssignment && settings.notifications.notifyDepartmentOnAssignment)) return [];
    return context.assigned_department_id
      ? NotificationModel.findAdministratorRecipients({ departmentId: context.assigned_department_id }) : [];
  }
  if (eventType === "resolution") return NotificationModel.findAdministratorRecipients({ roleSlugs: ["super-admin", "admin"] });
  if (eventType === "closure") return NotificationModel.findAdministratorRecipients({ roleSlugs: ["super-admin", "admin"] });
  return [];
};

const enqueueComplaintEvent = async ({ eventType, complaintId, eventKey, extra = {} }) => {
  const [settings, context] = await Promise.all([SettingsPolicy.getPolicy(), NotificationModel.findComplaintContext(complaintId)]);
  if (!context) return [];
  const toggle = EVENT_TOGGLES[eventType];
  if (toggle && !settings.notifications[toggle]) return [];
  const payload = {
    ticketNumber: context.token_number, citizenName: context.comp_name || "Citizen",
    status: context.status, dueAt: context.due_at ? new Date(context.due_at).toISOString() : "",
    departmentName: context.department_name || "Unassigned",
    acknowledgementMessage: settings.ticket.acknowledgementMessage,
    ...resolveEmailIdentity(settings),
    ...extra,
  };
  const baseKey = eventKey || `${eventType}:${complaintId}:${crypto.randomUUID()}`;
  const queued = [];
  const adminRecipients = await getAdminRecipients(eventType, context, settings);

  if (settings.notifications.enableDashboardNotifications) {
    const template = await NotificationModel.findTemplate(eventType, "dashboard");
    if (template) for (const recipient of adminRecipients) {
      queued.push(await NotificationModel.enqueue({
        idempotencyKey: `${baseKey}:dashboard:${recipient.id}`, eventType, channel: "dashboard",
        complaintId, adminUserId: recipient.id, templateId: template.id, payload,
      }));
    }
  }

  if (settings.notifications.enableEmailNotifications) {
    const template = await NotificationModel.findTemplate(eventType, "email");
    if (template) {
      for (const recipient of adminRecipients) {
        queued.push(await NotificationModel.enqueue({
          idempotencyKey: `${baseKey}:email:admin:${recipient.id}`, eventType, channel: "email",
          complaintId, adminUserId: recipient.id, recipientEmail: recipient.email, templateId: template.id,
          payload: { ...payload, recipientName: recipient.name },
        }));
      }
      const citizenEvent = (eventType === "submission" && settings.ticket.sendSubmissionAcknowledgement) ||
        eventType === "status_change" || eventType === "closure";
      if (citizenEvent && context.comp_email) {
        queued.push(await NotificationModel.enqueue({
          idempotencyKey: `${baseKey}:email:citizen`, eventType, channel: "email", complaintId,
          recipientEmail: context.comp_email, templateId: template.id, payload,
        }));
      }
    }
  }
  return queued.filter(Boolean);
};

const processNext = async (owner = crypto.randomUUID()) => {
  const item = await NotificationModel.claimNext(owner);
  if (!item) return false;
  try {
    const settings = await SettingsPolicy.getPolicy();
    const storedPayload = typeof item.payload === "string" ? JSON.parse(item.payload) : item.payload;
    const payload = { ...storedPayload, ...resolveEmailIdentity(settings) };
    const title = render(item.subject_template || item.template_name || "Grievance notification", payload);
    const message = render(item.body_template, payload);
    if (item.channel === "dashboard") {
      if (!item.admin_user_id) throw new Error("Dashboard notification recipient is missing");
      await NotificationModel.createDashboardNotification(item, title, message);
    } else {
      await sendEmail({ to: item.recipient_email, subject: title, text: message, settings });
    }
    await NotificationModel.complete(item.id);
  } catch (error) {
    await NotificationModel.fail(item.id, error.message, item.attempts);
  }
  return true;
};

module.exports = { enqueueComplaintEvent, processNext, render };
