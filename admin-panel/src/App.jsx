import { createBrowserRouter, createRoutesFromElements, Navigate, Route, RouterProvider } from "react-router-dom";
import "./App.css";

import Install from "./pages/Install";


import Login from "./pages/Login";
import RecoveryCodes from "./pages/RecoveryCodes";
import Dashboard from "./pages/Dashboard";
import ManageApplications from "./pages/ManageApplications";
import ManageGrievances from "./pages/ManageGrievances";
import AdminGrievanceForm from "./pages/AdminGrievanceForm";
import ManageContactEnquiries from "./pages/ManageContactEnquiries";
import ManageUsers from "./pages/ManageUsers";
import RolesPermissions from "./pages/RolesPermissions";
import WebsiteSettings from "./pages/WebsiteSettings";
import AuditLogs from "./pages/AuditLogs";
import SuperAdminModule from "./pages/SuperAdminModule";
import Unauthorized from "./pages/Unauthorized";
import Profile from "./pages/Profile";
import TicketNumberFormat from "./pages/super-admin/settings/TicketNumberFormat";
import Reports from "./pages/Reports";
import RuntimeConfiguration from "./pages/RuntimeConfiguration";

import ProtectedRoute from "./components/ProtectedRoute";
import PermissionRoute from "./components/PermissionRoute";
import SuperAdminRoute from "./components/SuperAdminRoute";
import RoleRoute from "./components/RoleRoute";
import AdminLayout from "./layouts/AdminLayout";

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
        <Route path="/install" element={<Install />} />
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/recovery-codes"
          element={
            <ProtectedRoute>
              <RecoveryCodes />
            </ProtectedRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/profile" element={<Profile />} />
          <Route
            path="/dashboard"
            element={
              <PermissionRoute permission="dashboard.view">
                <Dashboard />
              </PermissionRoute>
            }
          />
          <Route
            path="/applications"
            element={
              <PermissionRoute permission="applications.view">
                <ManageApplications />
              </PermissionRoute>
            }
          />
          <Route
            path="/grievances"
            element={
              <PermissionRoute
                permission={[
                  "grievances.view_all",
                  "grievances.view_department",
                ]}
              >
                <ManageGrievances />
              </PermissionRoute>
            }
          />
          <Route
            path="/grievances/new/create"
            element={
              <PermissionRoute
                permission={[
                  "grievances.view_all",
                  "grievances.view_department",
                ]}
              >
                <AdminGrievanceForm />
              </PermissionRoute>
            }
          />
          <Route
            path="/grievances/:view"
            element={
              <PermissionRoute
                permission={[
                  "grievances.view_all",
                  "grievances.view_department",
                ]}
              >
                <ManageGrievances />
              </PermissionRoute>
            }
          />
          <Route
            path="/contact-enquiries"
            element={
              <PermissionRoute permission="contact_offices.view">
                <ManageContactEnquiries />
              </PermissionRoute>
            }
          />
          <Route
            path="/users"
            element={
              <PermissionRoute permission="users.view">
                <ManageUsers />
              </PermissionRoute>
            }
          />
          <Route
            path="/roles-permissions"
            element={
              <PermissionRoute permission="roles.view">
                <RolesPermissions />
              </PermissionRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <RoleRoute allowedRoles={["super-admin", "admin"]}>
                <PermissionRoute permission={["settings.general.view", "settings.view"]}>
                  <WebsiteSettings />
                </PermissionRoute>
              </RoleRoute>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <PermissionRoute
                permission={[
                  "audit_logs.view_all",
                  "audit_logs.view_limited",
                  "audit_logs.view_own",
                ]}
              >
                <AuditLogs />
              </PermissionRoute>
            }
          />
          <Route
            path="/department-management/:module"
            element={
              <PermissionRoute
                permission={[
                  "departments.view",
                  "departments.manage",
                  "departments.manage_limited",
                ]}
              >
                <RuntimeConfiguration />
              </PermissionRoute>
            }
          />
          <Route
            path="/user-management/admin-users"
            element={
              <SuperAdminRoute>
                <ManageUsers />
              </SuperAdminRoute>
            }
          />
          <Route
            path="/user-management/roles-permissions"
            element={
              <SuperAdminRoute>
                <RolesPermissions />
              </SuperAdminRoute>
            }
          />
          <Route
            path="/user-management/:module"
            element={
              <SuperAdminRoute>
                <SuperAdminModule />
              </SuperAdminRoute>
            }
          />
          <Route
            path="/reports/:report"
            element={
              <PermissionRoute
                permission={[
                  "reports.view_all",
                  "reports.view_operational",
                  "reports.view_department",
                ]}
              >
                <Reports />
              </PermissionRoute>
            }
          />
          <Route
            path="/assignment-management/:module"
            element={
              <PermissionRoute
                permission={["grievances.assign", "grievances.reassign"]}
              >
                <SuperAdminModule />
              </PermissionRoute>
            }
          />
          <Route
            path="/monitoring/:view"
            element={
              <PermissionRoute
                permission={[
                  "grievances.view_all",
                  "grievances.view_department",
                ]}
              >
                <SuperAdminModule />
              </PermissionRoute>
            }
          />
          <Route
            path="/super-admin/settings/general"
            element={
              <RoleRoute allowedRoles={["super-admin", "admin"]}>
                <PermissionRoute permission={["settings.general.view", "settings.view"]}>
                  <WebsiteSettings />
                </PermissionRoute>
              </RoleRoute>
            }
          />
          <Route path="/system-settings/general" element={<Navigate to="/super-admin/settings/general" replace />} />
          <Route
            path="/super-admin/settings/ticket-number-format"
            element={
              <RoleRoute allowedRoles={["super-admin", "admin"]}>
                <PermissionRoute permission="settings.ticket_number.view">
                  <TicketNumberFormat />
                </PermissionRoute>
              </RoleRoute>
            }
          />
          <Route path="/system-settings/ticket-number-format" element={<Navigate to="/super-admin/settings/ticket-number-format" replace />} />
          <Route
            path="/system-settings/audit-logs"
            element={
              <SuperAdminRoute>
                <AuditLogs />
              </SuperAdminRoute>
            }
          />
          <Route
            path="/system-settings/:setting"
            element={
              <SuperAdminRoute>
                <RuntimeConfiguration />
              </SuperAdminRoute>
            }
          />
          {/* <Route
            path="/profile"
            element={<SuperAdminModule />}
          />
          <Route
            path="/profile/:section"
            element={<SuperAdminModule />}
          /> */}
          {/* <Route path="*" element={<Navigate to="/dashboard" replace />} /> */}
        </Route>
    </>
  ),
);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
