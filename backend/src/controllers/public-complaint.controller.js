const fs = require("fs/promises");
const path = require("path");
const ComplaintModel = require("../models/complaint.model");
const { recordAuditEvent } = require("../services/audit-log.service");
const SettingsPolicy = require("../services/settings-policy.service");
const { verifyRecaptcha } = require("../services/recaptcha.service");
const {
  encryptText,
  hashIdentificationNumber,
  normalizeIdentificationNumber,
} = require("../services/pii.service");
const { generalSettingsDefaults } = require("../utils/default-general-settings");
const ConfigurationModel = require("../models/configuration.model");
const { resolveInitialRouting } = require("../services/routing.service");
const NotificationService = require("../services/notification.service");

const backendRoot = path.resolve(__dirname, "../..");
const complaintUploadRoot = path.resolve(
  backendRoot,
  "uploads",
  "complaints",
);
const STORED_COMPLAINT_FILE_PATTERN =
  /^\d+-\d+\.(?:pdf|doc|docx|jpg|jpeg|png|xls|xlsx)$/;

const legacyIssueLabel = (value) => String(value || "")
  .replaceAll("_", " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

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
  if (complaint?.category_name) return complaint.category_name;
  const labels = parseJsonArray(complaint?.issue_type)
    .map(legacyIssueLabel)
    .filter(Boolean);

  if (complaint?.issue_other) labels.push(complaint.issue_other);
  return labels.join(", ") || "Grievance submission";
};

const buildClientError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const getPositiveId = (body, field) => {
  const raw = getString(body, field);
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) throw buildClientError(`Invalid ${field.replace(/_/g, " ")}`);
  return value;
};

const resolvePolicySelections = async (body, complaint, settings) => {
  const categoryId = settings.grievanceSubmission.allowCitizenCategorySelection
    ? getPositiveId(body, "category_id") : null;
  const submittedDepartmentId = settings.grievanceSubmission.allowCitizenDepartmentSelection
    ? getPositiveId(body, "department_id") : null;
  const locationId = getPositiveId(body, "location_id");

  if (settings.grievanceSubmission.allowCitizenCategorySelection && !categoryId) {
    throw buildClientError("Complaint category is required");
  }
  if (settings.grievanceSubmission.allowCitizenDepartmentSelection && !submittedDepartmentId) {
    throw buildClientError("Department is required");
  }

  const [category, department, location, status, priority] = await Promise.all([
    categoryId ? ConfigurationModel.findActiveCatalogItem("complaint_categories", categoryId) : null,
    submittedDepartmentId ? ConfigurationModel.findActiveCatalogItem("departments", submittedDepartmentId) : null,
    locationId ? ConfigurationModel.findActiveCatalogItem("complaint_locations", locationId) : null,
    ConfigurationModel.findStatusByName(complaint.initialStatus),
    ConfigurationModel.findPriorityByName(complaint.ticketPriority),
  ]);
  if (categoryId && !category) throw buildClientError("Selected complaint category is unavailable");
  if (submittedDepartmentId && !department) throw buildClientError("Selected department is unavailable");
  if (locationId && !location) throw buildClientError("Selected location is unavailable");
  if (!status) throw Object.assign(new Error("Configured default grievance status is unavailable"), { statusCode: 503 });
  if (!priority) throw Object.assign(new Error("Configured default grievance priority is unavailable"), { statusCode: 503 });

  const routing = await resolveInitialRouting({ settings, categoryId, submittedDepartmentId, locationId });
  const issueSummary = category?.name || complaint.issueSummary;
  return {
    ...complaint, categoryId, submittedDepartmentId, locationId,
    assignedDepartmentId: routing.departmentId, assignedOfficerId: routing.officerId,
    routingRuleId: routing.ruleId, statusId: status.id, priorityId: priority.id,
    complaintCategory: issueSummary,
    complaintSubject: issueSummary,
    issueSummary,
    grievanceData: {
      ...complaint.grievanceData,
      issue_labels: category ? [category.name] : complaint.grievanceData.issue_labels,
    },
  };
};

const validateAllowedValues = (values, allowed, label) => {
  if (values.some((value) => !allowed.has(value))) {
    throw buildClientError(`Invalid ${label} selected`);
  }
};

const validateGrievanceBody = (body, settings = generalSettingsDefaults) => {
  const submissionPolicy = settings.grievanceSubmission;
  const privacyPolicy = settings.privacy;
  const assistance = getStringArray(body, "assistance");
  const assistanceOther = getString(body, "assistance_other");
  const submissionType = getString(body, "submission_type") || "named";
  const compName = getString(body, "comp_name");
  const compPhone = getString(body, "comp_phone");
  const compAddress = getString(body, "comp_address");
  const compEmail = getString(body, "comp_email");
  const identificationNumber = getString(body, "identification_number");
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
  if (issueTypes.length > 10 || issueTypes.some((value) => value.length > 80 || !/^[a-z0-9_-]+$/i.test(value))) {
    throw buildClientError("Invalid legacy issue type value");
  }
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

  if (isAnonymous && !submissionPolicy.allowAnonymousComplaints) {
    throw buildClientError("Anonymous grievances are not currently accepted");
  }

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
    if (submissionPolicy.mobileNumberRequired && getPhoneDigits(compPhone).length < 7) {
      throw buildClientError("A valid mobile number is required");
    }
    if (submissionPolicy.emailAddressRequired && !compEmail) {
      throw buildClientError("Email address is required");
    }
    if (submissionPolicy.identificationNumberRequired &&
        normalizeIdentificationNumber(identificationNumber).length < 4) {
      throw buildClientError("A valid identification number is required");
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

  if (!submissionPolicy.allowCitizenCategorySelection && !issueTypes.length && !issueOther) {
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
  if (description.length > submissionPolicy.maximumDescriptionLength) {
    throw buildClientError(
      `Detailed description must be ${submissionPolicy.maximumDescriptionLength} characters or fewer`,
    );
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
  if ((submissionPolicy.displayDeclarationCheckbox || privacyPolicy.citizenConsentRequired) && !declarationConfirmed) {
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
    ...issueTypes.map(legacyIssueLabel),
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
    declaration_confirm: declarationConfirmed,
    identification_number_encrypted:
      !isAnonymous && identificationNumber ? encryptText(identificationNumber) : null,
    identification_number_hash:
      !isAnonymous && identificationNumber ? hashIdentificationNumber(identificationNumber) : null,
    identification_number_last4:
      !isAnonymous && identificationNumber
        ? normalizeIdentificationNumber(identificationNumber).slice(-4)
        : null,
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
    ticketPriority: settings.assignment.defaultAssignmentPriority,
    initialStatus: settings.workflow.defaultNewGrievanceStatus,
    settings,
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
    const settings = req.generalSettings || (await SettingsPolicy.getPolicy());
    if (settings.grievanceSubmission.enableCaptcha) {
      const captchaToken = getString(req.body, "captchaToken") || getString(req.body, "captcha_token");
      if (!captchaToken) throw buildClientError("Complete the CAPTCHA verification");
      let captchaValid;
      try {
        captchaValid = await verifyRecaptcha(captchaToken, getIpAddress(req));
      } catch (error) {
        error.statusCode = 503;
        throw error;
      }
      if (!captchaValid) throw buildClientError("CAPTCHA verification failed");
    }
    const complaint = await resolvePolicySelections(
      req.body,
      validateGrievanceBody(req.body, settings),
      settings,
    );

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

    try {
      await NotificationService.enqueueComplaintEvent({
        eventType: "submission", complaintId: created.id, eventKey: `submission:${created.id}`,
      });
      if (complaint.assignedDepartmentId) {
        await NotificationService.enqueueComplaintEvent({
          eventType: "assignment", complaintId: created.id, eventKey: `initial-assignment:${created.id}`,
        });
      }
    } catch (notificationError) {
      console.error("Failed to enqueue grievance notifications:", notificationError.message);
    }

    return res.status(201).json({
      status: true,
      message: "Grievance submitted successfully",
      data: {
        ...(settings.ticket.displayTicketOnConfirmation ? { tokenNumber: created.tokenNumber } : {}),
        status: complaint.initialStatus,
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
    const settings = req.generalSettings || (await SettingsPolicy.getPolicy());
    const complaint = await resolvePolicySelections(
      req.body,
      validateGrievanceBody(req.body, settings),
      settings,
    );
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
      await NotificationService.enqueueComplaintEvent({
        eventType: "submission", complaintId: created.id, eventKey: `submission:${created.id}`,
      });
      if (complaint.assignedDepartmentId) {
        await NotificationService.enqueueComplaintEvent({
          eventType: "assignment", complaintId: created.id, eventKey: `initial-assignment:${created.id}`,
        });
      }
    } catch (notificationError) {
      console.error("Failed to enqueue walk-in grievance notifications:", notificationError.message);
    }

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
        status: complaint.initialStatus,
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

const contactMatchesComplaint = (complaint, contactDetail, method) => {
  if (method === "Ticket Number Only") return true;
  const normalized = contactDetail.trim().toLowerCase();
  const digits = getPhoneDigits(contactDetail);

  if (method === "Ticket Number and Phone Number") {
    return digits.length >= 7 && digits === String(complaint.comp_phone_digits || "");
  }
  if (method === "Ticket Number and Email Address") {
    return Boolean(complaint.comp_email) &&
      String(complaint.comp_email).trim().toLowerCase() === normalized;
  }
  if (method === "Ticket Number and Identification Number") {
    return Boolean(complaint.identification_number_hash) &&
      hashIdentificationNumber(contactDetail) === complaint.identification_number_hash;
  }
  return false;
};

const buildPublicTrackingData = (complaint, visibleFields) => {
  const available = {
    "Ticket Number": ["tokenNumber", complaint.token_number],
    "Complaint Subject": ["issueSummary", getStoredIssueSummary(complaint)],
    "Submission Date": ["submittedAt", toIso(complaint.created_at)],
    "Assigned Department": ["assignedDepartment", complaint.assigned_department_name || "Unassigned"],
    "Current Status": ["status", complaint.status],
    "Last Updated Date": ["updatedAt", toIso(complaint.updated_at || complaint.created_at)],
    "Resolution Summary": ["resolutionSummary", complaint.resolution_summary || null],
    "Closure Date": ["closureDate", toIso(complaint.closed_at)],
  };

  return Object.fromEntries(
    visibleFields
      .filter((field) => available[field])
      .map((field) => available[field]),
  );
};

const getComplaintStatus = async (req, res) => {
  try {
    const settings = req.generalSettings || (await SettingsPolicy.getPolicy());
    const method = settings.ticket.trackingVerificationMethod;
    const tokenNumber = getString(req.body, "tokenNumber").toUpperCase();
    const contactDetail =
      getString(req.body, "verificationDetail") ||
      getString(req.body, "contactDetail") ||
      getString(req.body, "phoneNumber") ||
      getString(req.body, "emailAddress") ||
      getString(req.body, "identificationNumber");

    if (!tokenNumber || (method !== "Ticket Number Only" && !contactDetail)) {
      return res.status(400).json({
        status: false,
        message: method === "Ticket Number Only"
          ? "Reference number is required"
          : "Reference number and verification detail are required",
      });
    }

    const complaint = await ComplaintModel.findByToken(tokenNumber);

    if (
      !complaint ||
      (complaint.submission_type === "anonymous" && method !== "Ticket Number Only") ||
      !contactMatchesComplaint(complaint, contactDetail, method)
    ) {
      return res.status(404).json({
        status: false,
        message: "No grievance matched those details",
      });
    }

    return res.json({
      status: true,
      data: buildPublicTrackingData(
        complaint,
        settings.privacy.publicTrackingDataVisibility,
      ),
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
