const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const db = require("../src/config/db");
const {
  resolveSafeComplaintUploadPath,
  validateGrievanceBody,
} = require("../src/controllers/public-complaint.controller");

test.after(async () => db.end());

const formOptions = {
  assistance: [{ key: "large_print" }, { key: "spanish" }],
  submissionChannels: [{ key: "telephone" }, { key: "online_form" }],
  accommodations: [{ key: "translation" }],
  contactPreferences: [
    { key: "phone", contactRequirement: "phone" },
    { key: "email", contactRequirement: "email" },
    { key: "mail", contactRequirement: "address" },
    { key: "in_person", contactRequirement: "none" },
  ],
};

const validate = (body, settings) => validateGrievanceBody(body, settings, formOptions);

const validBody = {
  submission_type: "named",
  comp_name: "Test Complainant",
  comp_phone: "501-600-0000",
  comp_email: "test@example.com",
  contact_pref: "phone",
  on_behalf: "no",
  issue_type: ["family_support", "service_delays"],
  issue_other: "Family support concern",
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
  const result = validate(validBody);

  assert.equal(result.fullName, "Test Complainant");
  assert.equal(result.isAnonymous, false);
  assert.deepEqual(result.grievanceData.issue_type, []);
  assert.equal(result.grievanceData.incident_location, "Belmopan office");
  assert.equal(result.complaintCategory, "Family support concern");
});

test("accepts anonymous demo submissions without complainant fields", () => {
  const result = validate({
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
      validate({
        ...validBody,
        on_behalf: "yes",
        affected_name: "",
        relationship: "",
        permission: "",
      }),
    /Affected person name is required/,
  );
});

test("ignores prototype-related keys without dynamic member access", () => {
  const body = { ...validBody };
  Object.defineProperty(body, "__proto__", {
    enumerable: true,
    value: { polluted: true },
  });
  body.constructor = { prototype: { polluted: true } };
  body.prototype = { polluted: true };

  const result = validate(body);
  assert.equal(result.fullName, "Test Complainant");
  assert.equal({}.polluted, undefined);
});

test("rejects unknown or inactive client-injected grievance choices", () => {
  assert.throws(() => validate({ ...validBody, channel: ["carrier_pigeon"] }), /Invalid contact channel/);
  assert.throws(() => validate({ ...validBody, assistance: ["inactive_choice"] }), /Invalid assistance option/);
  assert.throws(() => validate({ ...validBody, accommodation: ["injected"] }), /Invalid accommodation/);
});

test("enforces zero-or-one assistance and one-or-more submission channels", () => {
  assert.throws(() => validate({ ...validBody, assistance: ["large_print", "spanish"] }), /Only one/);
  assert.throws(() => validate({ ...validBody, channel: [] }), /at least one channel/);
  assert.throws(() => validate({ ...validBody, contact_pref: ["phone", "email"] }), /exactly one value/);
});

test("uses configurable contact-field requirements instead of option names", () => {
  assert.throws(() => validate({ ...validBody, contact_pref: "email", comp_email: "" }), /Email address is required/);
  assert.throws(() => validate({ ...validBody, contact_pref: "mail", comp_address: "" }), /Address is required/);
  assert.doesNotThrow(() => validate({ ...validBody, contact_pref: "in_person", comp_email: "" }));
});

test("requires runtime form configuration and its required groups", () => {
  assert.throws(() => validateGrievanceBody(validBody), /configuration is unavailable/);
  assert.throws(
    () => validateGrievanceBody(validBody, undefined, { ...formOptions, submissionChannels: [] }),
    /Required grievance form choices are unavailable/,
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
