const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");
const {
  DIRECTORY_IMAGE_PATTERN, removeDirectoryImage, uploadRoot, validSignature,
} = require("../src/middlewares/directory-image.middleware");

test("facility image names and signatures are restricted to reviewed image types", async () => {
  assert.equal(DIRECTORY_IMAGE_PATTERN.test(`facility-1-${"a".repeat(32)}.png`), true);
  assert.equal(DIRECTORY_IMAGE_PATTERN.test(`facility-1-${"a".repeat(32)}.svg`), false);
  const filename = `facility-1-${"b".repeat(32)}.png`;
  const target = path.join(uploadRoot, filename);
  await fs.writeFile(target, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]));
  try {
    assert.equal(await validSignature({ filename, mimetype: "image/png" }), true);
    assert.equal(await validSignature({ filename, mimetype: "image/webp" }), false);
  } finally { await removeDirectoryImage(filename); }
});

test("seeded frontend assets are never removed by directory upload cleanup", async () => {
  assert.equal(await removeDirectoryImage("/assets/images/golden-haven.png"), false);
});
