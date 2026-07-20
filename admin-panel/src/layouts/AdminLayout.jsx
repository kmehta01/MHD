import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import API from "../services/api";

const AdminLayout = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [, setSessionRevision] = useState(0);

  const logout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    navigate("/login");
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

  return (
    <div className="admin-shell">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={logout}
      />

      <div className="admin-main">
        <Topbar onLogout={logout} onMenuClick={() => setIsSidebarOpen(true)} />

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
