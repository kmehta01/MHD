const assert = require("node:assert/strict");
const test = require("node:test");
const {
  ATTACHMENT_TYPES,
  COMPLAINT_FILENAME_PATTERN,
  SUPPORTED_ATTACHMENT_TYPE_KEYS,
  hasMatchingSignature,
  publicAttachmentTypes,
  resolveAttachmentType,
} = require("../src/config/attachment-types");

const signatures = {
  pdf: Buffer.from("%PDF-1.7"),
  jpeg: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  ole: Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
  zip: Buffer.from([0x50, 0x4b, 0x03, 0x04]),
};

test("all supported attachment types publish non-sensitive extension and MIME metadata", () => {
  assert.equal(publicAttachmentTypes().length, 8);
  for (const key of SUPPORTED_ATTACHMENT_TYPE_KEYS) {
    const type = ATTACHMENT_TYPES[key];
    assert.equal(resolveAttachmentType({ originalname: `file${type.extensions[0]}`, mimetype: type.mimeTypes[0] }, [key]), key);
    assert.equal(hasMatchingSignature(key, signatures[type.signature]), true);
    assert.equal(hasMatchingSignature(key, Buffer.from("not-a-valid-signature")), false);
  }
});

test("extension and MIME type must match the same enabled registry entry", () => {
  assert.equal(resolveAttachmentType({ originalname: "file.jpg", mimetype: "application/pdf" }, ["JPG", "PDF"]), null);
  assert.equal(resolveAttachmentType({ originalname: "file.pdf", mimetype: "application/pdf" }, ["JPG"]), null);
  assert.equal(resolveAttachmentType({ originalname: "file.exe", mimetype: "application/pdf" }, ["PDF"]), null);
});

test("generated upload filename validation only accepts supported safe names", () => {
  assert.equal(COMPLAINT_FILENAME_PATTERN.test("1721462400000-123456789.xlsx"), true);
  for (const filename of ["../../123-4.pdf", "123-4.exe", "document.pdf", "C:\\123-4.pdf"]) {
    assert.equal(COMPLAINT_FILENAME_PATTERN.test(filename), false);
  }
});
