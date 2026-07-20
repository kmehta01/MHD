const INVALID_FILENAME_CHARACTERS = new Set('<>:"|?*');

const replaceInvalidFilenameCharacters = (value) =>
  Array.from(value, (character) => {
    const codePoint = character.codePointAt(0);
    return codePoint < 32 || codePoint === 127 ||
      INVALID_FILENAME_CHARACTERS.has(character)
      ? "_"
      : character;
  }).join("");

export const sanitizeDownloadFilename = (value, fallback = "download") => {
  const requestedName = typeof value === "string" ? value : "";
  const basename = requestedName.split(/[\\/]/).pop() || "";
  const sanitizedName = replaceInvalidFilenameCharacters(
    basename.normalize("NFKC"),
  )
    .replace(/^\.+/, "")
    .trim()
    .slice(0, 180);

  return sanitizedName || fallback;
};

export const downloadBlob = (blob, requestedFilename, fallbackFilename) => {
  if (!(blob instanceof Blob)) {
    throw new TypeError("Download response must be a Blob");
  }

  const objectUrl = URL.createObjectURL(blob);

  try {
    if (new URL(objectUrl).protocol !== "blob:") {
      throw new TypeError("Download URL must use the blob protocol");
    }

    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = sanitizeDownloadFilename(
      requestedFilename,
      fallbackFilename,
    );
    link.rel = "noopener";
    link.click();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
};
