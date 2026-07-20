const fs = require("fs/promises");
const path = require("path");
const ComplaintModel = require("../models/complaint.model");
const { recordAuditEvent } = require("../services/audit-log.service");

const backendRoot = path.resolve(__dirname, "../..");
const complaintUploadRoot = path.resolve(
  backendRoot,
  "uploads",
  "complaints",
);
const STORED_COMPLAINT_FILE_PATTERN =
  /^\d+-\d+\.(?:pdf|doc|docx|jpg|jpeg|png)$/;

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

const ALLOWED_ASSISTANCE = new Set([
  "Spanish",
  "Maya",
  "Garifuna",
  "Assisted completion",
  "Large print",
]);
const ALLOWED_SUBMISSION_TYPES = new Set(["named", "anonymous"]);
const ALLOWED_CONTACT_PREFERENCES = new Set([
  "phone",
  "email",
  "mail",
  "in_person",
  "whatsapp",
]);
const ALLOWED_YES_NO = new Set(["yes", "no"]);
const ALLOWED_PERMISSION = new Set(["yes", "no", "not_applicable"]);
const ALLOWED_ISSUES = new Set(Object.keys(ISSUE_LABELS));
const ALLOWED_CHANNELS = new Set([
  "in_person",
  "telephone",
  "email",
  "online_form",
  "mail",
  "whatsapp",
  "social_media",
  "suggestion_box",
]);
const ALLOWED_ACCOMMODATIONS = new Set([
  "sign_language",
  "wheelchair",
  "home_visit",
  "translation",
]);

const getIpAddress = (req) =>
  String(req.ip || req.socket?.remoteAddress || "").replace(/^::ffff:/, "") ||
  null;

const getString = (body, field) => {
  const value = body[field];
  if (Array.isArray(value)) return String(value[0] || "").trim();
  return String(value || "").trim();
};

const getStringArray = (body, field) => {
  const value = body[field];
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => String(item || "").trim()))].filter(
      Boolean,
    );
  }

  const normalized = String(value || "").trim();
  return normalized ? [normalized] : [];
};

const getBoolean = (value) =>
  ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase());

const getPhoneDigits = (value) => String(value || "").replace(/\D/g, "");

const isValidIsoDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

const isFutureDate = (value) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${value}T00:00:00`) > today;
};

const resolveSafeComplaintUploadPath = (file) => {
  const storedName =
    typeof file?.filename === "string" ? file.filename : "";

  if (!STORED_COMPLAINT_FILE_PATTERN.test(storedName)) {
    return null;
  }

  const uploadPath = path.resolve(complaintUploadRoot, storedName);
  const relativePath = path.relative(complaintUploadRoot, uploadPath);

  if (
    !relativePath ||
    relativePath === ".." ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    return null;
  }

  return uploadPath;
};

const cleanupFiles = async (files = []) => {
  await Promise.all(
    files.map((file) => {
      const uploadPath = resolveSafeComplaintUploadPath(file);

      if (!uploadPath) {
        return Promise.resolve();
      }

      return fs.unlink(uploadPath).catch(() => {
        // Best-effort cleanup for failed multipart submissions.
      });
    }),
  );
};

const toIso = (value) => (value ? new Date(value).toISOString() : null);

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

const getStoredIssueSummary = (complaint) => {
  const labels = parseJsonArray(complaint?.issue_type)
    .map((value) => ISSUE_LABELS[value] || value)
    .filter(Boolean);

  if (complaint?.issue_other) labels.push(complaint.issue_other);
  return labels.join(", ") || "Grievance submission";
};

const buildClientError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const validateAllowedValues = (values, allowed, label) => {
  if (values.some((value) => !allowed.has(value))) {
    throw buildClientError(`Invalid ${label} selected`);
  }
};

const validateGrievanceBody = (body) => {
  const assistance = getStringArray(body, "assistance");
  const assistanceOther = getString(body, "assistance_other");
  const submissionType = getString(body, "submission_type") || "named";
  const compName = getString(body, "comp_name");
  const compPhone = getString(body, "comp_phone");
  const compAddress = getString(body, "comp_address");
  const compEmail = getString(body, "comp_email");
  const contactPreference = getString(body, "contact_pref");
  const onBehalf = getString(body, "on_behalf");
  const affectedName = getString(body, "affected_name");
  const relationship = getString(body, "relationship");
  const permission = getString(body, "permission");
  const issueTypes = getStringArray(body, "issue_type");
  const issueOther = getString(body, "issue_other");
  const channels = getStringArray(body, "channel");
  const incidentDate = getString(body, "incident_date");
  const incidentLocation = getString(body, "incident_location");
  const description = getString(body, "description");
  const desiredOutcome = getString(body, "desired_outcome");
  const triedResolve = getString(body, "tried_resolve");
  const previousAttempts = getString(body, "prev_attempts");
  const hasDocuments = getString(body, "has_documents");
  const hasWitnesses = getString(body, "has_witnesses");
  const witnessName = getString(body, "witness_name");
  const witnessPhone = getString(body, "witness_phone");
  const accommodations = getStringArray(body, "accommodation");
  const accommodationOther = getString(body, "accommodation_other");
  const declarationConfirmed = getBoolean(body.declaration_confirm);
  const signature = getString(body, "signature");
  const declarationDate = getString(body, "declaration_date");

  validateAllowedValues(assistance, ALLOWED_ASSISTANCE, "assistance option");
  if (assistance.length > 1) {
    throw buildClientError("Only one language or assistance option may be selected");
  }
  validateAllowedValues(issueTypes, ALLOWED_ISSUES, "issue type");
  validateAllowedValues(channels, ALLOWED_CHANNELS, "contact channel");
  validateAllowedValues(
    accommodations,
    ALLOWED_ACCOMMODATIONS,
    "accommodation",
  );

  if (!ALLOWED_SUBMISSION_TYPES.has(submissionType)) {
    throw buildClientError("Invalid submission type selected");
  }

  const isAnonymous = submissionType === "anonymous";

  if (!isAnonymous) {
    if (!compName) throw buildClientError("Full name is required");
    if (!ALLOWED_CONTACT_PREFERENCES.has(contactPreference)) {
      throw buildClientError("Preferred contact method is required");
    }
    if (!ALLOWED_YES_NO.has(onBehalf)) {
      throw buildClientError(
        "Please indicate whether you are submitting on behalf of someone else",
      );
    }
    if (
      ["phone", "whatsapp"].includes(contactPreference) &&
      getPhoneDigits(compPhone).length < 7
    ) {
      throw buildClientError(
        "A valid phone number is required for the selected contact method",
      );
    }
    if (contactPreference === "email" && !compEmail) {
      throw buildClientError(
        "Email address is required for the selected contact method",
      );
    }
    if (contactPreference === "mail" && !compAddress) {
      throw buildClientError(
        "Address is required for the selected contact method",
      );
    }
    if (
      compEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(compEmail)
    ) {
      throw buildClientError("Email address must be valid");
    }
    if (onBehalf === "yes") {
      if (!affectedName) {
        throw buildClientError("Affected person name is required");
      }
      if (!relationship) {
        throw buildClientError("Relationship to the affected person is required");
      }
      if (!ALLOWED_PERMISSION.has(permission)) {
        throw buildClientError("Permission status is required");
      }
    }
  }

  if (!issueTypes.length && !issueOther) {
    throw buildClientError(
      "Select at least one issue type or specify another issue",
    );
  }
  if (!channels.length) {
    throw buildClientError("Select at least one channel used to reach us");
  }
  if (!incidentDate || !isValidIsoDate(incidentDate)) {
    throw buildClientError("A valid incident date is required");
  }
  if (isFutureDate(incidentDate)) {
    throw buildClientError("Incident date cannot be in the future");
  }
  if (!incidentLocation) {
    throw buildClientError("Incident location is required");
  }
  if (!description) {
    throw buildClientError("Detailed description is required");
  }
  if (!desiredOutcome) {
    throw buildClientError("Desired outcome is required");
  }
  if (!ALLOWED_YES_NO.has(triedResolve)) {
    throw buildClientError(
      "Please indicate whether you tried to resolve the issue before",
    );
  }
  if (triedResolve === "yes" && !previousAttempts) {
    throw buildClientError("Previous resolution steps are required");
  }
  if (!ALLOWED_YES_NO.has(hasDocuments)) {
    throw buildClientError(
      "Please indicate whether you have supporting documents",
    );
  }
  if (!ALLOWED_YES_NO.has(hasWitnesses)) {
    throw buildClientError("Please indicate whether there are witnesses");
  }
  if (hasWitnesses === "yes") {
    if (!witnessName) throw buildClientError("Witness name is required");
    if (getPhoneDigits(witnessPhone).length < 7) {
      throw buildClientError(
        "Witness phone number must include at least 7 digits",
      );
    }
  }
  if (!declarationConfirmed) {
    throw buildClientError("Declaration confirmation is required");
  }
  if (!isAnonymous && !signature) {
    throw buildClientError("Electronic signature is required");
  }
  if (!declarationDate || !isValidIsoDate(declarationDate)) {
    throw buildClientError("A valid declaration date is required");
  }
  if (isFutureDate(declarationDate)) {
    throw buildClientError("Declaration date cannot be in the future");
  }

  const issueLabels = [
    ...issueTypes.map((value) => ISSUE_LABELS[value]),
    issueOther,
  ].filter(Boolean);
  const issueSummary =
    issueLabels.length > 1 ? "Multiple grievance issues" : issueLabels[0];

  const grievanceData = {
    assistance,
    assistance_other: assistanceOther || null,
    submission_type: submissionType,
    comp_name: isAnonymous ? null : compName.slice(0, 160),
    comp_phone: isAnonymous ? null : compPhone.slice(0, 40) || null,
    comp_address: isAnonymous ? null : compAddress || null,
    comp_email: isAnonymous ? null : compEmail.slice(0, 190) || null,
    contact_pref: isAnonymous ? null : contactPreference,
    on_behalf: isAnonymous ? null : onBehalf,
    affected_name:
      !isAnonymous && onBehalf === "yes" ? affectedName.slice(0, 160) : null,
    relationship:
      !isAnonymous && onBehalf === "yes" ? relationship.slice(0, 160) : null,
    permission:
      !isAnonymous && onBehalf === "yes" ? permission : null,
    issue_type: issueTypes,
    issue_labels: issueLabels,
    issue_other: issueOther || null,
    channel: channels,
    incident_date: incidentDate,
    incident_location: incidentLocation.slice(0, 255),
    description,
    desired_outcome: desiredOutcome,
    tried_resolve: triedResolve,
    prev_attempts: triedResolve === "yes" ? previousAttempts : null,
    has_documents: hasDocuments,
    has_witnesses: hasWitnesses,
    witness_name: hasWitnesses === "yes" ? witnessName.slice(0, 160) : null,
    witness_phone:
      hasWitnesses === "yes" ? witnessPhone.slice(0, 40) : null,
    accommodation: accommodations,
    accommodation_other: accommodationOther || null,
    declaration_confirm: true,
    signature: isAnonymous ? null : signature.slice(0, 160),
    declaration_date: declarationDate,
  };

  return {
    fullName: isAnonymous ? "Anonymous grievance" : compName.slice(0, 160),
    gender: null,
    socialSecurityNumberEncrypted: null,
    socialSecurityNumberLast4: null,
    socialSecurityNumberMasked: null,
    phoneNumber: isAnonymous ? "" : compPhone.slice(0, 40),
    phoneNumberDigits: isAnonymous ? "" : getPhoneDigits(compPhone),
    emailAddress: isAnonymous ? null : compEmail.slice(0, 190) || null,
    departmentMinistry: "Grievance Redress Mechanism",
    complaintCategory: issueSummary.slice(0, 160),
    complaintSubject: issueLabels.join(", ").slice(0, 220),
    complaintDetails: description,
    ticketPriority: "Medium",
    incidentDate,
    locationDistrict: null,
    consentDeclaration: true,
    grievanceData,
    issueSummary,
    incidentLocation,
    isAnonymous,
  };
};

const submitComplaint = async (req, res) => {
  try {
    const complaint = validateGrievanceBody(req.body);

    if (complaint.grievanceData.has_documents === "no" && req.files?.length) {
      throw buildClientError(
        "Documents were uploaded after selecting that no documents are available",
      );
    }

    const attachments = (req.files || []).map((file) => ({
      originalName: file.originalname,
      storedName: file.filename,
      mimeType: file.mimetype,
      fileSize: file.size,
      storagePath: path.relative(backendRoot, file.path).replace(/\\/g, "/"),
    }));

    const created = await ComplaintModel.createWithAttachments({
      complaint: {
        ...complaint,
        ipAddress: getIpAddress(req),
        userAgent: req.get("user-agent") || null,
      },
      attachments,
    });

    return res.status(201).json({
      status: true,
      message: "Grievance submitted successfully",
      data: {
        tokenNumber: created.tokenNumber,
        status: "New",
        isAnonymous: complaint.isAnonymous,
        issueSummary: complaint.issueSummary,
        incidentLocation: complaint.incidentLocation,
        submittedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    await cleanupFiles(req.files || []);

    return res.status(error.statusCode || 500).json({
      status: false,
      message: error.statusCode ? error.message : "Failed to submit grievance",
      error:
        process.env.NODE_ENV === "development" && !error.statusCode
          ? error.message
          : undefined,
    });
  }
};

const submitAdminComplaint = async (req, res) => {
  try {
    const complaint = validateGrievanceBody(req.body);
    const receivedDate = getString(req.body, "office_received_date");
    const receivedBy = getString(req.body, "office_received_by");
    const classification = getString(
      req.body,
      "office_initial_classification",
    );
    const assignedTo = getString(req.body, "office_assigned_to");

    if (!receivedDate || !isValidIsoDate(receivedDate)) {
      throw buildClientError("A valid office received date is required");
    }
    if (isFutureDate(receivedDate)) {
      throw buildClientError("Office received date cannot be in the future");
    }
    if (!receivedBy) {
      throw buildClientError("Received by is required for office intake");
    }
    if (!["Level 1", "Level 2", "Level 3", "Level 4"].includes(classification)) {
      throw buildClientError("Select an initial classification");
    }
    if (!assignedTo) {
      throw buildClientError("Assigned to is required for office intake");
    }

    if (complaint.grievanceData.has_documents === "no" && req.files?.length) {
      throw buildClientError(
        "Documents were uploaded after selecting that no documents are available",
      );
    }

    const attachments = (req.files || []).map((file) => ({
      originalName: file.originalname,
      storedName: file.filename,
      mimeType: file.mimetype,
      fileSize: file.size,
      storagePath: path.relative(backendRoot, file.path).replace(/\\/g, "/"),
    }));

    const created = await ComplaintModel.createWithAttachments({
      complaint: {
        ...complaint,
        ipAddress: getIpAddress(req),
        userAgent: req.get("user-agent") || null,
        officeData: {
          intakeSource: "walk_in",
          receivedDate: `${receivedDate} 12:00:00`,
          receivedBy: receivedBy.slice(0, 120),
          initialClassification: classification,
          assignedTo: assignedTo.slice(0, 160),
          createdByAdminUserId: req.user.id,
        },
      },
      attachments,
    });

    try {
      await recordAuditEvent(req, {
        eventType: "ADMIN_GRIEVANCE_CREATED",
        resourceType: "complaint",
        resourceId: created.id,
      });
    } catch (auditError) {
      console.error(
        "Failed to audit walk-in grievance creation:",
        auditError.message,
      );
    }

    return res.status(201).json({
      status: true,
      message: "Walk-in grievance recorded successfully",
      data: {
        tokenNumber: created.tokenNumber,
        status: "New",
        isAnonymous: complaint.isAnonymous,
        issueSummary: complaint.issueSummary,
        incidentLocation: complaint.incidentLocation,
        submittedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    await cleanupFiles(req.files || []);

    return res.status(error.statusCode || 500).json({
      status: false,
      message: error.statusCode
        ? error.message
        : "Failed to record walk-in grievance",
      error:
        process.env.NODE_ENV === "development" && !error.statusCode
          ? error.message
          : undefined,
    });
  }
};

const contactMatchesComplaint = (complaint, contactDetail) => {
  const normalized = contactDetail.trim().toLowerCase();
  const digits = getPhoneDigits(contactDetail);

  if (
    digits.length >= 7 &&
    digits === String(complaint.comp_phone_digits || "")
  ) {
    return true;
  }

  return [
    complaint.comp_email,
    complaint.comp_name,
    complaint.comp_address,
  ]
    .filter(Boolean)
    .some((value) => String(value).trim().toLowerCase() === normalized);
};

const getComplaintStatus = async (req, res) => {
  try {
    const tokenNumber = getString(req.body, "tokenNumber").toUpperCase();
    const contactDetail =
      getString(req.body, "contactDetail") ||
      getString(req.body, "phoneNumber");

    if (!tokenNumber || !contactDetail) {
      return res.status(400).json({
        status: false,
        message: "Reference number and contact detail are required",
      });
    }

    const complaint = await ComplaintModel.findByToken(tokenNumber);

    if (
      !complaint ||
      complaint.submission_type === "anonymous" ||
      !contactMatchesComplaint(complaint, contactDetail)
    ) {
      return res.status(404).json({
        status: false,
        message: "No grievance matched those details",
      });
    }

    return res.json({
      status: true,
      data: {
        tokenNumber: complaint.token_number,
        status: complaint.status,
        issueSummary: getStoredIssueSummary(complaint),
        incidentLocation:
          complaint.incident_location || "Not provided",
        submittedAt: toIso(complaint.created_at),
        updatedAt: toIso(complaint.updated_at),
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to check grievance status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  getComplaintStatus,
  resolveSafeComplaintUploadPath,
  submitAdminComplaint,
  submitComplaint,
  validateGrievanceBody,
};
