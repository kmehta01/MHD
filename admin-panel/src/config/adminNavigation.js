export const adminNavigation = [
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: "dashboard",
    permission: "dashboard.view",
  },
  {
    name: "Grievance Management",
    icon: "grievances",
    children: [
      {
        name: "New Grievances",
        path: "/grievances/new",
        permission: "grievances.review_new",
      },
      {
        name: "Under Review",
        path: "/grievances/under-review",
        permission: "grievances.view_all",
      },
      {
        name: "Unassigned",
        path: "/grievances/unassigned",
        permission: "grievances.assign",
      },
      {
        name: "Assigned",
        path: "/grievances/assigned",
        permission: [
          "grievances.view_all",
          "grievances.view_department",
        ],
      },
      {
        name: "In Progress",
        path: "/grievances/in-progress",
        permission: [
          "grievances.view_all",
          "grievances.view_department",
        ],
      },
      {
        name: "Pending Information",
        path: "/grievances/pending-information",
        permission: [
          "grievances.view_all",
          "grievances.view_department",
        ],
      },
      {
        name: "Resolved",
        path: "/grievances/resolved",
        permission: [
          "grievances.view_all",
          "grievances.view_department",
        ],
      },
      {
        name: "Closed",
        path: "/grievances/closed",
        permission: "grievances.close",
      },
      {
        name: "Rejected",
        path: "/grievances/rejected",
        permission: "grievances.view_all",
      },
      {
        name: "Duplicate",
        path: "/grievances/duplicate",
        permission: "grievances.view_all",
      },
      {
        name: "Overdue",
        path: "/grievances/overdue",
        permission: "grievances.view_all",
      },
    ],
  },
  {
    name: "Assignment Management",
    icon: "users",
    children: [
      {
        name: "Assign to Department",
        path: "/assignment-management/assign-to-department",
        permission: "grievances.assign",
      },
      {
        name: "Reassignment Requests",
        path: "/assignment-management/reassignment-requests",
        permission: "grievances.reassign",
      },
      {
        name: "Due-Date Management",
        path: "/assignment-management/due-date-management",
        permission: "grievances.assign",
      },
    ],
  },
  {
    name: "Department Management",
    icon: "database",
    children: [
      {
        name: "Departments",
        path: "/department-management/departments",
        permission: [
          "departments.view",
          "departments.manage",
          "departments.manage_limited",
        ],
      },
    ],
  },
  {
    name: "User Management",
    icon: "users",
    children: [
      {
        name: "Ministry Users",
        path: "/users",
        permission: "users.view",
      },
      {
        name: "Roles & Permissions",
        path: "/roles-permissions",
        permission: "roles.view",
      },
    ],
  },
  {
    name: "Monitoring",
    icon: "activity",
    children: [
      {
        name: "Department Progress",
        path: "/monitoring/department-progress",
        permission: "grievances.view_all",
      },
      {
        name: "Due Today",
        path: "/monitoring/due-today",
        permission: "grievances.view_all",
      },
      {
        name: "Overdue Grievances",
        path: "/monitoring/overdue-grievances",
        permission: "grievances.view_all",
      },
      {
        name: "Recently Updated",
        path: "/monitoring/recently-updated",
        permission: "grievances.view_all",
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
        permission: "reports.view_operational",
      },
      {
        name: "Department-wise Report",
        path: "/reports/department-wise",
        permission: "reports.view_operational",
      },
      {
        name: "Status-wise Report",
        path: "/reports/status-wise",
        permission: "reports.view_operational",
      },
      {
        name: "Category-wise Report",
        path: "/reports/category-wise",
        permission: "reports.view_operational",
      },
      {
        name: "Export Report",
        path: "/reports/export",
        permission: "reports.view_operational",
      },
    ],
  },
  {
    name: "System Settings",
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

export const findAdminNavigationItem = (pathname) => {
  for (const item of adminNavigation) {
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
