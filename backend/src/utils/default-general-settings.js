const define = (group, key, defaultValue, valueType = "string", rules = {}) => ({
  group,
  key,
  settingKey: `${group}.${key}`,
  defaultValue,
  valueType,
  isPublic: Boolean(rules.isPublic),
  ...rules,
});

const generalSettingDefinitions = [
  define("organization", "organizationName", "Ministry of Human Development, Family Support and Gender Affairs", "string", { required: true, maxLength: 180, isPublic: true }),
  define("organization", "portalName", "GRM Portal", "string", { required: true, maxLength: 120, isPublic: true }),
  define("organization", "organizationShortName", "MHD", "string", { required: true, maxLength: 30, isPublic: true }),
  define("organization", "logo", "", "file", { isPublic: true }),
  define("organization", "favicon", "", "file", { isPublic: true }),
  define("organization", "officialEmail", "", "email", { maxLength: 190, isPublic: true }),
  define("organization", "officialPhone", "", "string", { maxLength: 40, phone: true, isPublic: true }),
  define("organization", "websiteUrl", "", "url", { maxLength: 500, isPublic: true }),
  define("organization", "officeAddress", "", "string", { maxLength: 500, isPublic: true }),
  define("organization", "country", "Belize", "string", { required: true, maxLength: 100, isPublic: true }),
  define("organization", "defaultLocation", "Belize City", "string", { maxLength: 160, isPublic: true }),
  define("organization", "settingsUploadMaxKb", 2048, "number", { integer: true, min: 100, max: 5120 }),

  define("portal", "portalTitle", "Grievance Redress Management Portal", "string", { required: true, maxLength: 180, isPublic: true }),
  define("portal", "portalSubtitle", "Submit, track, and resolve grievances transparently", "string", { maxLength: 300, isPublic: true }),
  define("portal", "defaultLanguage", "English", "string", { options: ["English", "Spanish"], isPublic: true }),
  define("portal", "dateFormat", "DD/MM/YYYY", "string", { options: ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"], isPublic: true }),
  define("portal", "timeFormat", "12 Hour", "string", { options: ["12 Hour", "24 Hour"], isPublic: true }),
  define("portal", "timeZone", "America/Belize", "string", { required: true, maxLength: 100, timeZone: true, isPublic: true }),
  define("portal", "recordsPerPage", 25, "number", { integer: true, min: 5, max: 200 }),
  define("portal", "defaultDashboardPeriod", "Last 30 Days", "string", { options: ["Last 7 Days", "Last 30 Days", "Current Month", "Current Quarter", "Current Year"] }),
  define("portal", "maintenanceMode", false, "boolean", { isPublic: true }),
  define("portal", "maintenanceMessage", "The GRM Portal is temporarily unavailable while scheduled maintenance is completed.", "string", { maxLength: 500, isPublic: true }),

  define("grievanceSubmission", "allowPublicSubmission", true, "boolean", { isPublic: true }),
  define("grievanceSubmission", "allowAnonymousComplaints", true, "boolean", { isPublic: true }),
  define("grievanceSubmission", "mobileNumberRequired", true, "boolean", { isPublic: true }),
  define("grievanceSubmission", "emailAddressRequired", false, "boolean", { isPublic: true }),
  define("grievanceSubmission", "identificationNumberRequired", false, "boolean", { isPublic: true }),
  define("grievanceSubmission", "allowCitizenDepartmentSelection", true, "boolean", { isPublic: true }),
  define("grievanceSubmission", "allowCitizenCategorySelection", true, "boolean", { isPublic: true }),
  define("grievanceSubmission", "allowMultipleAttachments", true, "boolean", { isPublic: true }),
  define("grievanceSubmission", "maximumAttachmentCount", 3, "number", { integer: true, min: 1, max: 10, isPublic: true }),
  define("grievanceSubmission", "maximumAttachmentSizeMb", 5, "number", { integer: true, min: 1, max: 25, isPublic: true }),
  define("grievanceSubmission", "allowedFileTypes", ["PDF", "JPG", "JPEG", "PNG", "DOC", "DOCX"], "json", { arrayOptions: ["PDF", "JPG", "JPEG", "PNG", "DOC", "DOCX", "XLS", "XLSX"], isPublic: true }),
  define("grievanceSubmission", "maximumDescriptionLength", 5000, "number", { integer: true, min: 250, max: 50000, isPublic: true }),
  define("grievanceSubmission", "enableCaptcha", false, "boolean", { isPublic: true }),
  define("grievanceSubmission", "displayDeclarationCheckbox", true, "boolean", { isPublic: true }),
  define("grievanceSubmission", "declarationText", "I confirm that the information provided is true and complete to the best of my knowledge.", "string", { maxLength: 1000, isPublic: true }),

  define("ticket", "displayTicketOnConfirmation", true, "boolean", { isPublic: true }),
  define("ticket", "sendSubmissionAcknowledgement", true, "boolean"),
  define("ticket", "acknowledgementMessage", "Your grievance has been received. Keep your ticket number for future tracking.", "string", { maxLength: 1000, isPublic: true }),
  define("ticket", "allowPublicTicketTracking", true, "boolean", { isPublic: true }),
  define("ticket", "trackingVerificationMethod", "Ticket Number and Phone Number", "string", { options: ["Ticket Number Only", "Ticket Number and Phone Number", "Ticket Number and Email Address", "Ticket Number and Identification Number"], isPublic: true }),

  define("assignment", "defaultAssignmentMethod", "Manual", "string", { options: ["Manual", "Automatic", "Category-Based", "Department-Based", "Location-Based"] }),
  define("assignment", "allowAdminAssignment", true, "boolean"),
  define("assignment", "allowDepartmentReassignmentRequest", true, "boolean"),
  define("assignment", "allowDirectDepartmentReassignment", false, "boolean"),
  define("assignment", "departmentOfficerSelectionRequired", false, "boolean"),
  define("assignment", "internalAssignmentNoteRequired", false, "boolean"),
  define("assignment", "defaultAssignmentPriority", "Medium", "string", { options: ["Low", "Medium", "High", "Critical"] }),
  define("assignment", "notifyDepartmentOnAssignment", true, "boolean"),

  define("dueDate", "dueDateRequired", true, "boolean"),
  define("dueDate", "defaultResolutionDays", 15, "number", { integer: true, min: 1, max: 365 }),
  define("dueDate", "countWorkingDaysOnly", true, "boolean"),
  define("dueDate", "excludePublicHolidays", true, "boolean"),
  define("dueDate", "dueDateReminderDays", 3, "number", { integer: true, min: 1, max: 90 }),
  define("dueDate", "automaticallyMarkOverdue", true, "boolean"),
  define("dueDate", "allowDepartmentChangeDueDate", false, "boolean"),
  define("dueDate", "adminApprovalDueDateExtension", true, "boolean"),
  define("dueDate", "enableEscalation", true, "boolean"),
  define("dueDate", "escalateAfterDays", 2, "number", { integer: true, min: 1, max: 365 }),

  define("workflow", "defaultNewGrievanceStatus", "New", "string", { options: ["New", "Under Review", "In Progress", "Pending Information", "Resolved", "Closed", "Rejected", "Duplicate", "Returned"] }),
  define("workflow", "adminReviewRequired", true, "boolean"),
  define("workflow", "departmentAcceptanceRequired", true, "boolean"),
  define("workflow", "adminApprovalBeforeClosure", true, "boolean"),
  define("workflow", "allowReopening", true, "boolean"),
  define("workflow", "reopenPermission", "Super Admin and Admin", "string", { options: ["Super Admin Only", "Super Admin and Admin"] }),
  define("workflow", "requireCommentOnStatusChange", true, "boolean"),
  define("workflow", "requireResolutionDocument", false, "boolean"),
  define("workflow", "autoCloseResolvedGrievances", false, "boolean"),
  define("workflow", "autoCloseAfterDays", 7, "number", { integer: true, min: 1, max: 365 }),

  ...[
    ["enableEmailNotifications", true], ["enableDashboardNotifications", true],
    ["notifySuperAdminNewGrievance", true], ["notifyAdminNewGrievance", true], ["notifyDepartmentOnAssignment", true], ["notifyCitizenStatusChange", true],
    ["notifyDueDateReminder", true], ["notifyOverdueGrievance", true], ["notifyAdminResolutionSubmission", true], ["notifyDepartmentResolutionReturned", true], ["notifyCitizenGrievanceClosed", true],
  ].map(([key, value]) => define("notifications", key, value, "boolean")),

  define("security", "minimumPasswordLength", 8, "number", { integer: true, min: 8, max: 32 }),
  define("security", "requireUppercase", true, "boolean"),
  define("security", "requireLowercase", true, "boolean"),
  define("security", "requireNumber", true, "boolean"),
  define("security", "requireSpecialCharacter", true, "boolean"),
  define("security", "passwordExpiryDays", 90, "number", { integer: true, min: 0, max: 3650 }),
  define("security", "maximumLoginAttempts", 5, "number", { integer: true, min: 3, max: 10 }),
  define("security", "accountLockDurationMinutes", 30, "number", { integer: true, min: 5, max: 1440 }),
  define("security", "sessionTimeoutMinutes", 60, "number", { integer: true, min: 5, max: 1440 }),
  define("security", "forcePasswordChangeFirstLogin", false, "boolean"),
  define("security", "enableTwoFactorAuthentication", false, "boolean"),
  define("security", "restrictConcurrentLogin", false, "boolean"),

  define("privacy", "privacyNotice", "We collect only the information required to receive, investigate, and resolve grievances.", "string", { required: true, maxLength: 10000, isPublic: true }),
  define("privacy", "termsAndConditions", "By using this portal, you agree to provide accurate information and use the service lawfully.", "string", { required: true, maxLength: 10000, isPublic: true }),
  define("privacy", "citizenConsentRequired", true, "boolean", { isPublic: true }),
  define("privacy", "maskIdentificationNumber", true, "boolean"),
  define("privacy", "maskCitizenPhoneNumber", true, "boolean"),
  define("privacy", "dataRetentionMonths", 84, "number", { integer: true, min: 1, max: 1200 }),
  define("privacy", "allowGrievanceExport", true, "boolean"),
  define("privacy", "allowAttachmentDownload", true, "boolean"),
  define("privacy", "publicTrackingDataVisibility", ["Ticket Number", "Submission Date", "Assigned Department", "Current Status", "Last Updated Date"], "json", { arrayOptions: ["Ticket Number", "Complaint Subject", "Submission Date", "Assigned Department", "Current Status", "Last Updated Date", "Resolution Summary", "Closure Date"], isPublic: true }),

  ...[
    ["showTotalGrievances", true], ["showNewGrievances", true], ["showUnassignedGrievances", true], ["showInProgressGrievances", true],
    ["showResolvedGrievances", true], ["showOverdueGrievances", true], ["showStatusDistributionChart", true], ["showMonthlyTrendChart", true],
    ["showDepartmentProgress", true], ["showRecentActivity", true], ["showHighPriorityCases", true], ["showDueTodayPanel", true],
  ].map(([key, value]) => define("dashboard", key, value, "boolean")),

  define("reports", "defaultReportFormat", "PDF", "string", { options: ["PDF", "Excel", "CSV"] }),
  define("reports", "reportHeaderTitle", "GRM Portal Grievance Report", "string", { required: true, maxLength: 180 }),
  define("reports", "showOrganizationLogo", true, "boolean"),
  define("reports", "showGeneratedBy", true, "boolean"),
  define("reports", "showGeneratedDate", true, "boolean"),
  define("reports", "allowAdminExport", true, "boolean"),
  define("reports", "allowMinistryExport", false, "boolean"),
  define("reports", "maximumExportRecords", 10000, "number", { integer: true, min: 1, max: 1000000 }),
  define("reports", "includeCitizenDetails", true, "boolean"),
  define("reports", "maskSensitiveDataInReports", true, "boolean"),

  define("footer", "footerText", "Government of Belize · Grievance Redress Management Portal", "string", { maxLength: 500, isPublic: true }),
  define("footer", "copyrightYear", new Date().getFullYear(), "number", { integer: true, min: 2000, max: 2200, isPublic: true }),
  define("footer", "supportEmail", "", "email", { maxLength: 190, isPublic: true }),
  define("footer", "supportPhone", "", "string", { maxLength: 40, phone: true, isPublic: true }),
  define("footer", "helpdeskWorkingHours", "Monday to Friday, 8:00 AM–5:00 PM", "string", { maxLength: 200, isPublic: true }),
  define("footer", "userGuideUrl", "", "url", { maxLength: 500, isPublic: true }),
  define("footer", "privacyPolicyUrl", "", "url", { maxLength: 500, isPublic: true }),
  define("footer", "termsConditionsUrl", "", "url", { maxLength: 500, isPublic: true }),
];

const generalSettingsDefaults = generalSettingDefinitions.reduce((groups, definition) => {
  groups[definition.group] ||= {};
  groups[definition.group][definition.key] = definition.defaultValue;
  return groups;
}, {});

const generalSettingsDefinitionMap = new Map(
  generalSettingDefinitions.map((definition) => [definition.settingKey, definition]),
);

module.exports = {
  generalSettingDefinitions,
  generalSettingsDefinitionMap,
  generalSettingsDefaults,
};
