const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {
  resolveSafeComplaintUploadPath,
  validateGrievanceBody,
} = require("../src/controllers/public-complaint.controller");

const validBody = {
  submission_type: "named",
  comp_name: "Test Complainant",
  comp_phone: "501-600-0000",
  comp_email: "test@example.com",
  contact_pref: "phone",
  on_behalf: "no",
  issue_type: ["family_support", "service_delays"],
  channel: ["telephone", "online_form"],
  incident_date: "2026-01-10",
  incident_location: "Belmopan office",
  description: "A detailed description of the grievance.",
  desired_outcome: "A written response and service review.",
  tried_resolve: "no",
  has_documents: "no",
  has_witnesses: "no",
  declaration_confirm: "true",
  signature: "Test Complainant",
  declaration_date: "2026-01-11",
};

test("validates and maps the demo named grievance fields", () => {
  const result = validateGrievanceBody(validBody);

  assert.equal(result.fullName, "Test Complainant");
  assert.equal(result.isAnonymous, false);
  assert.deepEqual(result.grievanceData.issue_type, [
    "family_support",
    "service_delays",
  ]);
  assert.equal(result.grievanceData.incident_location, "Belmopan office");
  assert.equal(result.complaintCategory, "Multiple grievance issues");
});

test("accepts anonymous demo submissions without complainant fields", () => {
  const result = validateGrievanceBody({
    ...validBody,
    submission_type: "anonymous",
    comp_name: "",
    comp_phone: "",
    comp_email: "",
    contact_pref: "",
    on_behalf: "",
    signature: "",
  });

  assert.equal(result.fullName, "Anonymous grievance");
  assert.equal(result.isAnonymous, true);
  assert.equal(result.grievanceData.comp_name, null);
  assert.equal(result.grievanceData.signature, null);
});

test("requires conditional affected-person details", () => {
  assert.throws(
    () =>
      validateGrievanceBody({
        ...validBody,
        on_behalf: "yes",
        affected_name: "",
        relationship: "",
        permission: "",
      }),
    /Affected person name is required/,
  );
});

test("resolves generated complaint filenames only inside the upload directory", () => {
  const resolved = resolveSafeComplaintUploadPath({
    filename: "1721462400000-123456789.pdf",
    path: path.resolve(__dirname, "../.env"),
  });

  assert.equal(
    resolved,
    path.resolve(
      __dirname,
      "../uploads/complaints/1721462400000-123456789.pdf",
    ),
  );
});

test("rejects path traversal and unexpected stored upload filenames", () => {
  const invalidNames = [
    "../../.env",
    "..\\..\\.env",
    "/etc/passwd",
    "C:\\Windows\\win.ini",
    "1721462400000-123456789.exe",
    "supporting-document.pdf",
    "",
  ];

  invalidNames.forEach((filename) => {
    assert.equal(resolveSafeComplaintUploadPath({ filename }), null);
  });
});
