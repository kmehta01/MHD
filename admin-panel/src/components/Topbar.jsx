import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Icon from "./Icon";
import ProfileAvatar from "./ProfileAvatar";
import API from "../services/api";
import { hasAnyPermission, isAdmin } from "../utils/permissions";
import { findAdminNavigationItem } from "../config/adminNavigation";
import { findSuperAdminNavigationItem } from "../config/superAdminNavigation";

const pageNames = {
  "/dashboard": "Dashboard",
  "/applications": "Applications",
  "/grievances": "Grievances",
  "/contact-enquiries": "Contact Enquiries",
  "/users": "Users",
  "/roles-permissions": "Roles & Permissions",
  "/settings": "Settings",
  "/super-admin/settings/general": "General Settings",
  "/audit-logs": "Audit Logs",
  "/profile": "My Profile",
  "/grievances/new/create": "Grievance Form",
};

const formatRelativeTime = (value) => {
  const submittedAt = new Date(value).getTime();
  if (!Number.isFinite(submittedAt)) return "Recently";

  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - submittedAt) / 1000),
  );
  if (elapsedSeconds < 60) return "Just now";

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} min${elapsedMinutes === 1 ? "" : "s"} ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `${elapsedHours} hr${elapsedHours === 1 ? "" : "s"} ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays} day${elapsedDays === 1 ? "" : "s"} ago`;
};

const formatLastLogin = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-BZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const Topbar = ({ onLogout, onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const menusRef = useRef(null);
  const [adminUser, setAdminUser] = useState(() =>
    JSON.parse(localStorage.getItem("admin_user") || "null"),
  );
  const name = adminUser?.name || "Administrator";
  const role = adminUser?.role_name || "Administrator";
  const canViewGrievances = hasAnyPermission([
    "grievances.view_all",
    "grievances.view_department",
  ]);
  const canViewNotifications = hasAnyPermission(["notifications.view"]);
  const currentPageName =
    (isAdmin() ? findAdminNavigationItem(location.pathname)?.name : null) ||
    findSuperAdminNavigationItem(location.pathname)?.name ||
    pageNames[location.pathname] ||
    "Dashboard";

  const loadNotifications = useCallback(async () => {
    if (!canViewNotifications) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setNotificationsLoading(true);
      const response = await API.get("/notifications", { params: { per_page: 5 } });

      setNotifications((response.data.data || []).map((item) => ({
        ...item,
        tokenNumber: item.token_number || "System",
        subject: item.message,
        complainant: "",
        submittedAt: item.created_at,
      })));
      setUnreadCount(Number(response.data.unread_count || 0));
    } catch {
      // Keep the topbar usable if notification polling temporarily fails.
    } finally {
      setNotificationsLoading(false);
    }
  }, [canViewNotifications]);

  useEffect(() => {
    const syncUser = (event) => {
      setAdminUser(
        event.detail || JSON.parse(localStorage.getItem("admin_user") || "null"),
      );
    };

    window.addEventListener("admin-user-updated", syncUser);
    window.addEventListener("storage", syncUser);
    return () => {
      window.removeEventListener("admin-user-updated", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menusRef.current && !menusRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const initialTimer = window.setTimeout(loadNotifications, 0);
    const timer = window.setInterval(loadNotifications, 30000);
    window.addEventListener("focus", loadNotifications);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
      window.removeEventListener("focus", loadNotifications);
    };
  }, [loadNotifications]);

  const markRead = async (notificationId) => {
    await API.put(`/notifications/${notificationId}/read`).catch(() => {});
    setNotifications((current) => current.map((item) =>
      item.id === notificationId ? { ...item, read_at: new Date().toISOString() } : item));
    setUnreadCount((current) => Math.max(0, current - 1));
  };

  const markAllRead = async () => {
    await API.put("/notifications/read-all").catch(() => {});
    setNotifications((current) => current.map((item) => ({
      ...item,
      read_at: item.read_at || new Date().toISOString(),
    })));
    setUnreadCount(0);
  };

  const openNotification = (notification) => {
    if (!notification.read_at) markRead(notification.id);
    setOpenMenu(null);
    if (notification.complaint_id) navigate(`/grievances?complaint=${notification.complaint_id}`);
  };

  const toggleNotifications = () => {
    const opening = openMenu !== "notifications";
    setOpenMenu(opening ? "notifications" : null);
    if (opening) loadNotifications();
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-button mobile-menu-button" type="button" onClick={onMenuClick}>
          <Icon name="menu" />
          <span className="sr-only">Open navigation</span>
        </button>
        <div className="breadcrumb">
          <span>Administration</span>
          <Icon name="chevronRight" size={14} />
          <strong>{currentPageName}</strong>
        </div>
      </div>

      <div className="topbar-actions" ref={menusRef}>
        <label className="global-search">
          <Icon name="search" size={18} />
          <input aria-label="Search admin panel" placeholder="Search content, people..." type="search" />
          <kbd>Ctrl K</kbd>
        </label>

        <div className="menu-anchor">
          <button
            aria-expanded={openMenu === "notifications"}
            className="icon-button notification-button"
            onClick={toggleNotifications}
            type="button"
          >
            <Icon name="bell" size={19} />
            {unreadCount > 0 ? (
              <span className="notification-dot">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
            <span className="sr-only">Notifications</span>
          </button>
          {openMenu === "notifications" ? (
            <div className="dropdown-panel notification-panel">
              <div className="dropdown-header">
                <div>
                  <strong>Notifications</strong>
                  <span>
                    {unreadCount
                      ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
                      : "No unread notifications"}
                  </span>
                </div>
                {unreadCount > 0 ? (
                  <button onClick={markAllRead} type="button">
                    Mark all read
                  </button>
                ) : null}
              </div>
              <div className="notification-list">
                {notificationsLoading && notifications.length === 0 ? (
                  <div className="notification-empty">Loading notifications...</div>
                ) : notifications.length === 0 ? (
                  <div className="notification-empty">
                    No notifications are available.
                  </div>
                ) : (
                  notifications.map((item) => {
                    const isUnread = !item.read_at;

                    return (
                      <button
                        className={`notification-item${isUnread ? " unread" : ""}`}
                        key={item.id}
                        onClick={() => openNotification(item)}
                        type="button"
                      >
                        <span className="notification-icon danger">
                          <Icon name="grievances" size={17} />
                        </span>
                        <span className="notification-copy">
                          <strong>{item.title}</strong>
                          <span>
                            {item.tokenNumber} · {item.subject}
                          </span>
                          <small>
                            {item.complainant} · {formatRelativeTime(item.submittedAt)}
                          </small>
                        </span>
                        {isUnread ? <span className="unread-mark" /> : null}
                      </button>
                    );
                  })
                )}
              </div>
              {canViewGrievances ? (
                <Link className="dropdown-footer-link" to="/grievances" onClick={() => setOpenMenu(null)}>
                  View all grievances <Icon name="arrowRight" size={15} />
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="topbar-divider" />

        <div className="menu-anchor">
          <button
            aria-expanded={openMenu === "profile"}
            className="profile-trigger"
            onClick={() => setOpenMenu(openMenu === "profile" ? null : "profile")}
            type="button"
          >
            <ProfileAvatar name={name} profilePhoto={adminUser?.profile_photo} />
            <span className="profile-copy">
              <strong>{name}</strong>
              <span>{role}</span>
            </span>
            <Icon name="chevronDown" size={16} />
          </button>
          {openMenu === "profile" ? (
            <div className="dropdown-panel profile-panel">
              <div className="profile-summary">
                <ProfileAvatar className="avatar large" name={name} profilePhoto={adminUser?.profile_photo} />
                <div>
                  <strong>{name}</strong>
                  <span>{adminUser?.email || "Not available"}</span>
                </div>
              </div>
              <div className="last-login">
                <Icon name="clock" size={16} />
                <span>Last login: {formatLastLogin(adminUser?.last_login)}</span>
              </div>
              <div className="profile-menu-links">
                <Link to="/profile" onClick={() => setOpenMenu(null)}><Icon name="user" size={17} /> My Profile</Link>
                <button type="button"><Icon name="help" size={17} /> Help & Support</button>
              </div>
              <button className="profile-logout" type="button" onClick={onLogout}>
                <Icon name="logout" size={17} /> Sign out securely
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
