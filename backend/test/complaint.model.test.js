const test = require("node:test");
const assert = require("node:assert/strict");
const { buildComplaintToken, createWithAttachments } = require("../src/models/complaint.model");

test("builds complaint token using GRM year month and sequence", () => {
  const token = buildComplaintToken({
    date: new Date("2026-07-10T00:00:00Z"),
    prefix: "GRM",
    sequence: 1,
  });

  assert.equal(token, "GRM-2026-07-0001");
});

test("pads complaint sequences to at least four digits", () => {
  const token = buildComplaintToken({
    date: new Date("2026-06-10T00:00:00Z"),
    sequence: 42,
  });

  assert.equal(token, "GRM-2026-06-0042");
});

test("complaint creation requires the current runtime settings policy", async () => {
  await assert.rejects(
    createWithAttachments({ complaint: {}, attachments: [] }),
    /Runtime General Settings are required/,
  );
});
