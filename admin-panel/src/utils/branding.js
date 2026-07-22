import { API_BASE_URL, BACKEND_URL } from "../config/runtime-env";

export const DEFAULT_ADMIN_BRANDING = {
  logo: "/assets/images/ministry-logo-footer.png",
  favicon: "",
  organizationName: "Ministry of Human Development, Family Support and Gender Affairs",
  organizationShortName: "",
  portalName: "GRM Portal",
  portalSubtitle: "",
  footerText: "",
  copyrightYear: null,
};

export const INSTALLER_FALLBACK_BRANDING = {
  logo: "",
  favicon: "",
  organizationName: "",
  portalName: "Application Installer",
  portalSubtitle: "",
  footerText: "",
  copyrightYear: null,
};

export const resolveBrandingAsset = (assetPath, backendUrl) => {
  if (!assetPath) return "";
  if (/^(?:https?:|data:|blob:)/i.test(assetPath)) return assetPath;
  const assetBaseUrl = backendUrl || BACKEND_URL;
  return new URL(assetPath, `${assetBaseUrl.replace(/\/$/, "")}/`).toString();
};

export const normalizeBranding = (settings = {}, options = {}) => {
  const fallback = options.fallback || DEFAULT_ADMIN_BRANDING;
  const isSettingsPayload = Boolean(settings.organization || settings.portal || settings.footer);
  const organization = isSettingsPayload ? settings.organization || {} : settings;
  const portal = isSettingsPayload ? settings.portal || {} : {};
  const footer = isSettingsPayload ? settings.footer || {} : {};

  return {
    ...fallback,
    organizationName: organization.organizationName || fallback.organizationName,
    organizationShortName: organization.organizationShortName ||
      (isSettingsPayload ? organization.organizationName || "" : fallback.organizationShortName),
    portalName: organization.portalName || portal.portalTitle || fallback.portalName,
    portalSubtitle: portal.portalSubtitle ?? fallback.portalSubtitle,
    logo: organization.logo
      ? resolveBrandingAsset(organization.logo, options.backendUrl)
      : fallback.logo,
    favicon: organization.favicon
      ? resolveBrandingAsset(organization.favicon, options.backendUrl)
      : fallback.favicon,
    footerText: footer.footerText ?? fallback.footerText,
    copyrightYear: footer.copyrightYear ?? fallback.copyrightYear,
  };
};

export const readStoredBranding = () => {
  try {
    return { ...DEFAULT_ADMIN_BRANDING, ...JSON.parse(localStorage.getItem("admin_branding") || "{}") };
  } catch {
    return DEFAULT_ADMIN_BRANDING;
  }
};

export const storeBranding = (branding) => {
  localStorage.setItem("admin_branding", JSON.stringify(branding));
};

export const publicSettingsUrl = (backendUrl) => {
  if (backendUrl) return `${backendUrl.replace(/\/$/, "")}/api/public/settings`;
  return `${API_BASE_URL}/public/settings`;
};

export const loadPublicBranding = async ({ backendUrl, fallback, signal } = {}) => {
  const response = await fetch(publicSettingsUrl(backendUrl), { signal });
  if (!response.ok) throw new Error("Unable to load public branding");
  const payload = await response.json();
  return normalizeBranding(payload.data || {}, { backendUrl, fallback });
};

export const applyDocumentBranding = (branding) => {
  const existingFavicon = document.querySelector("link[data-dynamic-branding='favicon']");
  if (branding.favicon) {
    let link = existingFavicon;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      link.dataset.dynamicBranding = "favicon";
      document.head.appendChild(link);
    }
    link.href = branding.favicon;
  } else {
    existingFavicon?.remove();
  }
  document.title = `${branding.portalName || "GRM Portal"} | Administration Portal`;
};
