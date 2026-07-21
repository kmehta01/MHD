const extensionOf = (name) => {
  const match = String(name || "").toLowerCase().match(/(\.[a-z0-9]+)$/);
  return match?.[1] || "";
};

export const buildAttachmentPolicy = ({ types = [], allowedTypeKeys = [], maximumFiles = 1, maximumSizeMb = 1 }) => {
  const allowedKeys = new Set(allowedTypeKeys);
  const allowedTypes = types.filter((type) => allowedKeys.has(type.key));
  return {
    allowedTypes,
    allowedLabels: allowedTypes.map((type) => type.label),
    accept: [...new Set(allowedTypes.flatMap((type) => type.extensions))].join(","),
    maximumFiles,
    maximumSizeMb,
    maximumSizeBytes: maximumSizeMb * 1024 * 1024,
    accepts(file) {
      const extension = extensionOf(file?.name);
      return allowedTypes.some((type) =>
        type.extensions.includes(extension) && type.mimeTypes.includes(file?.type));
    },
  };
};
