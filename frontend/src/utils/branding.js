const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";
const backendUrl = import.meta.env.VITE_BACKEND_URL || apiBaseUrl.replace(/\/api\/?$/, "");

export const PUBLIC_SETTINGS_URL = `${apiBaseUrl.replace(/\/$/, "")}/public/settings`;

export const resolveBrandingAsset = (assetPath) => {
  if (!assetPath) return "";
  if (/^(?:https?:|data:|blob:)/i.test(assetPath)) return assetPath;
  return new URL(assetPath, `${backendUrl.replace(/\/$/, "")}/`).toString();
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
