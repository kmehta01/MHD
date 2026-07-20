const hasPermission = (user, permission) =>
  user?.role_slug === "super-admin" ||
  (user?.permissions || []).includes(permission);

const getGrievanceScope = (user) => {
  if (
    user?.role_slug === "super-admin" ||
    hasPermission(user, "grievances.view_all")
  ) {
    return { type: "all", departmentId: null };
  }

  if (
    hasPermission(user, "grievances.view_department") &&
    Number.isInteger(Number(user?.department_id)) &&
    Number(user.department_id) > 0
  ) {
    return {
      type: "department",
      departmentId: Number(user.department_id),
    };
  }

  return { type: "none", departmentId: null };
};

const getAuditScope = (user) => {
  if (
    user?.role_slug === "super-admin" ||
    hasPermission(user, "audit_logs.view_all")
  ) {
    return { type: "all", actorUserId: null };
  }

  if (hasPermission(user, "audit_logs.view_limited")) {
    return { type: "limited", actorUserId: null };
  }

  if (hasPermission(user, "audit_logs.view_own")) {
    return { type: "own", actorUserId: Number(user.id) };
  }

  return { type: "none", actorUserId: null };
};

module.exports = {
  getAuditScope,
  getGrievanceScope,
  hasPermission,
};
