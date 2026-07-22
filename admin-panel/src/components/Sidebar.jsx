import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import Icon from "./Icon";
import {
  hasAnyPermission,
  isAdmin,
  isSuperAdmin,
} from "../utils/permissions";
import { adminNavigation } from "../config/adminNavigation";
import { superAdminNavigation } from "../config/superAdminNavigation";
import { formatNavigationBadge } from "../utils/adminPresentation";

const menuGroups = [
  {
    label: "Workspace",
    items: [
      {
        name: "Dashboard",
        path: "/dashboard",
        icon: "dashboard",
        permission: "dashboard.view",
      },
    ],
  },
  {
    label: "Public Services",
    items: [
      {
        name: "Applications",
        path: "/applications",
        icon: "applications",
        permission: "applications.view",
      },
      {
        name: "Grievances",
        path: "/grievances",
        icon: "grievances",
        badgeKey: "newGrievances",
        alert: true,
        permission: [
          "grievances.view_all",
          "grievances.view_department",
        ],
      },
      {
        name: "Contact Enquiries",
        path: "/contact-enquiries",
        icon: "contact",
        permission: "contact_offices.view",
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        name: "Users",
        path: "/users",
        icon: "users",
        permission: "users.view",
      },
      {
        name: "Roles & Permissions",
        path: "/roles-permissions",
        icon: "roles",
        permission: "roles.view",
      },
      {
        name: "Settings",
        path: "/settings",
        icon: "settings",
        permission: "settings.view",
      },
      {
        name: "Audit Logs",
        path: "/audit-logs",
        icon: "audit",
        permission: [
          "audit_logs.view_all",
          "audit_logs.view_limited",
          "audit_logs.view_own",
        ],
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        name: "Department Management",
        path: "/department-management/departments",
        icon: "database",
        permission: [
          "departments.view",
          "departments.manage",
          "departments.manage_limited",
        ],
      },
      {
        name: "Assignment Management",
        path: "/assignment-management/assign-to-department",
        icon: "users",
        permission: ["grievances.assign", "grievances.reassign"],
      },
      {
        name: "Reports",
        path: "/reports/grievance-summary",
        icon: "activity",
        permission: [
          "reports.view_all",
          "reports.view_operational",
          "reports.view_department",
        ],
      },
    ],
  },
  // {
  //   label: "Profile",
  //   items: [
  //     {
  //       name: "My Profile",
  //       path: "/profile",
  //       icon: "user",
  //     },
  //     {
  //       name: "Change Password",
  //       path: "/profile/change-password",
  //       icon: "key",
  //     },
  //     {
  //       name: "Logout",
  //       action: "logout",
  //       icon: "logout",
  //     },
  //   ],
  // },
];

const filterNavigationByPermissions = (navigation) =>
  navigation
    .map((item) => {
      if (!item.children) {
        return !item.permission || hasAnyPermission(item.permission)
          ? item
          : null;
      }

      const children = item.children.filter(
        (child) =>
          child.action ||
          !child.permission ||
          hasAnyPermission(child.permission),
      );

      return children.length ? { ...item, children } : null;
    })
    .filter(Boolean);

const Sidebar = ({ branding, isOpen, navigationCounts = {}, onClose, onLogout }) => {
  const location = useLocation();
  const superAdmin = isSuperAdmin();
  const admin = isAdmin();
  const roleNavigation = superAdmin
    ? superAdminNavigation
    : admin
      ? filterNavigationByPermissions(adminNavigation)
      : null;
  const [expandedSections, setExpandedSections] = useState(
    () =>
      new Set(
        (roleNavigation || [])
          .filter((item) => item.children)
          .map((item) => item.name),
      ),
  );

  const allowedMenuGroups = menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          !item.permission || hasAnyPermission(item.permission),
      ),
    }))
    .filter((group) => group.items.length > 0);

  const toggleSection = (sectionName) => {
    setExpandedSections((current) => {
      const next = new Set(current);

      if (next.has(sectionName)) {
        next.delete(sectionName);
      } else {
        next.add(sectionName);
      }

      return next;
    });
  };

  const handleLogout = () => {
    onClose();
    onLogout();
  };

  return (
    <>
      <button
        className={`sidebar-overlay ${isOpen ? "is-visible" : ""}`}
        onClick={onClose}
        aria-label="Close navigation"
        type="button"
      />

      <aside className={`sidebar ${isOpen ? "is-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-logo-shell">
            <img
              alt={branding?.organizationName || "Ministry of Human Development, Family Support and Gender Affairs"}
              className="brand-logo"
              src={branding?.logo || "/assets/images/ministry-logo-footer.png"}
            />
          </div>

          <button
            className="sidebar-close"
            type="button"
            onClick={onClose}
            aria-label="Close menu"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="sidebar-scroll">
          <nav className="sidebar-nav" aria-label="Admin navigation">
            {roleNavigation ? (
              <div className="role-navigation">
                {roleNavigation.map((item) => {
                  const badge = formatNavigationBadge(navigationCounts[item.badgeKey]);
                  if (!item.children) {
                    return (
                      <NavLink
                        className={({ isActive }) =>
                          `nav-link ${isActive ? "active" : ""}`
                        }
                        end
                        key={item.path}
                        onClick={onClose}
                        to={item.path}
                      >
                        <span className="nav-icon">
                          <Icon name={item.icon} size={19} />
                        </span>
                        <span>{item.name}</span>
                        {badge ? <span className={`nav-count ${item.badgeAlert ? "alert" : ""}`}>{badge}</span> : null}
                      </NavLink>
                    );
                  }

                  const expanded = expandedSections.has(item.name);
                  const sectionActive = item.children.some(
                    (child) => child.path === location.pathname,
                  );

                  return (
                    <div
                      className={`super-nav-section ${
                        sectionActive ? "active" : ""
                      }`}
                      key={item.name}
                    >
                      <button
                        aria-expanded={expanded}
                        className={`nav-section-button ${
                          expanded ? "expanded" : ""
                        }`}
                        onClick={() => toggleSection(item.name)}
                        type="button"
                      >
                        <span className="nav-icon">
                          <Icon name={item.icon} size={19} />
                        </span>
                        <span>{item.name}</span>
                        {badge ? <span className={`nav-count ${item.badgeAlert ? "alert" : ""}`}>{badge}</span> : null}
                        <Icon
                          className="nav-section-chevron"
                          name="chevronDown"
                          size={16}
                        />
                      </button>

                      {expanded ? (
                        <div className="nav-submenu">
                          {item.children.map((child) =>
                            child.action === "logout" ? (
                              <button
                                className="nav-sub-link nav-sub-action"
                                key={child.name}
                                onClick={handleLogout}
                                type="button"
                              >
                                <span className="nav-sub-marker" />
                                <span>{child.name}</span>
                              </button>
                            ) : (
                              <NavLink
                                className={({ isActive }) =>
                                  `nav-sub-link ${
                                    isActive ? "active" : ""
                                  }`
                                }
                                end
                                key={child.path}
                                onClick={onClose}
                                to={child.path}
                              >
                                <span className="nav-sub-marker" />
                                <span>{child.name}</span>
                              </NavLink>
                            ),
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              allowedMenuGroups.map((group) => (
                <div className="nav-group" key={group.label}>
                  <p className="nav-group-label">{group.label}</p>

                  {group.items.map((item) => {
                    const badge = formatNavigationBadge(navigationCounts[item.badgeKey]);
                    return (
                    item.action === "logout" ? (
                      <button
                        className="nav-link nav-action-link"
                        key={item.name}
                        onClick={handleLogout}
                        type="button"
                      >
                        <span className="nav-icon">
                          <Icon name={item.icon} size={19} />
                        </span>
                        <span>{item.name}</span>
                      </button>
                    ) : (
                      <NavLink
                        className={({ isActive }) =>
                          `nav-link ${isActive ? "active" : ""}`
                        }
                        key={item.path}
                        onClick={onClose}
                        to={item.path}
                      >
                        <span className="nav-icon">
                          <Icon name={item.icon} size={19} />
                        </span>

                        <span>{item.name}</span>

                        {badge ? (
                          <span
                            className={`nav-count ${
                              item.alert ? "alert" : ""
                            }`}
                          >
                            {badge}
                          </span>
                        ) : null}
                      </NavLink>
                    ));
                  })}
                </div>
              ))
            )}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="system-mini-status">
            <span className="status-pulse" />
            <div>
              <strong>All systems operational</strong>
              <span>Last checked 2 min ago</span>
            </div>
          </div>

          <div className="sidebar-version">Version 1.0.0</div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
