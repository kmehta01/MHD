export const getAdminUser = () => {
  try {
    const user = localStorage.getItem("admin_user");
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

export const hasPermission = (permissionKey) => {
  const user = getAdminUser();

  if (!user) return false;

  // Super Admin has full access
  if (user.role_slug === "super-admin") return true;

  if (!permissionKey) return true;

  return user.permissions?.includes(permissionKey);
};

export const hasAnyPermission = (permissionKeys) => {
  const keys = Array.isArray(permissionKeys) ? permissionKeys : [permissionKeys];

  return keys.some((permissionKey) => hasPermission(permissionKey));
};

export const isSuperAdmin = () => getAdminUser()?.role_slug === "super-admin";

export const isAdmin = () => {
  const user = getAdminUser();
  const roleSlug = String(user?.role_slug || "").toLowerCase();

  if (roleSlug === "super-admin") return false;

  return roleSlug === "admin";
};

export const hasRole = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return roles.some((role) => {
    if (role === "super-admin") return isSuperAdmin();
    if (role === "admin") return isAdmin();
    return getAdminUser()?.role_slug === role;
  });
};

export const isMinistryUser = () =>
  getAdminUser()?.role_slug === "ministry-user";
