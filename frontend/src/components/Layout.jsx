import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import { createTranslator } from "../i18n/resources";
import { applyPublicDocumentBranding, PUBLIC_SETTINGS_URL, resolveBrandingAsset } from "../utils/branding";

function Layout() {
  const [portal, setPortal] = useState({ settings: null, meta: null, loading: true, error: "" });
  const [language, setLanguage] = useState(() => localStorage.getItem("public_portal_language") || "");

  useEffect(() => {
    const controller = new AbortController();
    fetch(PUBLIC_SETTINGS_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load portal settings");
        return response.json();
      })
      .then((response) => {
        const settings = response.data;
        const organization = settings?.organization || {};
        const normalized = {
          ...settings,
          organization: { ...organization, logo: resolveBrandingAsset(organization.logo) },
        };
        setPortal({ settings: normalized, meta: response.meta || {}, loading: false, error: "" });
        setLanguage((current) => current || settings?.portal?.defaultLanguage || "English");
        applyPublicDocumentBranding({
          ...organization,
          portalName: settings?.portal?.portalTitle || organization.portalName,
        });
      })
      .catch((error) => {
        if (error.name !== "AbortError") setPortal({ settings: null, meta: null, loading: false, error: error.message });
      });
    return () => controller.abort();
  }, []);

  const t = createTranslator(language || "English");
  const changeLanguage = (nextLanguage) => {
    setLanguage(nextLanguage);
    localStorage.setItem("public_portal_language", nextLanguage);
    document.documentElement.lang = nextLanguage === "Spanish" ? "es" : "en";
  };

  if (portal.loading) return <main className="portal-state"><span className="portal-state__spinner" /><h1>{t("loading")}</h1></main>;
  if (portal.error || !portal.settings) return <main className="portal-state"><i className="fa-solid fa-triangle-exclamation" /><h1>{t("unavailable")}</h1><p>{t("unavailableMessage")}</p></main>;

  const branding = portal.settings.organization;
  const maintenance = portal.settings.portal.maintenanceMode;

  return (
    <>
      <Header branding={branding} language={language} onLanguageChange={changeLanguage} settings={portal.settings} t={t} />
      {maintenance ? (
        <main className="portal-state portal-state--maintenance">
          <i className="fa-solid fa-screwdriver-wrench" />
          <p className="section-label">{t("maintenance")}</p>
          <h1>{portal.settings.portal.portalTitle}</h1>
          <p>{portal.settings.portal.maintenanceMessage}</p>
        </main>
      ) : <Outlet context={{ ...portal, language, setLanguage: changeLanguage, t }} />}
      <Footer settings={portal.settings} t={t} />
    </>
  );
}

export default Layout;
