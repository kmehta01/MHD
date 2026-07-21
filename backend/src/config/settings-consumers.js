const SETTINGS_GROUP_CONSUMERS = Object.freeze({
  organization: [
    "backend/src/middlewares/settings-upload.middleware.js",
    "frontend/src/components/Header.jsx", "frontend/src/components/Footer.jsx",
    "frontend/src/pages/SubmitComplaint.jsx", "backend/src/services/report.service.js",
  ],
  portal: [
    "frontend/src/components/Layout.jsx", "frontend/src/utils/date-format.js",
    "backend/src/controllers/complaint.controller.js", "backend/src/controllers/dashboard.controller.js",
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
    "backend/src/controllers/lifecycle.controller.js",
  ],
  workflow: [
    "backend/src/controllers/lifecycle.controller.js", "backend/src/services/runtime-worker.service.js",
    "backend/src/controllers/public-complaint.controller.js",
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
  ],
  dashboard: ["backend/src/controllers/dashboard.controller.js"],
  reports: [
    "backend/src/controllers/report.controller.js", "backend/src/services/report.service.js",
  ],
  footer: ["frontend/src/components/Footer.jsx"],
});

const buildSettingsConsumerRegistry = (definitions) => new Map(
  definitions.map((definition) => [definition.settingKey, SETTINGS_GROUP_CONSUMERS[definition.group] || []]),
);

module.exports = { SETTINGS_GROUP_CONSUMERS, buildSettingsConsumerRegistry };
