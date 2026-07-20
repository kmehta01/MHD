import { useLocation } from "react-router-dom";
import Icon from "../components/Icon";
import { findAdminNavigationItem } from "../config/adminNavigation";
import { findSuperAdminNavigationItem } from "../config/superAdminNavigation";
import {
  getAdminUser,
  isAdmin,
  isMinistryUser,
} from "../utils/permissions";

const descriptions = {
  "Department Management":
    "Configure departments, complaint categories, mappings, and grievance assignment rules.",
  "User Management":
    "Manage ministry and department users with the correct responsibilities and access.",
  "Assignment Management":
    "Assign grievances, review reassignment requests, and manage due dates.",
  Monitoring:
    "Track department progress, deadlines, overdue grievances, and recent activity.",
  Reports:
    "Review grievance performance and operational trends across departments, statuses, and priorities.",
  "System Settings":
    "Configure the grievance platform's operational rules, notifications, and system preferences.",
  Profile:
    "Manage your Superadmin account details and security settings.",
};

const SuperAdminModule = () => {
  const location = useLocation();
  const admin = isAdmin();
  const ministryUser = isMinistryUser();
  const currentUser = getAdminUser();
  const navigationItem = admin
    ? findAdminNavigationItem(location.pathname)
    : findSuperAdminNavigationItem(location.pathname);
  const roleLabel = admin
    ? "Admin"
    : ministryUser
      ? "Ministry User"
      : currentUser?.role_slug === "super-admin"
        ? "Superadmin"
        : currentUser?.role_name || "User";
  const title = navigationItem?.name || roleLabel;
  const parent = navigationItem?.parent || "Administration";
  const icon = navigationItem?.parentIcon || navigationItem?.icon || "settings";

  return (
    <div className="module-page">
      <div className="module-page-header">
        <div>
          <div className="module-breadcrumb">
            <span>{parent}</span>
            <Icon name="chevronRight" size={13} />
            <strong>{title}</strong>
          </div>
          <h1>{title}</h1>
          <p>{descriptions[parent] || `Manage this ${roleLabel} module.`}</p>
        </div>
      </div>

      <section className="panel module-empty-state">
        <div className="empty-state-icon">
          <Icon name={icon} size={29} />
        </div>
        <h2>{title}</h2>
        <p>This module is available from the finalized {roleLabel} navigation.</p>
        <div className="empty-state-security">
          <Icon name="shieldCheck" size={15} />
          Access is restricted to authorized {roleLabel} users.
        </div>
      </section>
    </div>
  );
};

export default SuperAdminModule;
