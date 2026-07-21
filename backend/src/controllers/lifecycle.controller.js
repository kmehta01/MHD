const path = require("path");
const ComplaintModel = require("../models/complaint.model");
const LifecycleModel = require("../models/lifecycle.model");
const SettingsPolicy = require("../services/settings-policy.service");
const { getGrievanceScope, hasPermission } = require("../utils/access-scope");
const { recordAuditEvent } = require("../services/audit-log.service");
const NotificationService = require("../services/notification.service");
const { createPolicyCalendar, parsePortalDateTime } = require("../services/due-date.service");
const { removeUploadedFiles } = require("../middlewares/complaint-upload.middleware");

const backendRoot = path.resolve(__dirname, "../..");
const error = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const id = (value, label = "ID") => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw error(`A valid ${label} is required`);
  return parsed;
};
const text = (value, label, { required = false, max = 5000 } = {}) => {
  const parsed = String(value || "").trim();
  if (required && !parsed) throw error(`${label} is required`);
  if (parsed.length > max) throw error(`${label} must not exceed ${max} characters`);
  return parsed;
};
const sendError = (res, caught, fallback) => res.status(caught.statusCode || 500).json({
  status: false, message: caught.statusCode ? caught.message : fallback,
  error: process.env.NODE_ENV === "development" && !caught.statusCode ? caught.message : undefined,
});
const ensureAccess = async (req) => {
  const complaintId = id(req.params.id, "complaint ID");
  const complaint = await ComplaintModel.findById(complaintId, getGrievanceScope(req.user));
  if (!complaint) throw error("Complaint ticket not found", 404);
  return { complaint, complaintId };
};
const audit = async (req, eventType, complaintId) => {
  try { await recordAuditEvent(req, { eventType, resourceType: "complaint", resourceId: complaintId }); }
  catch (caught) { console.error(`Failed to audit ${eventType}:`, caught.message); }
};
const notify = async (eventType, complaintId, extra = {}) => {
  try {
    await NotificationService.enqueueComplaintEvent({
      eventType, complaintId,
      eventKey: `${eventType}:${complaintId}:${Date.now()}`,
      extra,
    });
  } catch (caught) { console.error(`Failed to enqueue ${eventType} notification:`, caught.message); }
};

const getLifecycle = async (req, res) => {
  try {
    const { complaintId } = await ensureAccess(req);
    return res.json({ status: true, data: await LifecycleModel.getLifecycle(complaintId) });
  } catch (caught) { return sendError(res, caught, "Failed to load grievance lifecycle"); }
};

const assignComplaint = async (req, res) => {
  try {
    const { complaintId, complaint } = await ensureAccess(req);
    const settings = await SettingsPolicy.getPolicy();
    if (!settings.assignment.allowAdminAssignment) throw error("Assignments are disabled by General Settings", 403);
    const note = text(req.body.note, "Assignment note", { required: settings.assignment.internalAssignmentNoteRequired });
    const officerId = req.body.officerId ? id(req.body.officerId, "officer") : null;
    if (settings.assignment.departmentOfficerSelectionRequired && !officerId) throw error("An officer must be selected for this assignment");
    const result = await LifecycleModel.assign({
      complaintId, departmentId: id(req.body.departmentId, "department"), officerId,
      priorityRef: req.body.priority || settings.assignment.defaultAssignmentPriority,
      note, actorId: req.user.id,
      source: complaint.assigned_department_id ? "reassignment" : "manual",
    });
    await audit(req, "GRIEVANCE_ASSIGNED", complaintId);
    await notify("assignment", complaintId);
    return res.json({ status: true, message: "Grievance assigned successfully", data: result });
  } catch (caught) { return sendError(res, caught, "Failed to assign grievance"); }
};

const reassignComplaint = async (req, res) => {
  try {
    const { complaintId } = await ensureAccess(req);
    const settings = await SettingsPolicy.getPolicy();
    const reason = text(req.body.reason, "Reassignment reason", { required: true });
    const departmentId = id(req.body.departmentId, "department");
    if (settings.assignment.allowDirectDepartmentReassignment && hasPermission(req.user, "grievances.reassign")) {
      const officerId = req.body.officerId ? id(req.body.officerId, "officer") : null;
      if (settings.assignment.departmentOfficerSelectionRequired && !officerId) throw error("An officer must be selected for this reassignment");
      const result = await LifecycleModel.assign({ complaintId, departmentId, officerId, note: reason, actorId: req.user.id, source: "reassignment" });
      await audit(req, "GRIEVANCE_ASSIGNED", complaintId);
      await notify("assignment", complaintId);
      return res.json({ status: true, message: "Grievance reassigned successfully", data: result });
    }
    if (!settings.assignment.allowDepartmentReassignmentRequest) throw error("Reassignment requests are disabled by General Settings", 403);
    const requestId = await LifecycleModel.requestReassignment({ complaintId, departmentId, reason, actorId: req.user.id });
    return res.status(201).json({ status: true, message: "Reassignment request submitted", data: { id: requestId } });
  } catch (caught) { return sendError(res, caught, "Failed to request reassignment"); }
};

const decideReassignment = async (req, res) => {
  try {
    const requestId = id(req.params.requestId, "request ID");
    const approved = req.body.approved === true;
    const result = await LifecycleModel.decideReassignment({
      requestId, approved, note: text(req.body.note, "Decision note", { required: !approved }), actorId: req.user.id,
      officerId: req.body.officerId ? id(req.body.officerId, "officer") : null,
    });
    if (!result) throw error("Reassignment request not found", 404);
    await audit(req, "GRIEVANCE_REASSIGNMENT_DECIDED", result.request.complaint_id);
    if (approved) await notify("assignment", result.request.complaint_id);
    return res.json({ status: true, message: `Reassignment request ${approved ? "approved" : "rejected"}` });
  } catch (caught) { return sendError(res, caught, "Failed to decide reassignment request"); }
};

const changeStatus = async (req, res) => {
  try {
    const { complaintId, complaint } = await ensureAccess(req);
    const settings = await SettingsPolicy.getPolicy();
    const target = text(req.body.status, "Target status", { required: true, max: 80 });
    const comment = text(req.body.comment, "Status comment", { required: settings.workflow.requireCommentOnStatusChange });
    const workflow = await ConfigurationModel.listWorkflow();
    const targetStatus = workflow.statuses.find((item) => item.is_active && (item.status_key === target || item.name === target || String(item.id) === target));
    if (!targetStatus) throw error("Target status is unavailable");
    const normalized = targetStatus.status_key;
    if (settings.workflow.adminReviewRequired && complaint.status_key === "new" && normalized === "under_review" &&
        !hasPermission(req.user, "grievances.review_new")) {
      throw error("Administrator review is required before this grievance can move forward", 403);
    }
    if (normalized === "closed" && !hasPermission(req.user, "grievances.close")) throw error("You do not have permission to close grievances", 403);
    if (normalized === "closed" && settings.workflow.adminApprovalBeforeClosure && !["super-admin", "admin"].includes(req.user.role_slug)) throw error("Administrator approval is required before closure", 403);
    if (complaint.status_key === "closed") {
      if (!settings.workflow.allowReopening) throw error("Reopening is disabled by General Settings", 403);
      const allowedRoles = settings.workflow.reopenPermission === "Super Admin Only" ? ["super-admin"] : ["super-admin", "admin"];
      if (!allowedRoles.includes(req.user.role_slug)) throw error("You do not have permission to reopen grievances", 403);
    }
    if (settings.workflow.departmentAcceptanceRequired && normalized === "in progress" && !complaint.assigned_department_id) {
      throw error("The grievance must be assigned before it can be accepted");
    }
    const attachments = (req.files || []).map((file) => ({
      originalName: file.originalname, storedName: file.filename, mimeType: file.mimetype,
      fileSize: file.size, storagePath: path.relative(backendRoot, file.path).replace(/\\/g, "/"),
    }));
    const isResolution = targetStatus.reporting_group === "resolved";
    if (!isResolution && attachments.length) {
      throw error("Resolution documents can only be uploaded with a resolved status");
    }
    if (isResolution && settings.workflow.requireResolutionDocument && !attachments.length) {
      throw error("A resolution document is required");
    }
    const resolutionSummary = isResolution
      ? text(req.body.resolutionSummary, "Resolution summary", { required: true, max: 10000 })
      : null;
    const result = await LifecycleModel.transition({ complaintId, toStatusRef: target, comment, actorId: req.user.id, resolutionSummary, attachments });
    await audit(req, "GRIEVANCE_STATUS_CHANGED", complaintId);
    const eventType = result.toStatus.notification_event;
    await notify(eventType, complaintId, { status: result.toStatus.name });
    return res.json({ status: true, message: `Grievance moved to ${result.toStatus.name}`, data: result });
  } catch (caught) {
    await removeUploadedFiles(req.files || []);
    return sendError(res, caught, "Failed to change grievance status");
  }
};

const addComment = async (req, res) => {
  try {
    const { complaintId } = await ensureAccess(req);
    const commentId = await LifecycleModel.addInternalComment({ complaintId, comment: text(req.body.comment, "Comment", { required: true, max: 10000 }), actorId: req.user.id });
    return res.status(201).json({ status: true, data: { id: commentId } });
  } catch (caught) { return sendError(res, caught, "Failed to add internal comment"); }
};

const requestDueDate = async (req, res) => {
  try {
    const { complaintId } = await ensureAccess(req);
    const settings = await SettingsPolicy.getPolicy();
    if (!settings.dueDate.dueDateRequired) throw error("Due dates are disabled by General Settings", 403);
    if (req.user.role_slug !== "super-admin" && !settings.dueDate.allowDepartmentChangeDueDate) {
      throw error("Department due-date changes are disabled by General Settings", 403);
    }
    let dueAt;
    try { dueAt = parsePortalDateTime(req.body.dueAt, settings.portal.timeZone); }
    catch { throw error("The requested due date must be valid in the portal timezone"); }
    if (dueAt <= new Date()) throw error("The requested due date must be a valid future date");
    const calendar = await createPolicyCalendar({ settings });
    if (!calendar.isEligibleDate(dueAt)) {
      throw error("The requested due date falls on an excluded weekend or public holiday");
    }
    const reason = text(req.body.reason, "Due-date reason", { required: true });
    const canDirect = req.user.role_slug === "super-admin" ||
      !settings.dueDate.adminApprovalDueDateExtension;
    if (canDirect) {
      await LifecycleModel.updateDueDate({ complaintId, dueAt });
      await audit(req, "GRIEVANCE_DUE_DATE_CHANGED", complaintId);
      return res.json({ status: true, message: "Due date updated" });
    }
    const requestId = await LifecycleModel.requestDueDateExtension({ complaintId, requestedDueAt: dueAt, reason, actorId: req.user.id });
    return res.status(201).json({ status: true, message: "Due-date extension requested", data: { id: requestId } });
  } catch (caught) { return sendError(res, caught, "Failed to change due date"); }
};

const decideDueDate = async (req, res) => {
  try {
    const requestId = id(req.params.requestId, "request ID");
    const approved = req.body.approved === true;
    if (approved) {
      const [settings, pending] = await Promise.all([
        SettingsPolicy.getPolicy(), LifecycleModel.findDueDateExtensionRequest(requestId),
      ]);
      if (!pending) throw error("Due-date request not found", 404);
      if (!settings.dueDate.dueDateRequired) throw error("Due dates are disabled by General Settings", 403);
      const requestedDueAt = new Date(pending.requested_due_at);
      const calendar = await createPolicyCalendar({ settings });
      if (requestedDueAt <= new Date() || !calendar.isEligibleDate(requestedDueAt)) {
        throw error("The requested due date is no longer an eligible future date", 409);
      }
    }
    const result = await LifecycleModel.decideDueDateExtension({
      requestId, approved,
      note: text(req.body.note, "Decision note", { required: !approved }), actorId: req.user.id,
    });
    if (!result) throw error("Due-date request not found", 404);
    await audit(req, "GRIEVANCE_DUE_DATE_CHANGED", result.request.complaint_id);
    return res.json({ status: true, message: `Due-date request ${result.approved ? "approved" : "rejected"}` });
  } catch (caught) { return sendError(res, caught, "Failed to decide due-date request"); }
};

const buildDueDatePreview = async (settings, limit) => {
  const complaints = await LifecycleModel.listOpenForDueDateRecalculation(limit);
  const calendar = await createPolicyCalendar({ settings });
  return complaints.map((complaint) => {
    const proposedDueAt = calendar.calculateDueAt(complaint.due_start_at);
    const currentTime = complaint.due_at ? new Date(complaint.due_at).getTime() : null;
    const proposedTime = proposedDueAt ? proposedDueAt.getTime() : null;
    return {
      id: complaint.id,
      tokenNumber: complaint.token_number,
      status: complaint.status,
      startAt: complaint.due_start_at,
      currentDueAt: complaint.due_at,
      proposedDueAt,
      changed: currentTime !== proposedTime,
      differenceMilliseconds: currentTime === null || proposedTime === null
        ? null : proposedTime - currentTime,
    };
  });
};

const dueDatePolicyMetadata = (settings) => ({
  enabled: settings.dueDate.dueDateRequired,
  resolutionDays: settings.dueDate.defaultResolutionDays,
  mode: settings.dueDate.countWorkingDaysOnly ? "working_days" : "calendar_days",
  excludePublicHolidays: settings.dueDate.excludePublicHolidays,
  timeZone: settings.portal.timeZone,
  reminderDays: settings.dueDate.dueDateReminderDays,
  escalationEnabled: settings.dueDate.enableEscalation,
  escalationDays: settings.dueDate.escalateAfterDays,
});

const previewDueDateRecalculation = async (req, res) => {
  try {
    const settings = await SettingsPolicy.getPolicy();
    const data = await buildDueDatePreview(settings, req.query.limit);
    return res.json({
      status: true,
      data,
      meta: { count: data.length, previewOnly: true, policy: dueDatePolicyMetadata(settings) },
    });
  } catch (caught) { return sendError(res, caught, "Failed to preview due-date recalculation"); }
};

const applyDueDateRecalculation = async (req, res) => {
  try {
    if (req.body.confirmation !== "RECALCULATE OPEN GRIEVANCE DUE DATES") throw error("Exact recalculation confirmation is required");
    const selectedIds = Array.isArray(req.body.complaintIds)
      ? new Set(req.body.complaintIds.map(Number).filter((value) => Number.isInteger(value) && value > 0)) : null;
    const settings = await SettingsPolicy.getPolicy();
    const preview = await buildDueDatePreview(settings, 5000);
    const updates = preview
      .filter((item) => !selectedIds || selectedIds.has(item.id))
      .map((item) => ({ id: item.id, dueAt: item.proposedDueAt }));
    const count = await LifecycleModel.applyDueDateRecalculation(updates);
    try { await recordAuditEvent(req, { eventType: "DUE_DATES_BULK_RECALCULATED", resourceType: "complaints", resourceId: count }); } catch {}
    return res.json({ status: true, message: `${count} grievance due date${count === 1 ? "" : "s"} recalculated`, data: { count } });
  } catch (caught) { return sendError(res, caught, "Failed to recalculate due dates"); }
};

const downloadResolutionDocument = async (req, res) => {
  try {
    const settings = await SettingsPolicy.getPolicy();
    if (!settings.privacy.allowAttachmentDownload) throw error("Attachment downloads are disabled by privacy policy", 403);
    const complaintId = id(req.params.id, "complaint ID");
    const documentId = id(req.params.documentId, "document ID");
    const document = await LifecycleModel.findResolutionDocument({ complaintId, documentId, scope: getGrievanceScope(req.user) });
    if (!document) throw error("Resolution document not found", 404);
    const absolute = path.resolve(backendRoot, document.storage_path);
    const allowedRoot = path.resolve(backendRoot, "uploads", "complaints");
    const relative = path.relative(allowedRoot, absolute);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw error("Resolution document is unavailable", 404);
    return res.download(absolute, document.original_name);
  } catch (caught) { return sendError(res, caught, "Failed to download resolution document"); }
};

module.exports = { addComment, applyDueDateRecalculation, assignComplaint, changeStatus, decideDueDate, decideReassignment, downloadResolutionDocument, getLifecycle, previewDueDateRecalculation, reassignComplaint, requestDueDate };
