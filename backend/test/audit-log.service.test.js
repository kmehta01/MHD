const test = require("node:test");
const assert = require("node:assert/strict");
const { recordAuditEvent } = require("../src/services/audit-log.service");

const makeExecutor = () => {
  const inserts = [];
  return {
    inserts,
    async query(sql, values) {
      if (sql.includes("FROM admin_users")) {
        return [[{ id: 7, name: "Audit Tester", role_slug: "content-manager" }]];
      }
      if (sql.includes("INSERT INTO admin_audit_logs")) {
        inserts.push(values);
        return [{ insertId: 99 }];
      }
      throw new Error("Unexpected query");
    },
  };
};

test("creates an allowlisted ID-only admin mutation event", async () => {
  const executor = makeExecutor();
  const req = {
    user: { id: 7 },
    ip: "::ffff:192.0.2.10",
    get: () => "AuditBrowser/1.0",
  };

  await recordAuditEvent(
    req,
    {
      eventType: "ADMIN_USER_UPDATED",
      resourceType: "admin_user",
      resourceId: 42,
    },
    executor,
  );

  assert.equal(executor.inserts.length, 1);
  assert.deepEqual(executor.inserts[0], [
    7,
    "Audit Tester",
    "content-manager",
    "ADMIN_USER_UPDATED",
    "update",
    "admin_user",
    "42",
    "Updated admin user ID 42",
    1,
    "192.0.2.10",
    "AuditBrowser/1.0",
  ]);
});

test("rejects non-allowlisted event types before inserting", async () => {
  const executor = makeExecutor();
  await assert.rejects(
    recordAuditEvent(
      { user: { id: 7 }, ip: "127.0.0.1", get: () => "test" },
      { eventType: "USER_SUPPLIED_MESSAGE", resourceId: 42 },
      executor,
    ),
    /Unsupported audit event type/,
  );
  assert.equal(executor.inserts.length, 0);
});

test("does not include unknown-account email details in failed login messages", async () => {
  const executor = makeExecutor();
  await recordAuditEvent(
    { user: null, ip: "127.0.0.1", get: () => "test" },
    { actorUserId: null, eventType: "PASSWORD_LOGIN_FAILED", success: false },
    executor,
  );

  const inserted = executor.inserts[0];
  assert.equal(inserted[7], "Failed password sign-in");
  assert.equal(inserted[8], 0);
  assert.equal(inserted.join(" ").includes("@"), false);
});
