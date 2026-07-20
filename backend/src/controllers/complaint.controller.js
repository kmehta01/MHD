const path = require("path");
const ComplaintModel = require("../models/complaint.model");
const { PRIORITIES, STATUSES } = require("../config/complaint-options");
const { getGrievanceScope } = require("../utils/access-scope");
const {
  getOptionalInteger,
  getOptionalString,
} = require("../utils/request-validation");

const backendRoot = path.resolve(__dirname, "../..");
const ISSUE_LABELS = {
  social_welfare: "Social welfare or assistance",
  child_protection: "Child protection services",
  family_support: "Family support services",
  gbv_response: "Gender-based violence response",
  elderly_support: "Elderly support services",
  disability_services: "Disability services",
  staff_conduct: "Staff conduct or behaviour",
  corruption: "Corruption or unethical behaviour",
  service_delays: "Service delays",
  discrimination: "Discrimination",
  policy: "Policy implementation",
};

const toIso = (value) => (value ? new Date(value).toISOString() : null);
const toDateOnly = (value) =>
  value ? new Date(value).toISOString().slice(0, 10) : null;
const parseJsonArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getIssueSummary = (complaint) => {
  const labels = parseJsonArray(complaint.issue_type)
    .map((value) => ISSUE_LABELS[value] || value)
    .filter(Boolean);

  if (complaint.issue_other) labels.push(complaint.issue_other);
  return labels.join(", ") || "Grievance submission";
};

const normalizeGrievanceData = (complaint) => ({
  assistance: complaint.assistance ? [complaint.assistance] : [],
  assistance_other: complaint.assistance_other,
  submission_type: complaint.submission_type,
  comp_name: complaint.comp_name,
  comp_phone: complaint.comp_phone,
  comp_address: complaint.comp_address,
  comp_email: complaint.comp_email,
  contact_pref: complaint.contact_pref,
  on_behalf: complaint.on_behalf,
  affected_name: complaint.affected_name,
  relationship: complaint.relationship,
  permission: complaint.permission,
  issue_type: parseJsonArray(complaint.issue_type),
  issue_other: complaint.issue_other,
  channel: parseJsonArray(complaint.channel),
  incident_date: toDateOnly(complaint.incident_date),
  incident_location: complaint.incident_location,
  description: complaint.description,
  desired_outcome: complaint.desired_outcome,
  tried_resolve: complaint.tried_resolve,
  prev_attempts: complaint.prev_attempts,
  has_documents: complaint.has_documents,
  has_witnesses: complaint.has_witnesses,
  witness_name: complaint.witness_name,
  witness_phone: complaint.witness_phone,
  accommodation: parseJsonArray(complaint.accommodation),
  accommodation_other: complaint.accommodation_other,
  declaration_confirm: Boolean(complaint.declaration_confirm),
  signature: complaint.signature,
  declaration_date: toDateOnly(complaint.declaration_date),
});

const normalizeComplaintSummary = (complaint) => ({
  id: complaint.id,
  tokenNumber: complaint.token_number,
  fullName:
    complaint.submission_type === "anonymous"
      ? "Anonymous grievance"
      : complaint.comp_name || "Named grievance",
  phoneNumber: complaint.comp_phone,
  emailAddress: complaint.comp_email,
  departmentMinistry: complaint.assigned_department_name || "Unassigned",
  assignedDepartmentId: complaint.assigned_department_id || null,
  complaintCategory: getIssueSummary(complaint),
  complaintSubject: getIssueSummary(complaint),
  submissionType: complaint.submission_type,
  issueTypes: parseJsonArray(complaint.issue_type),
  issueOther: complaint.issue_other,
  incidentLocation: complaint.incident_location,
  ticketPriority: complaint.ticket_priority,
  district: complaint.incident_location,
  status: complaint.status,
  submittedAt: toIso(complaint.created_at),
  updatedAt: toIso(complaint.updated_at),
});

const normalizeComplaintNotification = (complaint) => ({
  id: complaint.id,
  tokenNumber: complaint.token_number,
  title: "New grievance received",
  subject: getIssueSummary(complaint),
  complainant:
    complaint.submission_type === "anonymous"
      ? "Anonymous submission"
      : complaint.comp_name || "Named submission",
  incidentLocation: complaint.incident_location,
  status: complaint.status,
  submittedAt: toIso(complaint.created_at),
});

const normalizeComplaintDetail = (complaint) => ({
  ...normalizeComplaintSummary(complaint),
  gender: null,
  socialSecurityNumber: null,
  complaintDetails: complaint.description,
  incidentDate: toDateOnly(complaint.incident_date),
  grievanceData: normalizeGrievanceData(complaint),
  officeData:
    complaint.intake_source === "walk_in"
      ? {
          intakeSource: complaint.intake_source,
          receivedDate: toDateOnly(complaint.office_received_at),
          receivedBy: complaint.office_received_by,
          initialClassification: complaint.office_initial_classification,
          assignedTo: complaint.office_assigned_to,
          createdByAdminUserId: complaint.created_by_admin_user_id,
        }
      : null,
  attachments: (complaint.attachments || []).map((attachment) => ({
    id: attachment.id,
    originalName: attachment.original_name,
    mimeType: attachment.mime_type,
    fileSize: attachment.file_size,
    uploadedAt: toIso(attachment.uploaded_at),
  })),
});

const getFilters = (query) => {
  const search = getOptionalString(query, "search", { maxLength: 100 });
  const status = getOptionalString(query, "status", { maxLength: 40 });
  const priority = getOptionalString(query, "priority", { maxLength: 20 });
  const assignment = getOptionalString(query, "assignment", {
    maxLength: 20,
  });
  const deadline = getOptionalString(query, "deadline", { maxLength: 20 });

  if (status && !STATUSES.includes(status)) {
    const error = new Error("Invalid status filter");
    error.statusCode = 400;
    throw error;
  }

  if (priority && !PRIORITIES.includes(priority)) {
    const error = new Error("Invalid priority filter");
    error.statusCode = 400;
    throw error;
  }

  if (assignment && !["assigned", "unassigned"].includes(assignment)) {
    const error = new Error("Invalid assignment filter");
    error.statusCode = 400;
    throw error;
  }

  if (deadline && !["overdue", "due_today"].includes(deadline)) {
    const error = new Error("Invalid deadline filter");
    error.statusCode = 400;
    throw error;
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Belize",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const getPart = (type) =>
    Number(parts.find((part) => part.type === type)?.value);
  const todayStart = new Date(
    Date.UTC(getPart("year"), getPart("month") - 1, getPart("day"), 6),
  );

  return {
    assignment,
    deadline,
    search,
    status,
    priority,
    todayStart,
    tomorrowStart: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000),
  };
};

const getComplaints = async (req, res) => {
  try {
    const scope = getGrievanceScope(req.user);

    if (scope.type === "none") {
      return res.status(403).json({
        status: false,
        message: "A department assignment is required to view grievances",
      });
    }

    const result = await ComplaintModel.findAll(getFilters(req.query), {
      page: getOptionalInteger(req.query, "page", { defaultValue: 1 }),
      perPage: getOptionalInteger(req.query, "per_page", {
        defaultValue: 25,
        maximum: 100,
      }),
      scope,
    });

    return res.json({
      status: true,
      data: result.rows.map(normalizeComplaintSummary),
      pagination: result.pagination,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: false,
      message: error.statusCode ? error.message : "Failed to fetch complaints",
      error:
        process.env.NODE_ENV === "development" && !error.statusCode
          ? error.message
          : undefined,
    });
  }
};

const getComplaintNotifications = async (req, res) => {
  try {
    const scope = getGrievanceScope(req.user);

    if (scope.type === "none") {
      return res.status(403).json({
        status: false,
        message: "A department assignment is required to view grievances",
      });
    }

    const result = await ComplaintModel.findNotifications({
      afterId: getOptionalInteger(req.query, "after_id", {
        allowZero: true,
        defaultValue: 0,
      }),
      limit: getOptionalInteger(req.query, "limit", {
        defaultValue: 5,
        maximum: 10,
      }),
      scope,
    });

    return res.json({
      status: true,
      data: result.rows.map(normalizeComplaintNotification),
      unread_count: result.unreadCount,
      latest_id: result.latestId,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: false,
      message: error.statusCode
        ? error.message
        : "Failed to fetch grievance notifications",
      error:
        process.env.NODE_ENV === "development" && !error.statusCode
          ? error.message
          : undefined,
    });
  }
};

const getComplaintById = async (req, res) => {
  try {
    const complaintId = Number(req.params.id);

    if (!Number.isInteger(complaintId) || complaintId <= 0) {
      return res.status(400).json({
        status: false,
        message: "A valid complaint ID is required",
      });
    }

    const scope = getGrievanceScope(req.user);

    if (scope.type === "none") {
      return res.status(403).json({
        status: false,
        message: "A department assignment is required to view grievances",
      });
    }

    const complaint = await ComplaintModel.findById(complaintId, scope);

    if (!complaint) {
      return res.status(404).json({
        status: false,
        message: "Complaint ticket not found",
      });
    }

    return res.json({
      status: true,
      data: normalizeComplaintDetail(complaint),
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to fetch complaint ticket",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const downloadComplaintAttachment = async (req, res) => {
  try {
    const complaintId = Number(req.params.id);
    const attachmentId = Number(req.params.attachmentId);

    if (
      !Number.isInteger(complaintId) ||
      complaintId <= 0 ||
      !Number.isInteger(attachmentId) ||
      attachmentId <= 0
    ) {
      return res.status(400).json({
        status: false,
        message: "A valid complaint and attachment ID are required",
      });
    }

    const scope = getGrievanceScope(req.user);

    if (scope.type === "none") {
      return res.status(403).json({
        status: false,
        message: "A department assignment is required to view grievances",
      });
    }

    const attachment = await ComplaintModel.findAttachment({
      complaintId,
      attachmentId,
      scope,
    });

    if (!attachment) {
      return res.status(404).json({
        status: false,
        message: "Attachment not found",
      });
    }

    const absolutePath = path.resolve(backendRoot, attachment.storage_path);
    const uploadRoot = path.resolve(backendRoot, "uploads", "complaints");
    const relativePath = path.relative(uploadRoot, absolutePath);

    if (
      !relativePath ||
      relativePath === ".." ||
      relativePath.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relativePath)
    ) {
      return res.status(404).json({
        status: false,
        message: "Attachment file is not available",
      });
    }

    return res.download(absolutePath, attachment.original_name, (error) => {
      if (!error) return;

      if (res.headersSent) {
        res.destroy();
        return;
      }

      const unavailable = ["EACCES", "ENOENT", "ENOTDIR"].includes(error.code);
      res.status(unavailable ? 404 : 500).json({
        status: false,
        message: unavailable
          ? "Attachment file is not available"
          : "Failed to download attachment",
      });
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to download attachment",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  downloadComplaintAttachment,
  getComplaintById,
  getComplaintNotifications,
  getComplaints,
};
