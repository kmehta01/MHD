export const superAdminNavigation = [
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: "dashboard",
  },
  {
    name: "Grievance Management",
    icon: "grievances",
    children: [
      { name: "All Grievances", path: "/grievances" },
      { name: "New Grievances", path: "/grievances/new" },
      { name: "Under Review", path: "/grievances/under-review" },
      { name: "Unassigned", path: "/grievances/unassigned" },
      { name: "Assigned", path: "/grievances/assigned" },
      { name: "In Progress", path: "/grievances/in-progress" },
      {
        name: "Pending Information",
        path: "/grievances/pending-information",
      },
      { name: "Resolved", path: "/grievances/resolved" },
      { name: "Closed", path: "/grievances/closed" },
      { name: "Rejected", path: "/grievances/rejected" },
      { name: "Duplicate", path: "/grievances/duplicate" },
      { name: "Overdue", path: "/grievances/overdue" },
    ],
  },
  {
    name: "Department Management",
    icon: "database",
    children: [
      {
        name: "Departments",
        path: "/department-management/departments",
      },
      {
        name: "Complaint Categories",
        path: "/department-management/complaint-categories",
      },
      {
        name: "Department Mapping",
        path: "/department-management/department-mapping",
      },
      {
        name: "Assignment Rules",
        path: "/department-management/assignment-rules",
      },
    ],
  },
  {
    name: "User Management",
    icon: "users",
    children: [
      {
        name: "Admin Users",
        path: "/user-management/admin-users",
      },
      {
        name: "Ministry Users",
        path: "/user-management/ministry-users",
      },
      {
        name: "Department Heads",
        path: "/user-management/department-heads",
      },
      {
        name: "Department Officers",
        path: "/user-management/department-officers",
      },
      {
        name: "Roles & Permissions",
        path: "/user-management/roles-permissions",
      },
    ],
  },
  {
    name: "Reports",
    icon: "activity",
    children: [
      {
        name: "Grievance Summary",
        path: "/reports/grievance-summary",
      },
      {
        name: "Department-wise Report",
        path: "/reports/department-wise",
      },
      {
        name: "Status-wise Report",
        path: "/reports/status-wise",
      },
      {
        name: "Category-wise Report",
        path: "/reports/category-wise",
      },
      {
        name: "Priority-wise Report",
        path: "/reports/priority-wise",
      },
      {
        name: "Overdue Report",
        path: "/reports/overdue",
      },
      {
        name: "Resolution-Time Report",
        path: "/reports/resolution-time",
      },
      {
        name: "Export Reports",
        path: "/reports/export",
      },
    ],
  },
  {
    name: "System Settings",
    icon: "settings",
    children: [
      {
        name: "General Settings",
        path: "/super-admin/settings/general",
      },
      {
        name: "Ticket Number Format",
        path: "/super-admin/settings/ticket-number-format",
      },
      {
        name: "Status Settings",
        path: "/system-settings/status",
      },
      {
        name: "Priority Settings",
        path: "/system-settings/priority",
      },
      {
        name: "Due-Date Rules",
        path: "/system-settings/due-date-rules",
      },
      {
        name: "Email / SMTP Settings",
        path: "/system-settings/email-smtp",
      },
      {
        name: "Notification Templates",
        path: "/system-settings/notification-templates",
      },
      {
        name: "Audit Logs",
        path: "/system-settings/audit-logs",
      },
    ],
  },
  // {
  //   name: "Profile",
  //   icon: "user",
  //   children: [
  //     { name: "My Profile", path: "/profile" },
  //     { name: "Change Password", path: "/profile/change-password" },
  //     { name: "Logout", action: "logout", icon: "logout" },
  //   ],
  // },
];

export const findSuperAdminNavigationItem = (pathname) => {
  for (const item of superAdminNavigation) {
    if (item.path === pathname) {
      return { ...item, parent: null };
    }

    const child = item.children?.find(
      (candidate) => candidate.path === pathname,
    );

    if (child) {
      return { ...child, parent: item.name, parentIcon: item.icon };
    }
  }

  return null;
};
