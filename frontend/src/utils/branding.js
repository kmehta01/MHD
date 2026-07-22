import { API_BASE_URL, BACKEND_URL } from "../config/runtime-env";

export const PUBLIC_SETTINGS_URL = `${API_BASE_URL}/public/settings`;
export const PUBLIC_DIRECTORY_URL = `${API_BASE_URL}/public/site-directory`;

export const resolveBrandingAsset = (assetPath) => {
  if (!assetPath) return "";
  if (/^(?:https?:|data:|blob:)/i.test(assetPath)) return assetPath;
  return new URL(assetPath, `${BACKEND_URL}/`).toString();
};

export const resolveDirectoryAsset = (assetPath) => {
  if (!assetPath) return "";
  if (/^https:\/\//i.test(assetPath)) return assetPath;
  if (assetPath.startsWith("/uploads/directory/")) {
    return new URL(assetPath, `${BACKEND_URL}/`).toString();
  }
  return assetPath;
};

export const applyPublicDocumentBranding = (organization = {}) => {
  if (organization.favicon) {
    const favicon = document.querySelector("link[rel~='icon']") || document.createElement("link");
    favicon.rel = "icon";
    favicon.href = resolveBrandingAsset(organization.favicon);
    if (!favicon.parentNode) document.head.appendChild(favicon);
  }
  if (organization.portalName) document.title = organization.portalName;
};
