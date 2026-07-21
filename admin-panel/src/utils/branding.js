export const DEFAULT_ADMIN_BRANDING = {
  logo: "/assets/images/ministry-logo-footer.png",
  favicon: "",
  organizationName: "Ministry of Human Development, Family Support and Gender Affairs",
  portalName: "GRM Portal",
};

export const resolveBrandingAsset = (assetPath) => {
  if (!assetPath) return "";
  if (/^(?:https?:|data:|blob:)/i.test(assetPath)) return assetPath;
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5001";
  return new URL(assetPath, `${backendUrl.replace(/\/$/, "")}/`).toString();
};

export const normalizeBranding = (organization = {}) => ({
  ...DEFAULT_ADMIN_BRANDING,
  ...organization,
  logo: organization.logo ? resolveBrandingAsset(organization.logo) : DEFAULT_ADMIN_BRANDING.logo,
  favicon: organization.favicon ? resolveBrandingAsset(organization.favicon) : "",
});

export const readStoredBranding = () => {
  try {
    return { ...DEFAULT_ADMIN_BRANDING, ...JSON.parse(localStorage.getItem("admin_branding") || "{}") };
  } catch {
    return DEFAULT_ADMIN_BRANDING;
  }
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
