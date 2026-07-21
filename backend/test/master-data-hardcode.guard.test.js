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
