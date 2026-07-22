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
