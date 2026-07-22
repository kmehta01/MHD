const test = require("node:test");
const assert = require("node:assert/strict");
const ComplaintModel = require("../src/models/complaint.model");
const { getNavigationCounts } = require("../src/controllers/complaint.controller");

const responseRecorder = () => {
  const result = { statusCode: 200, body: null };
  return {
    result,
    response: {
      status(code) { result.statusCode = code; return this; },
      json(body) { result.body = body; return body; },
    },
  };
};

test("navigation counts use the immutable new status key for all-department access", async (t) => {
  let query;
  t.mock.method(ComplaintModel, "countByStatusKey", async (input) => { query = input; return 7; });
  const { result, response } = responseRecorder();

  await getNavigationCounts({ user: { role_slug: "super-admin" } }, response);

  assert.deepEqual(query, { statusKey: "new", scope: { type: "all", departmentId: null } });
  assert.equal(result.body.data.newGrievances, 7);
  assert.equal(result.body.meta.scope, "all");
  assert.match(result.body.meta.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test("navigation counts are restricted to the user's assigned department", async (t) => {
  let query;
  t.mock.method(ComplaintModel, "countByStatusKey", async (input) => { query = input; return 3; });
  const { result, response } = responseRecorder();

  await getNavigationCounts({ user: {
    role_slug: "ministry-user",
    department_id: 14,
    permissions: ["grievances.view_department"],
  } }, response);

  assert.deepEqual(query, { statusKey: "new", scope: { type: "department", departmentId: 14 } });
  assert.equal(result.body.data.newGrievances, 3);
  assert.equal(result.body.meta.scope, "department");
});

test("navigation counts reject a department-scoped user without a department", async (t) => {
  const count = t.mock.method(ComplaintModel, "countByStatusKey", async () => 99);
  const { result, response } = responseRecorder();

  await getNavigationCounts({ user: {
    role_slug: "ministry-user",
    permissions: ["grievances.view_department"],
  } }, response);

  assert.equal(result.statusCode, 403);
  assert.equal(count.mock.callCount(), 0);
});
