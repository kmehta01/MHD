const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const test = require("node:test");
const express = require("express");
const db = require("../src/config/db");
const SettingsPolicy = require("../src/services/settings-policy.service");
const {
  getComplaintUploadPolicy,
  getResolutionUploadPolicy,
  handleComplaintUpload,
  handleResolutionDocumentUpload,
  removeUploadedFiles,
  uploadRoot,
} = require("../src/middlewares/complaint-upload.middleware");

test.after(async () => db.end());

const policy = ({ multiple = true, count = 3, size = 5, complaintTypes = ["PDF"], resolutionSize = 2, resolutionTypes = ["PNG"] } = {}) => ({
  grievanceSubmission: {
    allowMultipleAttachments: multiple,
    maximumAttachmentCount: count,
    maximumAttachmentSizeMb: size,
    allowedFileTypes: complaintTypes,
  },
  workflow: {
    resolutionDocumentMaximumSizeMb: resolutionSize,
    resolutionDocumentAllowedFileTypes: resolutionTypes,
  },
});

const upload = async (baseUrl, route, files) => {
  const body = new FormData();
  for (const file of files) body.append("attachments", new Blob([file.bytes], { type: file.type }), file.name);
  return fetch(`${baseUrl}${route}`, { method: "POST", body });
};

test("upload policies derive count, size, and independent allowed types from settings", () => {
  const settings = policy({ multiple: false, count: 9, size: 7, complaintTypes: ["PDF", "UNSUPPORTED"], resolutionSize: 4, resolutionTypes: ["DOCX"] });
  assert.deepEqual(getComplaintUploadPolicy(settings), {
    allowedTypes: ["PDF"], maximumFiles: 1, maximumSizeBytes: 7 * 1024 * 1024,
    maximumSizeMb: 7, documentLabel: "supporting document",
  });
  assert.deepEqual(getResolutionUploadPolicy(settings), {
    allowedTypes: ["DOCX"], maximumFiles: 1, maximumSizeBytes: 4 * 1024 * 1024,
    maximumSizeMb: 4, documentLabel: "resolution document",
  });
});

test("runtime upload enforcement follows the latest policy and cleans rejected files", async (t) => {
  let currentPolicy = policy({ multiple: false, complaintTypes: ["PDF"], resolutionTypes: ["PNG"] });
  t.mock.method(SettingsPolicy, "getPolicy", async () => currentPolicy);
  const before = new Set(await fs.readdir(uploadRoot));
  const app = express();
  app.post("/complaint", handleComplaintUpload, async (req, res) => {
    await removeUploadedFiles(req.files);
    res.json({ count: req.files.length });
  });
  app.post("/resolution", handleResolutionDocumentUpload, async (req, res) => {
    await removeUploadedFiles(req.files);
    res.json({ count: req.files.length });
  });
  app.use((error, _req, res, _next) => res.status(500).json({ status: false, message: error.message }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    let response = await upload(baseUrl, "/complaint", [{ name: "valid.pdf", type: "application/pdf", bytes: "%PDF-1.7" }]);
    assert.equal(response.status, 200);

    response = await upload(baseUrl, "/complaint", [{ name: "spoof.jpg", type: "application/pdf", bytes: "%PDF-1.7" }]);
    assert.equal(response.status, 400);

    response = await upload(baseUrl, "/complaint", [{ name: "invalid.pdf", type: "application/pdf", bytes: "invalid" }]);
    assert.equal(response.status, 400);

    response = await upload(baseUrl, "/complaint", [
      { name: "one.pdf", type: "application/pdf", bytes: "%PDF-1.7" },
      { name: "two.pdf", type: "application/pdf", bytes: "%PDF-1.7" },
    ]);
    assert.equal(response.status, 400);

    response = await upload(baseUrl, "/resolution", [{ name: "resolution.png", type: "image/png", bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) }]);
    assert.equal(response.status, 200);

    currentPolicy = policy({ size: 1, complaintTypes: ["PDF"], resolutionTypes: ["PNG"] });
    response = await upload(baseUrl, "/complaint", [{ name: "oversized.pdf", type: "application/pdf", bytes: Buffer.concat([Buffer.from("%PDF-"), Buffer.alloc(1024 * 1024)]) }]);
    assert.equal(response.status, 400);
    assert.match((await response.json()).message, /1 MB or smaller/);

    currentPolicy = policy({ complaintTypes: ["PNG"], resolutionTypes: ["PNG"] });
    response = await upload(baseUrl, "/complaint", [{ name: "now-disabled.pdf", type: "application/pdf", bytes: "%PDF-1.7" }]);
    assert.equal(response.status, 400);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }

  assert.deepEqual(new Set(await fs.readdir(uploadRoot)), before);
});
