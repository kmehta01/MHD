const fs = require("fs/promises");
const { constants } = require("fs");
const path = require("path");

const getFilename = (fileOrFilename) => {
  if (typeof fileOrFilename === "string") return fileOrFilename;
  return typeof fileOrFilename?.filename === "string"
    ? fileOrFilename.filename
    : "";
};

const resolveGeneratedUploadPath = (uploadRoot, fileOrFilename, filenamePattern) => {
  const filename = getFilename(fileOrFilename);
  const safeFilename = path.basename(filename);
  if (!filename || !filenamePattern.test(safeFilename) || safeFilename !== filename) {
    return null;
  }

  const root = path.resolve(uploadRoot);
  const candidate = path.resolve(root, safeFilename);
  const relative = path.relative(root, candidate);
  if (!relative || relative !== safeFilename || path.isAbsolute(relative)) return null;
  return candidate;
};

const openGeneratedUpload = async (
  uploadRoot,
  fileOrFilename,
  filenamePattern,
  maximumBytes,
) => {
  const filePath = resolveGeneratedUploadPath(
    uploadRoot,
    fileOrFilename,
    filenamePattern,
  );
  if (!filePath) throw Object.assign(new Error("Unsafe upload filename"), { code: "EINVAL" });

  const stats = await fs.lstat(filePath);
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw Object.assign(new Error("Upload must be a regular file"), { code: "EINVAL" });
  }
  if (!Number.isSafeInteger(stats.size) || stats.size > maximumBytes) {
    throw Object.assign(new Error("Upload exceeds the permitted size"), { code: "EFBIG" });
  }

  const noFollow = constants.O_NOFOLLOW || 0;
  const handle = await fs.open(filePath, constants.O_RDONLY | noFollow);
  try {
    const openedStats = await handle.stat();
    if (!openedStats.isFile() || openedStats.size !== stats.size || openedStats.size > maximumBytes) {
      throw Object.assign(new Error("Upload changed during inspection"), { code: "EINVAL" });
    }
    return { handle, size: openedStats.size };
  } catch (error) {
    await handle.close();
    throw error;
  }
};

const readGeneratedUpload = async ({
  uploadRoot,
  fileOrFilename,
  filenamePattern,
  maximumBytes,
  bytesToRead = maximumBytes,
}) => {
  const { handle, size } = await openGeneratedUpload(
    uploadRoot,
    fileOrFilename,
    filenamePattern,
    maximumBytes,
  );
  try {
    const length = Math.min(size, bytesToRead, maximumBytes);
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
};

const unlinkGeneratedUpload = async (
  uploadRoot,
  fileOrFilename,
  filenamePattern,
) => {
  const filePath = resolveGeneratedUploadPath(
    uploadRoot,
    fileOrFilename,
    filenamePattern,
  );
  if (!filePath) return false;

  let stats;
  try {
    stats = await fs.lstat(filePath);
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
  if (!stats.isFile() || stats.isSymbolicLink()) return false;

  await fs.unlink(filePath);
  return true;
};

module.exports = {
  readGeneratedUpload,
  resolveGeneratedUploadPath,
  unlinkGeneratedUpload,
};
