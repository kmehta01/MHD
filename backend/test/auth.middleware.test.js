const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const AuthModel = require("../src/models/auth.model");
const SettingsPolicy = require("../src/services/settings-policy.service");
const { generalSettingsDefaults } = require("../src/utils/default-general-settings");
const { verifyToken } = require("../src/middlewares/auth.middleware");

const buildResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test("protected requests use current database permissions instead of stale token permissions", async () => {
  const originalFindUser = AuthModel.findSessionUserById;
  const originalFindPermissions = AuthModel.getActivePermissionsByRoleId;
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalGetPolicy = SettingsPolicy.getPolicy;
  const originalFindSession = AuthModel.findActiveAdminSession;
  const originalTouchSession = AuthModel.touchAdminSession;
  const secret = crypto.randomBytes(48).toString("base64url");
  process.env.JWT_SECRET = secret;

  AuthModel.findSessionUserById = async () => ({
    id: 17,
    name: "Current User",
    email: "current@example.gov.bz",
    status: "active",
    department_id: 3,
    department_name: "Human Services",
    role_id: 8,
    role_name: "Reviewer",
    role_slug: "reviewer",
    role_is_active: 1,
    password_changed_at: new Date(),
    must_change_password: 0,
  });
  AuthModel.getActivePermissionsByRoleId = async () => [
    { permission_key: "grievances.view_department" },
  ];
  SettingsPolicy.getPolicy = async () => generalSettingsDefaults;
  AuthModel.findActiveAdminSession = async () => ({
    last_activity_at: new Date(),
    expires_at: new Date(Date.now() + 3600000),
    revoked_at: null,
  });
  AuthModel.touchAdminSession = async () => {};

  const token = jwt.sign(
    {
      id: 17,
      permissions: ["roles.update"],
      two_factor_verified: true,
      jti: "test-session",
    },
    secret,
  );
  const req = {
    headers: { authorization: `Bearer ${token}` },
  };
  const res = buildResponse();
  let nextCalled = false;

  try {
    await verifyToken(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.deepEqual(req.user.permissions, [
      "grievances.view_department",
    ]);
    assert.equal(req.user.role_slug, "reviewer");
    assert.equal(req.user.department_id, 3);
  } finally {
    AuthModel.findSessionUserById = originalFindUser;
    AuthModel.getActivePermissionsByRoleId = originalFindPermissions;
    AuthModel.findActiveAdminSession = originalFindSession;
    AuthModel.touchAdminSession = originalTouchSession;
    SettingsPolicy.getPolicy = originalGetPolicy;
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
  }
});

test("protected requests reject inactive roles immediately", async () => {
  const originalFindUser = AuthModel.findSessionUserById;
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalGetPolicy = SettingsPolicy.getPolicy;
  const secret = crypto.randomBytes(48).toString("base64url");
  process.env.JWT_SECRET = secret;
  SettingsPolicy.getPolicy = async () => generalSettingsDefaults;

  AuthModel.findSessionUserById = async () => ({
    id: 18,
    status: "active",
    role_id: 9,
    role_slug: "disabled-role",
    role_is_active: 0,
  });

  const token = jwt.sign(
    { id: 18, two_factor_verified: true },
    secret,
  );
  const req = {
    headers: { authorization: `Bearer ${token}` },
  };
  const res = buildResponse();

  try {
    await verifyToken(req, res, () => {});

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.code, "SESSION_REVOKED");
  } finally {
    AuthModel.findSessionUserById = originalFindUser;
    SettingsPolicy.getPolicy = originalGetPolicy;
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
  }
});
