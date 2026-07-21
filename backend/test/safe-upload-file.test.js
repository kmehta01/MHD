const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  readGeneratedUpload,
  resolveGeneratedUploadPath,
  unlinkGeneratedUpload,
} = require("../src/utils/safe-upload-file");

const pattern = /^asset-[a-f0-9]{8}\.png$/;

test("generated upload paths remain inside their configured root", () => {
  const root = path.resolve(os.tmpdir(), "safe-upload-root");
  assert.equal(
    resolveGeneratedUploadPath(root, "asset-deadbeef.png", pattern),
    path.join(root, "asset-deadbeef.png"),
  );
  for (const candidate of [
    "../asset-deadbeef.png",
    "..\\asset-deadbeef.png",
    "/tmp/asset-deadbeef.png",
    "C:\\Windows\\asset-deadbeef.png",
    "asset-deadbeef.png/child",
    "unexpected.png",
  ]) {
    assert.equal(resolveGeneratedUploadPath(root, candidate, pattern), null);
  }
});

test("bounded upload reads reject oversized files and cleanup only valid files", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "mhd-upload-test-"));
  try {
    const filename = "asset-deadbeef.png";
    const filePath = path.join(root, filename);
    await fs.writeFile(filePath, Buffer.from([1, 2, 3, 4, 5]));
    const prefix = await readGeneratedUpload({
      uploadRoot: root,
      fileOrFilename: filename,
      filenamePattern: pattern,
      maximumBytes: 5,
      bytesToRead: 3,
    });
    assert.deepEqual([...prefix], [1, 2, 3]);

    await assert.rejects(
      readGeneratedUpload({
        uploadRoot: root,
        fileOrFilename: filename,
        filenamePattern: pattern,
        maximumBytes: 4,
      }),
      (error) => error.code === "EFBIG",
    );
    assert.equal(await unlinkGeneratedUpload(root, "../asset-deadbeef.png", pattern), false);
    assert.equal(await fs.stat(filePath).then(() => true), true);
    assert.equal(await unlinkGeneratedUpload(root, filename, pattern), true);
    await assert.rejects(fs.stat(filePath), (error) => error.code === "ENOENT");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("generated upload operations reject symbolic links", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "mhd-upload-link-test-"));
  const outside = path.join(os.tmpdir(), `mhd-upload-target-${process.pid}.png`);
  try {
    await fs.writeFile(outside, "outside");
    const link = path.join(root, "asset-deadbeef.png");
    try {
      await fs.symlink(outside, link, "file");
    } catch (error) {
      if (["EPERM", "EACCES"].includes(error.code)) {
        t.skip("The current Windows account cannot create symbolic links");
        return;
      }
      throw error;
    }
    await assert.rejects(readGeneratedUpload({
      uploadRoot: root,
      fileOrFilename: "asset-deadbeef.png",
      filenamePattern: pattern,
      maximumBytes: 1024,
    }), /regular file/);
    assert.equal(await unlinkGeneratedUpload(root, "asset-deadbeef.png", pattern), false);
    assert.equal(await fs.readFile(outside, "utf8"), "outside");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(outside, { force: true });
  }
});
