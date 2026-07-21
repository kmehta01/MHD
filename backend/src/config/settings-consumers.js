const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "../../..");

const SETTINGS_GROUP_CONSUMERS = Object.freeze({
  organization: [
    "backend/src/middlewares/settings-upload.middleware.js",
    "frontend/src/components/Header.jsx", "frontend/src/components/Footer.jsx",
    "frontend/src/pages/SubmitComplaint.jsx", "backend/src/services/report.service.js",
    "frontend/src/utils/branding.js", "admin-panel/src/utils/branding.js",
  ],
  portal: [
    "frontend/src/components/Layout.jsx", "frontend/src/utils/date-format.js",
    "backend/src/controllers/complaint.controller.js", "backend/src/controllers/dashboard.controller.js",
    "frontend/src/pages/Home.jsx", "backend/src/services/report.service.js",
    "backend/src/services/due-date.service.js", "backend/src/controllers/public-complaint.controller.js",
  ],
  grievanceSubmission: [
    "backend/src/controllers/public-complaint.controller.js",
    "backend/src/middlewares/complaint-upload.middleware.js", "frontend/src/pages/SubmitComplaint.jsx",
  ],
  ticket: [
    "backend/src/controllers/public-complaint.controller.js", "backend/src/services/notification.service.js",
    "frontend/src/pages/SubmitComplaint.jsx",
  ],
  assignment: [
    "backend/src/controllers/lifecycle.controller.js", "backend/src/services/routing.service.js",
    "backend/src/controllers/public-complaint.controller.js", "backend/src/services/notification.service.js",
  ],
  dueDate: [
    "backend/src/services/due-date.service.js", "backend/src/services/runtime-worker.service.js",
    "backend/src/controllers/lifecycle.controller.js", "backend/src/controllers/dashboard.controller.js",
    "backend/src/controllers/complaint.controller.js", "admin-panel/src/pages/ManageGrievances.jsx",
  ],
  workflow: [
    "backend/src/controllers/lifecycle.controller.js", "backend/src/services/runtime-worker.service.js",
    "backend/src/controllers/public-complaint.controller.js", "backend/src/middlewares/complaint-upload.middleware.js",
    "admin-panel/src/pages/ManageGrievances.jsx",
  ],
  notifications: [
    "backend/src/services/notification.service.js", "backend/src/services/runtime-worker.service.js",
  ],
  security: [
    "backend/src/controllers/auth.controller.js", "backend/src/middlewares/auth.middleware.js",
    "backend/src/services/password-policy.service.js", "backend/src/controllers/user.controller.js",
  ],
  privacy: [
    "backend/src/controllers/public-complaint.controller.js", "backend/src/controllers/complaint.controller.js",
    "backend/src/services/runtime-worker.service.js", "backend/src/services/report.service.js",
    "frontend/src/pages/SubmitComplaint.jsx",
    "backend/src/controllers/report.controller.js",
  ],
  dashboard: ["backend/src/controllers/dashboard.controller.js"],
  reports: [
    "backend/src/controllers/report.controller.js", "backend/src/services/report.service.js",
  ],
  footer: ["frontend/src/components/Footer.jsx"],
});

const SETTINGS_GROUP_RUNTIME = Object.freeze({
  organization: { activation: "immediate", enforcement: "branding, public identity, reports, and settings asset upload policy" },
  portal: { activation: "immediate", enforcement: "public availability, locale formatting, pagination, and dashboard query windows" },
  grievanceSubmission: { activation: "immediate", enforcement: "public/admin form presentation plus server-side complaint and upload validation" },
  ticket: { activation: "immediate", enforcement: "submission response, acknowledgement queueing, and public tracking verification" },
  assignment: { activation: "immediate", enforcement: "routing, assignment/reassignment lifecycle authorization, and notifications" },
  dueDate: { activation: "new records immediately; background rules on next worker cycle", enforcement: "due-date calculation, extension lifecycle, reminders, overdue state, and escalation" },
  workflow: { activation: "immediate; automation on next worker cycle", enforcement: "initial status, lifecycle transitions, resolution requirements, reopening, and auto-close" },
  notifications: { activation: "immediate", enforcement: "notification outbox admission by channel, recipient, and event" },
  security: { activation: "next authentication or protected request", enforcement: "password, lockout, session, first-login, two-factor, and concurrency policies" },
  privacy: { activation: "immediate; retention on next worker cycle", enforcement: "consent, masking, public visibility, downloads/exports, reporting, and anonymization" },
  dashboard: { activation: "next dashboard request", enforcement: "server-side widget omission and admin rendering" },
  reports: { activation: "next report request", enforcement: "export authorization, job limits, output format, headers, logo, and redaction" },
  footer: { activation: "next public settings load", enforcement: "public footer content and support/policy links" },
});

const sourceCache = new Map();
const readSource = (modulePath) => {
  if (!sourceCache.has(modulePath)) {
    const absolute = path.join(projectRoot, modulePath);
    sourceCache.set(modulePath, fs.existsSync(absolute) ? fs.readFileSync(absolute, "utf8") : "");
  }
  return sourceCache.get(modulePath);
};

const referencesKey = (modulePath, key) => {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:\\.|["'])${escaped}(?:["']|\\b)`).test(readSource(modulePath));
};

const buildSettingsConsumerRegistry = (definitions) => new Map(
  definitions.map((definition) => [
    definition.settingKey,
    (SETTINGS_GROUP_CONSUMERS[definition.group] || [])
      .filter((modulePath) => referencesKey(modulePath, definition.key)),
  ]),
);

module.exports = { SETTINGS_GROUP_CONSUMERS, SETTINGS_GROUP_RUNTIME, buildSettingsConsumerRegistry };
