import { useEffect, useState } from "react";
import API from "../services/api";
import { hasPermission } from "../utils/permissions";

const emptyFormData = {
  role_id: "",
  department_id: "",
  name: "",
  email: "",
  phone: "",
  password: "",
  status: "active",
};

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [recoveryReset, setRecoveryReset] = useState(null);
  const [resettingUserId, setResettingUserId] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const currentAdmin = JSON.parse(
    localStorage.getItem("admin_user") || "null",
  );

  const canCreateUsers = hasPermission("users.create");
  const canUpdateUsers = hasPermission("users.update");
  const canDeleteUsers = hasPermission("users.delete");
  const canResetRecoveryCodes = currentAdmin?.role_slug === "super-admin";
  const hasRowActions =
    canUpdateUsers || canDeleteUsers || canResetRecoveryCodes;

  const [formData, setFormData] = useState(emptyFormData);
  const selectedRole = roles.find(
    (role) => String(role.id) === String(formData.role_id),
  );
  const departmentRequired = Boolean(selectedRole?.requires_department);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const getUsers = async () => {
    try {
      const response = await API.get("/users");
      if (response.data.status) {
        setUsers(response.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch users");
    }
  };

  useEffect(() => {
    let active = true;

    const loadPageData = async () => {
      try {
        const [usersResponse, rolesResponse, departmentsResponse] =
          await Promise.all([
            API.get("/users"),
            API.get("/roles/assignable"),
            API.get("/departments"),
          ]);

        if (!active) return;

        if (usersResponse.data.status) {
          setUsers(usersResponse.data.data);
        }

        if (rolesResponse.data.status) {
          setRoles(rolesResponse.data.data);
        }

        if (departmentsResponse.data.status) {
          setDepartments(departmentsResponse.data.data);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message || "Failed to load user management",
          );
        }
      }
    };

    loadPageData();

    return () => {
      active = false;
    };
  }, []);

  const resetForm = () => {
    setEditingUser(null);
    setFormData(emptyFormData);
  };

  const handleChange = (e) => {
    setFormData((currentData) => ({
      ...currentData,
      [e.target.name]: e.target.value,
    }));

    setError("");
    setMessage("");
  };

  const startEdit = (user) => {
    setEditingUser(user);
    setFormData({
      role_id: user.role_id ? String(user.role_id) : "",
      department_id: user.department_id ? String(user.department_id) : "",
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      password: "",
      status: user.status || "active",
    });
    setError("");
    setMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (editingUser) {
        const response = await API.put(`/users/${editingUser.id}`, {
          role_id: formData.role_id,
          department_id: formData.department_id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          status: formData.status,
        });

        if (formData.password.trim()) {
          await API.put(`/users/${editingUser.id}/password`, {
            password: formData.password,
          });
        }

        setMessage(
          formData.password.trim()
            ? "User and password updated successfully"
            : response.data.message,
        );
      } else {
        const response = await API.post("/users", formData);
        setMessage(response.data.message);
      }

      resetForm();
      getUsers();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (editingUser ? "Failed to update user" : "Failed to create user"),
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (user) => {
    if (Number(user.id) === Number(currentAdmin?.id)) {
      setError("You cannot delete the account you are currently using.");
      return;
    }

    const confirmed = window.confirm(
      `Delete ${user.name}? This action cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      setDeletingUserId(user.id);
      setError("");
      setMessage("");

      const response = await API.delete(`/users/${user.id}`);

      if (editingUser?.id === user.id) {
        resetForm();
      }

      setMessage(response.data.message);
      getUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete user");
    } finally {
      setDeletingUserId(null);
    }
  };

  const resetRecoveryCodes = async (user) => {
    const confirmed = window.confirm(
      `Regenerate recovery codes for ${user.name}? Their existing recovery codes will stop working immediately.`,
    );

    if (!confirmed) return;

    try {
      setResettingUserId(user.id);
      setError("");
      setMessage("");

      const response = await API.post(
        `/users/${user.id}/2fa/recovery-codes/reset`,
      );

      setRecoveryReset(response.data.data);
      setMessage(response.data.message);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to reset recovery codes",
      );
    } finally {
      setResettingUserId(null);
    }
  };

  const copyRecoveryCodes = async () => {
    await navigator.clipboard.writeText(
      recoveryReset.recovery_codes.join("\n"),
    );
    setMessage("Recovery codes copied to the clipboard");
  };

  const formIsVisible = canCreateUsers || editingUser;

  return (
    <div>
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>Manage Users</h1>
          <p style={styles.subtitle}>
            Create and manage admin users with role-based access.
          </p>
        </div>
      </div>

      {message && <div style={styles.success}>{message}</div>}
      {error && <div style={styles.error}>{error}</div>}

      <div style={formIsVisible ? styles.grid : styles.singleColumnGrid}>
        {formIsVisible ? (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>
                {editingUser ? "Edit User" : "Add New User"}
              </h2>
              {editingUser ? (
                <button
                  type="button"
                  onClick={resetForm}
                  style={styles.cancelTopButton}
                >
                  Cancel
                </button>
              ) : null}
            </div>

            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label>Role</label>
                <select
                  name="role_id"
                  value={formData.role_id}
                  onChange={handleChange}
                  style={styles.input}
                >
                  <option value="">Select Role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              {departmentRequired ? (
                <div style={styles.formGroup}>
                  <label>Department</label>
                  <select
                    name="department_id"
                    value={formData.department_id}
                    onChange={handleChange}
                    style={styles.input}
                  >
                    <option value="">Select Department</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div style={styles.formGroup}>
                <label>Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  placeholder="Enter email"
                  value={formData.email}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label>Phone</label>
                <input
                  type="text"
                  name="phone"
                  placeholder="Enter phone"
                  value={formData.phone}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  placeholder={
                    editingUser
                      ? "Leave blank to keep current password"
                      : "Minimum 8 characters"
                  }
                  value={formData.password}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label>Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  style={styles.input}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <button type="submit" disabled={saving} style={styles.button}>
                {saving
                  ? "Saving..."
                  : editingUser
                    ? "Update User"
                    : "Create User"}
              </button>
            </form>
          </div>
        ) : null}

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Users List</h2>

          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}>Department</th>
                  <th style={styles.th}>Status</th>
                  {hasRowActions ? <th style={styles.th}>Actions</th> : null}
                </tr>
              </thead>

              <tbody>
                {users.map((user) => {
                  const isProtectedUser = Number(user.id) === 1;
                  const isCurrentUser =
                    Number(user.id) === Number(currentAdmin?.id);

                  return (
                    <tr key={user.id}>
                      <td style={styles.td}>{user.name}</td>
                      <td style={styles.td}>{user.email}</td>
                      <td style={styles.td}>{user.role_name}</td>
                      <td style={styles.td}>
                        {user.department_name || "All departments"}
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.badge,
                            background:
                              user.status === "active" ? "#E7F7EF" : "#FDECEC",
                            color:
                              user.status === "active" ? "#198754" : "#DC3545",
                          }}
                        >
                          {user.status}
                        </span>
                      </td>
                      {hasRowActions ? (
                        <td style={styles.td}>
                          <div style={styles.rowActions}>
                            {canUpdateUsers ? (
                              <button
                                disabled={isProtectedUser}
                                onClick={() => startEdit(user)}
                                style={{
                                  ...styles.smallButton,
                                  ...(isProtectedUser
                                    ? styles.disabledButton
                                    : {}),
                                }}
                                type="button"
                              >
                                Edit
                              </button>
                            ) : null}

                            {canDeleteUsers ? (
                              <button
                                disabled={
                                  isProtectedUser ||
                                  isCurrentUser ||
                                  deletingUserId === user.id
                                }
                                onClick={() => deleteUser(user)}
                                style={{
                                  ...styles.dangerButton,
                                  ...(isProtectedUser ||
                                  isCurrentUser ||
                                  deletingUserId === user.id
                                    ? styles.disabledButton
                                    : {}),
                                }}
                                type="button"
                              >
                                {deletingUserId === user.id
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>
                            ) : null}

                            {canResetRecoveryCodes ? (
                              Number(user.id) !== Number(currentAdmin.id) ? (
                                <button
                                  disabled={resettingUserId === user.id}
                                  onClick={() => resetRecoveryCodes(user)}
                                  style={styles.securityButton}
                                  type="button"
                                >
                                  {resettingUserId === user.id
                                    ? "Resetting..."
                                    : "Reset recovery codes"}
                                </button>
                              ) : (
                                <span style={styles.currentUserLabel}>
                                  Current account
                                </span>
                              )
                            ) : null}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}

                {users.length === 0 && (
                  <tr>
                    <td
                      style={styles.td}
                      colSpan={hasRowActions ? "6" : "5"}
                    >
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {recoveryReset ? (
        <div
          role="presentation"
          style={styles.modalBackdrop}
          onMouseDown={() => setRecoveryReset(null)}
        >
          <section
            aria-modal="true"
            role="dialog"
            style={styles.recoveryModal}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 style={styles.cardTitle}>New recovery codes</h2>
            <p style={styles.modalCopy}>
              Give these codes securely to {recoveryReset.user.name}. They are
              displayed only in this dialog, and all previous codes are now
              invalid.
            </p>
            <div style={styles.codeGrid}>
              {recoveryReset.recovery_codes.map((code) => (
                <code key={code} style={styles.code}>
                  {code}
                </code>
              ))}
            </div>
            <div style={styles.modalActions}>
              <button
                onClick={copyRecoveryCodes}
                style={styles.secondaryButton}
                type="button"
              >
                Copy all codes
              </button>
              <button
                onClick={() => setRecoveryReset(null)}
                style={styles.button}
                type="button"
              >
                I have stored them securely
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
};

const styles = {
  pageHeader: {
    marginBottom: "20px",
  },
  title: {
    margin: 0,
    color: "var(--navy)",
  },
  subtitle: {
    margin: "6px 0 0",
    color: "#6B7280",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "380px 1fr",
    gap: "24px",
    alignItems: "start",
  },
  singleColumnGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "24px",
  },
  card: {
    background: "#fff",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "12px",
  },
  cardTitle: {
    marginTop: 0,
    marginBottom: 0,
    color: "var(--navy)",
    fontSize: "20px",
  },
  formGroup: {
    marginBottom: "16px",
  },
  input: {
    width: "100%",
    padding: "12px",
    marginTop: "6px",
    borderRadius: "10px",
    border: "1px solid #D1D5DB",
    fontSize: "14px",
  },
  button: {
    width: "100%",
    padding: "12px",
    border: "none",
    borderRadius: "10px",
    background: "linear-gradient(135deg, var(--navy), var(--blue-600))",
    color: "#fff",
    fontWeight: "600",
    cursor: "pointer",
  },
  success: {
    background: "#E7F7EF",
    color: "#198754",
    padding: "12px",
    borderRadius: "10px",
    marginBottom: "16px",
  },
  error: {
    background: "#FDECEC",
    color: "#DC3545",
    padding: "12px",
    borderRadius: "10px",
    marginBottom: "16px",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "12px",
    background: "#F4F7FB",
    color: "#374151",
    fontSize: "13px",
  },
  td: {
    padding: "12px",
    borderBottom: "1px solid #E5E7EB",
    fontSize: "14px",
    verticalAlign: "top",
  },
  badge: {
    padding: "5px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "600",
    textTransform: "capitalize",
  },
  rowActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    alignItems: "center",
  },
  smallButton: {
    padding: "7px 10px",
    border: "1px solid #BFD0E3",
    borderRadius: "8px",
    color: "var(--navy)",
    background: "#FFFFFF",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  dangerButton: {
    padding: "7px 10px",
    border: "1px solid #F3B3B3",
    borderRadius: "8px",
    color: "#B42318",
    background: "#FFF5F5",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  disabledButton: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
  cancelTopButton: {
    padding: "7px 10px",
    border: "1px solid #C9D5E2",
    borderRadius: "8px",
    color: "var(--navy)",
    background: "#F7FAFC",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  securityButton: {
    padding: "7px 10px",
    border: "1px solid #C9D5E2",
    borderRadius: "8px",
    color: "var(--navy)",
    background: "#F7FAFC",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  currentUserLabel: {
    color: "#6B7280",
    fontSize: "12px",
  },
  modalBackdrop: {
    position: "fixed",
    zIndex: 1000,
    inset: 0,
    display: "grid",
    placeItems: "center",
    padding: "24px",
    background: "rgba(8, 37, 65, 0.65)",
  },
  recoveryModal: {
    width: "min(100%, 560px)",
    padding: "28px",
    borderRadius: "16px",
    background: "#FFFFFF",
    boxShadow: "0 24px 70px rgba(8, 37, 65, 0.25)",
  },
  modalCopy: {
    color: "#5D6875",
    fontSize: "14px",
    lineHeight: 1.6,
  },
  codeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "10px",
    margin: "20px 0",
  },
  code: {
    padding: "10px",
    border: "1px solid #DCE3EA",
    borderRadius: "8px",
    color: "var(--navy)",
    background: "#F7FAFC",
    textAlign: "center",
    fontWeight: "700",
    letterSpacing: "0.6px",
  },
  modalActions: {
    display: "flex",
    gap: "12px",
  },
  secondaryButton: {
    width: "100%",
    padding: "12px",
    border: "1px solid #C9D5E2",
    borderRadius: "10px",
    color: "var(--navy)",
    background: "#FFFFFF",
    fontWeight: "600",
    cursor: "pointer",
  },
};

export default ManageUsers;
