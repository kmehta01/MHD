import { useEffect, useState } from "react";
import Icon from "../components/Icon";
import API from "../services/api";
import { hasPermission } from "../utils/permissions";

const SYSTEM_ROLE_SLUGS = new Set([
  "super-admin",
  "admin",
  "ministry-user",
]);

const moduleLabels = {
  applications: "Applications",
  audit_logs: "Audit Logs",
  contact_offices: "Contact Enquiries",
  dashboard: "Dashboard",
  dashboard_cards: "Dashboard Overview Cards",
  dashboard_charts: "Dashboard Charts",
  departments: "Departments",
  grievances: "Grievances",
  reports: "Reports",
  roles: "Roles & Permissions",
  settings: "System Settings",
  users: "User Management",
};

const formatPermissionName = (permission) =>
  permission.description ||
  permission.action
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const RolesPermissions = () => {
  const canCreate = hasPermission("roles.create");
  const canUpdate = hasPermission("roles.update");
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState(
    new Set(),
  );
  const [roleName, setRoleName] = useState("");
  const [roleActive, setRoleActive] = useState(true);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedRole = roles.find(
    (role) => Number(role.id) === Number(selectedRoleId),
  );
  const isSuperAdminRole = selectedRole?.slug === "super-admin";
  const isSystemRole = SYSTEM_ROLE_SLUGS.has(selectedRole?.slug);
  const canEditPermissions = canUpdate && !isSuperAdminRole;
  const canEditDetails = canUpdate && !isSystemRole;

  const permissionGroups = permissions.reduce((groups, permission) => {
    const moduleName = permission.module || "other";
    if (!groups[moduleName]) groups[moduleName] = [];
    groups[moduleName].push(permission);
    return groups;
  }, {});

  const loadRolePermissions = async (role) => {
    if (!role) return;

    setSelectedRoleId(role.id);
    setCreating(false);
    setRoleName(role.name);
    setRoleActive(Boolean(role.is_active));
    setLoadingPermissions(true);
    setError("");

    try {
      const response = await API.get(`/roles/${role.id}/permissions`);
      setSelectedPermissionIds(
        new Set(
          (response.data.data || []).map((permission) =>
            Number(permission.id),
          ),
        ),
      );
    } catch (requestError) {
      setSelectedPermissionIds(new Set());
      setError(
        requestError.response?.data?.message ||
          "Failed to load role permissions",
      );
    } finally {
      setLoadingPermissions(false);
    }
  };

  const loadRoles = async (preferredRoleId = null) => {
    const response = await API.get("/roles");
    const nextRoles = response.data.data || [];
    setRoles(nextRoles);

    const preferredRole =
      nextRoles.find(
        (role) => Number(role.id) === Number(preferredRoleId),
      ) || nextRoles[0];

    if (preferredRole) {
      await loadRolePermissions(preferredRole);
    }
  };

  useEffect(() => {
    let active = true;

    const loadPage = async () => {
      try {
        const [rolesResponse, permissionsResponse] = await Promise.all([
          API.get("/roles"),
          API.get("/roles/permissions"),
        ]);

        if (!active) return;

        const nextRoles = rolesResponse.data.data || [];
        setRoles(nextRoles);
        setPermissions(permissionsResponse.data.data || []);

        if (nextRoles[0]) {
          await loadRolePermissions(nextRoles[0]);
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError.response?.data?.message ||
              "Failed to load roles and permissions",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPage();

    return () => {
      active = false;
    };
  }, []);

  const beginCreate = () => {
    setCreating(true);
    setSelectedRoleId(null);
    setSelectedPermissionIds(new Set());
    setRoleName("");
    setRoleActive(true);
    setError("");
    setMessage("");
  };

  const togglePermission = (permissionId) => {
    if (!(creating ? canCreate : canEditPermissions)) return;

    setSelectedPermissionIds((current) => {
      const next = new Set(current);

      if (next.has(permissionId)) {
        next.delete(permissionId);
      } else {
        next.add(permissionId);
      }

      return next;
    });
  };

  const toggleModule = (modulePermissions) => {
    if (!(creating ? canCreate : canEditPermissions)) return;

    setSelectedPermissionIds((current) => {
      const next = new Set(current);
      const allSelected = modulePermissions.every((permission) =>
        next.has(Number(permission.id)),
      );

      modulePermissions.forEach((permission) => {
        const permissionId = Number(permission.id);
        if (allSelected) {
          next.delete(permissionId);
        } else {
          next.add(permissionId);
        }
      });

      return next;
    });
  };

  const saveRole = async () => {
    const trimmedName = roleName.trim();

    if (trimmedName.length < 2) {
      setError("Enter a role name with at least 2 characters.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (creating) {
        const response = await API.post("/roles", {
          name: trimmedName,
          is_active: roleActive,
          permission_ids: [...selectedPermissionIds],
        });

        setMessage(response.data.message);
        setCreating(false);
        await loadRoles(response.data.data.id);
      } else if (selectedRole) {
        if (canEditDetails) {
          await API.put(`/roles/${selectedRole.id}`, {
            name: trimmedName,
            is_active: roleActive,
          });
        }

        if (canEditPermissions) {
          await API.put(`/roles/${selectedRole.id}/permissions`, {
            permission_ids: [...selectedPermissionIds],
          });
        }

        setMessage(
          isSuperAdminRole
            ? "Super Admin always has full access."
            : "Role and permissions updated successfully.",
        );
        await loadRoles(selectedRole.id);
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Failed to save role",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="roles-page">
        <div className="roles-loading panel">Loading roles and permissions...</div>
      </div>
    );
  }

  return (
    <div className="roles-page">
      <div className="module-page-header">
        <div>
          <div className="module-breadcrumb">
            <span>User Management</span>
            <Icon name="chevronRight" size={13} />
            <strong>Roles & Permissions</strong>
          </div>
          <h1>Roles & Permissions</h1>
          <p>
            Create roles and control exactly which modules and actions each
            role can access.
          </p>
        </div>

        {canCreate ? (
          <button
            className="button button-primary"
            onClick={beginCreate}
            type="button"
          >
            <Icon name="plus" size={17} /> Create Role
          </button>
        ) : null}
      </div>

      {message ? <div className="roles-message success">{message}</div> : null}
      {error ? <div className="roles-message error">{error}</div> : null}

      <div className="roles-layout">
        <aside className="panel roles-list-panel">
          <div className="roles-panel-heading">
            <div>
              <span className="eyebrow">Available roles</span>
              <h2>{roles.length} Roles</h2>
            </div>
          </div>

          <div className="roles-list">
            {roles.map((role) => (
              <button
                className={`role-list-item ${
                  Number(role.id) === Number(selectedRoleId) && !creating
                    ? "active"
                    : ""
                }`}
                key={role.id}
                onClick={() => {
                  setMessage("");
                  loadRolePermissions(role);
                }}
                type="button"
              >
                <span className="role-list-icon">
                  <Icon name="roles" size={18} />
                </span>
                <span className="role-list-copy">
                  <strong>{role.name}</strong>
                  <small>
                    {Number(role.permission_count || 0)} permissions ·{" "}
                    {Number(role.user_count || 0)} users
                  </small>
                </span>
                <span
                  className={`role-status ${
                    role.is_active ? "active" : "inactive"
                  }`}
                >
                  {role.is_active ? "Active" : "Inactive"}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="panel role-editor-panel">
          <div className="role-editor-header">
            <div>
              <span className="eyebrow">
                {creating ? "New role" : "Selected role"}
              </span>
              <h2>{creating ? "Create a Custom Role" : selectedRole?.name}</h2>
              <p>
                {isSuperAdminRole
                  ? "Super Admin is protected and always receives every permission."
                  : "Dashboard widget changes apply on refresh. Navigation changes apply after the user signs in again."}
              </p>
            </div>

            {creating ? (
              <button
                className="button button-secondary"
                onClick={() => roles[0] && loadRolePermissions(roles[0])}
                type="button"
              >
                Cancel
              </button>
            ) : null}
          </div>

          <div className="role-details-grid">
            <label>
              <span>Role name</span>
              <input
                disabled={!creating && !canEditDetails}
                maxLength="100"
                onChange={(event) => setRoleName(event.target.value)}
                placeholder="Example: Grievance Reviewer"
                type="text"
                value={roleName}
              />
            </label>

            <label>
              <span>Status</span>
              <select
                disabled={!creating && !canEditDetails}
                onChange={(event) =>
                  setRoleActive(event.target.value === "active")
                }
                value={roleActive ? "active" : "inactive"}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>

          <div className="permissions-heading">
            <div>
              <h3>Permission access</h3>
              <p>
                {selectedPermissionIds.size} of {permissions.length} selected
              </p>
            </div>
          </div>

          {loadingPermissions ? (
            <div className="roles-loading">Loading permissions...</div>
          ) : (
            <div className="permission-groups">
              {Object.entries(permissionGroups).map(
                ([moduleName, modulePermissions]) => {
                  const allSelected = modulePermissions.every((permission) =>
                    selectedPermissionIds.has(Number(permission.id)),
                  );
                  const editable = creating
                    ? canCreate
                    : canEditPermissions;

                  return (
                    <section className="permission-group" key={moduleName}>
                      <div className="permission-group-header">
                        <div>
                          <h4>{moduleLabels[moduleName] || moduleName}</h4>
                          <span>{modulePermissions.length} permissions</span>
                        </div>
                        <button
                          disabled={!editable}
                          onClick={() => toggleModule(modulePermissions)}
                          type="button"
                        >
                          {allSelected ? "Clear module" : "Select module"}
                        </button>
                      </div>

                      <div className="permission-options">
                        {modulePermissions.map((permission) => {
                          const permissionId = Number(permission.id);

                          return (
                            <label
                              className={`permission-option ${
                                selectedPermissionIds.has(permissionId)
                                  ? "selected"
                                  : ""
                              }`}
                              key={permission.id}
                            >
                              <input
                                checked={selectedPermissionIds.has(
                                  permissionId,
                                )}
                                disabled={!editable}
                                onChange={() =>
                                  togglePermission(permissionId)
                                }
                                type="checkbox"
                              />
                              <span>
                                <strong>
                                  {formatPermissionName(permission)}
                                </strong>
                                <small>{permission.permission_key}</small>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </section>
                  );
                },
              )}
            </div>
          )}

          {(creating && canCreate) ||
          canEditDetails ||
          canEditPermissions ? (
            <div className="role-editor-actions">
              <div>
                <Icon name="shieldCheck" size={16} />
                Dashboard widgets update on refresh; other navigation access
                updates after affected users sign in again.
              </div>
              <button
                className="button button-primary"
                disabled={saving || loadingPermissions}
                onClick={saveRole}
                type="button"
              >
                {saving
                  ? "Saving..."
                  : creating
                    ? "Create Role"
                    : "Save Changes"}
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
};

export default RolesPermissions;
