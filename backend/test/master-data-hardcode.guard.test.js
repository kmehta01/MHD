const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const sourceRoots = [
  path.resolve(__dirname, "../src"),
  path.resolve(__dirname, "../../admin-panel/src"),
  path.resolve(__dirname, "../../frontend/src"),
];
const excluded = new Set(["default-general-settings.js"]);
const displayNamePredicates = /(?:status|ticket_priority)\s+(?:=|IN|NOT\s+IN)\s*(?:\(|)\s*['"](?:New|Under Review|In Progress|Pending Information|Resolved|Closed|Rejected|Duplicate|Returned|Low|Medium|High|Critical)['"]/i;
const optionArray = /(?:STATUSES|PRIORITIES|DEPARTMENTS|DISTRICTS|CATEGORIES)\s*=\s*\[/;
const grievanceFormArray = /(?:assistance|contact(?:Preference)?|submissionChannel|channel|accommodation)Options\s*=\s*\[/i;
const grievanceAllowedSet = /ALLOWED_(?:ASSISTANCE|CONTACT_PREFERENCES?|CHANNELS?|ACCOMMODATIONS?)/;
const duplicateAttachmentRegistry = /(?:fileTypeRegistry|FILE_TYPE_REGISTRY)\s*=/;
const fixedAttachmentLimit = /(?:fileSize|maximumBytes)\s*:\s*(?:5|25)\s*\*\s*1024\s*\*\s*1024/;
const fixedAttachmentAccept = /accept\s*=\s*["'][^"']*\.pdf[^"']*,[^"']*["']/i;
const legacyDueDateDefault = /DEFAULT_GRIEVANCE_DUE_DAYS/;
const fixedTenDayDueDate = /(?:DATE_ADD|DATE_SUB)\([^)]*(?:created_at|due_at)[^)]*INTERVAL\s+10\s+DAY/i;

const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const target = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(target) : target;
});

test("runtime source contains no master display-name predicates or option arrays", () => {
  const violations = sourceRoots.flatMap((sourceRoot) => walk(sourceRoot)
    .filter((file) => /\.jsx?$/.test(file) && !excluded.has(path.basename(file)))
    .filter((file) => {
      const source = fs.readFileSync(file, "utf8");
      return displayNamePredicates.test(source) || optionArray.test(source) ||
        grievanceFormArray.test(source) || grievanceAllowedSet.test(source) ||
        duplicateAttachmentRegistry.test(source) || fixedAttachmentLimit.test(source) ||
        fixedAttachmentAccept.test(source) || legacyDueDateDefault.test(source) ||
        fixedTenDayDueDate.test(source);
    })
    .map((file) => path.relative(path.resolve(__dirname, "../.."), file)));
  assert.deepEqual(violations, []);
});

test("runtime and migration sources contain no legacy fixed due-date fallback", () => {
  const dueDateRoots = [
    path.resolve(__dirname, "../src"),
    path.resolve(__dirname, "../scripts"),
  ];
  const violations = dueDateRoots.flatMap((sourceRoot) => walk(sourceRoot)
    .filter((file) => /\.js$/.test(file))
    .filter((file) => {
      const source = fs.readFileSync(file, "utf8");
      return legacyDueDateDefault.test(source) || fixedTenDayDueDate.test(source);
    })
    .map((file) => path.relative(path.resolve(__dirname, "../.."), file)));
  assert.deepEqual(violations, []);
});

test("configurable complaint values are not ENUMs or legacy mirror writes", () => {
  const schemaFiles = [
    path.resolve(__dirname, "../../database/database.sql"),
    path.resolve(__dirname, "../scripts/apply-complaints-migration.js"),
  ];
  const configurableEnum = /(?:status|ticket_priority|contact_pref|submission_type|intake_source|office_initial_classification)\s+ENUM\s*\(/i;
  assert.deepEqual(schemaFiles.filter((file) => {
    const source = fs.readFileSync(file, "utf8");
    const complaintSchema = file.endsWith(".sql")
      ? source.match(/CREATE TABLE IF NOT EXISTS complaints \([\s\S]*?\n\) ENGINE=/i)?.[0] || ""
      : source;
    return configurableEnum.test(complaintSchema);
  }), []);

  const runtimeFiles = [
    path.resolve(__dirname, "../src/models/complaint.model.js"),
    path.resolve(__dirname, "../src/models/lifecycle.model.js"),
  ];
  const legacyUpdate = /UPDATE\s+complaints\s+SET[\s\S]{0,240}\b(?:status|ticket_priority)\s*=/i;
  assert.deepEqual(runtimeFiles.filter((file) => legacyUpdate.test(fs.readFileSync(file, "utf8"))), []);
  assert.doesNotMatch(fs.readFileSync(path.resolve(__dirname, "../scripts/apply-role-permissions-migration.js"), "utf8"), /const\s+departments\s*=\s*\[/);
});

test("public contact components contain no fixed contact or copyright values", () => {
  const files = [
    path.resolve(__dirname, "../../frontend/src/components/Header.jsx"),
    path.resolve(__dirname, "../../frontend/src/components/Footer.jsx"),
    path.resolve(__dirname, "../../frontend/src/pages/Departments.jsx"),
  ];
  const forbidden = [
    /(?:tel:|mailto:)(?:\+?\d|[A-Za-z0-9._%+-]+@)/i,
    /[A-Za-z0-9._%+-]+@(?:humandev\.gov\.bz|gmail\.com)/i,
    /©\s*20\d{2}/,
    /TMedia Business Solution/i,
    /https:\/\/(?:www\.)?(?:facebook|instagram|youtube|x|twitter)\.com/i,
  ];
  const violations = files.filter((file) => forbidden.some((pattern) => pattern.test(fs.readFileSync(file, "utf8"))));
  assert.deepEqual(violations, []);
});

test("unauthenticated admin pages contain no fixed organization branding", () => {
  const files = ["Login.jsx", "RecoveryCodes.jsx", "Install.jsx"]
    .map((file) => path.resolve(__dirname, `../../admin-panel/src/pages/${file}`));
  const forbidden = [
    /Ministry of Human Development/i,
    /ministry-logo-footer\.png/i,
    /Government of Belize/i,
    /MHD Belize Installer/i,
    /(?:©|&copy;)\s*20\d{2}/i,
  ];
  const violations = files.filter((file) => forbidden.some((pattern) => pattern.test(fs.readFileSync(file, "utf8"))));
  assert.deepEqual(violations, []);
});

test("admin identity and navigation contain no fabricated runtime values", () => {
  const files = ["Topbar.jsx", "Sidebar.jsx", "../pages/Dashboard.jsx"]
    .map((file) => path.resolve(__dirname, `../../admin-panel/src/components/${file}`));
  const forbidden = [
    /Marisol Young/i,
    /MHD Belize/i,
    /\bcount\s*:\s*(?:12|5)\b/,
  ];
  const violations = files.filter((file) => forbidden.some((pattern) => pattern.test(fs.readFileSync(file, "utf8"))));
  assert.deepEqual(violations, []);
});

test("client runtime URLs are centralized outside development configuration", () => {
  const roots = [
    path.resolve(__dirname, "../../admin-panel/src"),
    path.resolve(__dirname, "../../frontend/src"),
  ];
  const violations = roots.flatMap((root) => walk(root)
    .filter((file) => /\.[jt]sx?$/.test(file))
    .filter((file) => !file.endsWith(`${path.sep}config${path.sep}runtime-env.js`))
    .filter((file) => !/\.test\.[jt]sx?$/.test(file))
    .filter((file) => path.basename(file) !== "Install.jsx")
    .filter((file) => /import\.meta\.env\.VITE_|https?:\/\/(?:localhost|127\.0\.0\.1)/i.test(fs.readFileSync(file, "utf8")))
    .map((file) => path.relative(path.resolve(__dirname, "../.."), file)));
  assert.deepEqual(violations, []);
});

test("email and service runtime identity contain no fixed organization branding", () => {
  const files = [
    path.resolve(__dirname, "../src/services/mail.service.js"),
    path.resolve(__dirname, "../src/server.js"),
    path.resolve(__dirname, "../../admin-panel/src/pages/Dashboard.jsx"),
    path.resolve(__dirname, "../../admin-panel/index.html"),
  ];
  const forbidden = [/MHD Belize/i, /Ministry of Human Development/i, /Government of Belize/i];
  const violations = files.filter((file) => forbidden.some((pattern) => pattern.test(fs.readFileSync(file, "utf8"))));
  assert.deepEqual(violations, []);
});

test("runtime ticket examples contain no fixed dates or sample master codes", () => {
  const files = [
    path.resolve(__dirname, "../../admin-panel/src/components/ticket-settings/FormatExamples.jsx"),
    path.resolve(__dirname, "../../admin-panel/src/pages/super-admin/settings/TicketNumberFormat.jsx"),
    path.resolve(__dirname, "../../frontend/src/pages/SubmitComplaint.jsx"),
  ];
  const violations = files.filter((file) => {
    const source = fs.readFileSync(file, "utf8");
    return /\b2026\b|GRM-[A-Z0-9-]*(?:HLT|BZ)/.test(source);
  });
  const parser = fs.readFileSync(path.resolve(__dirname, "../src/utils/ticket-format-parser.js"), "utf8");
  assert.deepEqual(violations, []);
  assert.doesNotMatch(parser, /["'](?:DEP|LOC|CAT)["']/);
});

test("ticket runtime contains no fixed timezone outside the General Settings policy", () => {
  const files = [
    path.resolve(__dirname, "../src/utils/ticket-period-helper.js"),
    path.resolve(__dirname, "../src/utils/ticket-format-parser.js"),
    path.resolve(__dirname, "../src/services/ticket-number-generator.service.js"),
    path.resolve(__dirname, "../src/services/ticket-settings.service.js"),
    path.resolve(__dirname, "../src/services/ticket-example.service.js"),
  ];
  const violations = files.filter((file) => /America\/Belize|TICKET_TIME_ZONE\s*=/.test(fs.readFileSync(file, "utf8")));
  assert.deepEqual(violations, []);
});
