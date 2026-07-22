import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import API from "../services/api";
import {
  applyDocumentBranding,
  normalizeBranding,
  readStoredBranding,
} from "../utils/branding";
import { hasAnyPermission } from "../utils/permissions";
import useNavigationCounts from "../hooks/useNavigationCounts";

const AdminLayout = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [, setSessionRevision] = useState(0);
  const [branding, setBranding] = useState(readStoredBranding);
  const canViewGrievances = hasAnyPermission([
    "grievances.view_all",
    "grievances.view_department",
  ]);
  const navigationCounts = useNavigationCounts(canViewGrievances);

  const logout = async () => {
    try {
      await API.post("/auth/logout");
    } catch {
      // Local sign-out still completes if the session already expired.
    } finally {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");
      navigate("/login");
    }
  };

  useEffect(() => {
    let active = true;

    const refreshSession = () => {
      API.get("/auth/me")
        .then((response) => {
          if (!active || !response.data.data) return;
          localStorage.setItem(
            "admin_user",
            JSON.stringify(response.data.data),
          );
          window.dispatchEvent(
            new CustomEvent("admin-user-updated", {
              detail: response.data.data,
            }),
          );
          setSessionRevision((revision) => revision + 1);
        })
        .catch(() => {
          // The API interceptor handles invalid or revoked sessions.
        });
    };

    refreshSession();
    window.addEventListener("focus", refreshSession);

    return () => {
      active = false;
      window.removeEventListener("focus", refreshSession);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const acceptBranding = (settings) => {
      const next = normalizeBranding(settings);
      if (!active) return;
      setBranding(next);
      localStorage.setItem("admin_branding", JSON.stringify(next));
      applyDocumentBranding(next);
    };
    const handleBrandingUpdate = (event) => acceptBranding(event.detail);

    applyDocumentBranding(readStoredBranding());
    API.get("/settings/general")
      .then((response) => acceptBranding(response.data.data || {}))
      .catch(() => {
        // Retain the saved/default brand if settings are temporarily unavailable.
      });
    window.addEventListener("general-settings-branding-updated", handleBrandingUpdate);
    return () => {
      active = false;
      window.removeEventListener("general-settings-branding-updated", handleBrandingUpdate);
    };
  }, []);

  return (
    <div className="admin-shell">
      <Sidebar
        branding={branding}
        isOpen={isSidebarOpen}
        navigationCounts={navigationCounts}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={logout}
      />

      <div className="admin-main">
        <Topbar onLogout={logout} onMenuClick={() => setIsSidebarOpen(true)} />

        <main className="admin-content">
          <Outlet context={{ branding }} />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
