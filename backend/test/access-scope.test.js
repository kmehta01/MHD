const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getAuditScope,
  getGrievanceScope,
} = require("../src/utils/access-scope");

test("Super Admin receives unrestricted grievance and audit scope", () => {
  const user = {
    id: 1,
    role_slug: "super-admin",
    permissions: [],
  };

  assert.deepEqual(getGrievanceScope(user), {
    type: "all",
    departmentId: null,
  });
  assert.deepEqual(getAuditScope(user), {
    type: "all",
    actorUserId: null,
  });
});

test("Admin receives all-grievance and limited-audit scope", () => {
  const user = {
    id: 2,
    role_slug: "admin",
    permissions: [
      "grievances.view_all",
      "audit_logs.view_limited",
    ],
  };

  assert.equal(getGrievanceScope(user).type, "all");
  assert.equal(getAuditScope(user).type, "limited");
});

test("Ministry User is restricted to assigned department and own audit logs", () => {
  const user = {
    id: 9,
    role_slug: "ministry-user",
    department_id: 4,
    permissions: [
      "grievances.view_department",
      "audit_logs.view_own",
    ],
  };

  assert.deepEqual(getGrievanceScope(user), {
    type: "department",
    departmentId: 4,
  });
  assert.deepEqual(getAuditScope(user), {
    type: "own",
    actorUserId: 9,
  });
});

test("Department grievance permission is denied without a department", () => {
  const scope = getGrievanceScope({
    id: 10,
    role_slug: "ministry-user",
    department_id: null,
    permissions: ["grievances.view_department"],
  });

  assert.equal(scope.type, "none");
});
