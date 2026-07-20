import { useMemo, useState } from "react";
import Icon from "../Icon";

const resolveAssetUrl = (path) => {
  if (!path) return "";
  if (/^(?:https?:|blob:|data:)/i.test(path)) return path;
  const base = import.meta.env.VITE_BACKEND_URL || "http://localhost:5001";
  try {
    return new URL(path, `${base.replace(/\/$/, "")}/`).toString();
  } catch {
    return path;
  }
};

const rules = {
  logo: {
    accept: ".jpg,.jpeg,.png,.svg,.webp,image/jpeg,image/png,image/svg+xml,image/webp",
    types: new Set(["image/jpeg", "image/png", "image/svg+xml", "image/webp"]),
    formats: "JPG, PNG, SVG, or WebP",
  },
  favicon: {
    accept: ".ico,.png,.svg,image/x-icon,image/vnd.microsoft.icon,image/png,image/svg+xml",
    types: new Set(["image/x-icon", "image/vnd.microsoft.icon", "image/png", "image/svg+xml"]),
    formats: "ICO, PNG, or SVG",
  },
};

const FileUploadPreview = ({ assetType, disabled, label, maxKb, onUpload, uploading, value }) => {
  const [localError, setLocalError] = useState("");
  const [preview, setPreview] = useState("");
  const displayUrl = useMemo(() => preview || resolveAssetUrl(value), [preview, value]);
  const rule = rules[assetType];

  const selectFile = async (file) => {
    setLocalError("");
    if (!file) return;
    if (!rule.types.has(file.type)) {
      setLocalError(`Choose a ${rule.formats} file.`);
      return;
    }
    if (file.size > maxKb * 1024) {
      setLocalError(`The file must be ${maxKb} KB or smaller.`);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    await onUpload(assetType, file);
    URL.revokeObjectURL(objectUrl);
    setPreview("");
  };

  return (
    <div className="settings-file-field">
      <span className="settings-field-label">{label}</span>
      <div className={`settings-file-preview ${assetType}`}>
        <div className="settings-file-image">
          {displayUrl ? <img alt={`${label} preview`} src={displayUrl} /> : <Icon name={assetType === "logo" ? "globe" : "settings"} size={27} />}
        </div>
        <div className="settings-file-copy">
          <strong>{value ? `${label} uploaded` : `No ${label.toLowerCase()} uploaded`}</strong>
          <span>{rule.formats} · Maximum {maxKb} KB</span>
          <label className={`button button-secondary${disabled || uploading ? " disabled" : ""}`}>
            <Icon name="arrowUp" size={15} />
            {uploading ? "Uploading..." : value ? "Replace file" : "Upload file"}
            <input
              accept={rule.accept}
              disabled={disabled || uploading}
              onChange={(event) => {
                selectFile(event.target.files?.[0]);
                event.target.value = "";
              }}
              type="file"
            />
          </label>
        </div>
      </div>
      {localError ? <small className="settings-field-error">{localError}</small> : null}
    </div>
  );
};

export default FileUploadPreview;
