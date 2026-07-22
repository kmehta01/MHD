const assert = require("node:assert/strict");
const test = require("node:test");
const db = require("../src/config/db");
const DirectoryModel = require("../src/models/site-directory.model");
const controller = require("../src/controllers/site-directory.controller");

test.after(async () => db.end());

const response = () => ({
  statusCode: 200, body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test("public site-directory endpoint returns only the model's public projection", async () => {
  const original = DirectoryModel.listDirectory;
  const expected = { departments: [], facilities: [], socialLinks: [] };
  DirectoryModel.listDirectory = async (options) => {
    assert.deepEqual(options, { activeOnly: true });
    return expected;
  };
  try {
    const res = response();
    await controller.getPublicDirectory({}, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { status: true, data: expected });
  } finally { DirectoryModel.listDirectory = original; }
});

test("social configuration rejects unsafe, mismatched, and unknown platforms", async () => {
  for (const body of [
    { platformKey: "facebook", label: "Facebook", url: "javascript:alert(1)", isActive: true },
    { platformKey: "facebook", label: "Facebook", url: "https://example.com/account", isActive: true },
    { platformKey: "unknown", label: "Unknown", url: "https://example.com", isActive: true },
  ]) {
    const res = response();
    await controller.saveSocialLink({ params: {}, body, user: { id: 1 } }, res);
    assert.equal(res.statusCode, 400);
  }
});

test("contact configuration rejects client-injected types and malformed link values", async () => {
  const original = DirectoryModel.ownerExists;
  DirectoryModel.ownerExists = async () => true;
  try {
    for (const body of [
      { key: "web", type: "html", label: "Website", displayValue: "x", linkValue: "x" },
      { key: "phone", type: "phone", label: "Phone", displayValue: "bad", linkValue: "call-me" },
      { key: "email", type: "email", label: "Email", displayValue: "bad", linkValue: "bad" },
    ]) {
      const res = response();
      await controller.saveContact({ params: { ownerType: "department", ownerId: "1" }, body, user: { id: 1 } }, res);
      assert.equal(res.statusCode, 400);
    }
  } finally { DirectoryModel.ownerExists = original; }
});
