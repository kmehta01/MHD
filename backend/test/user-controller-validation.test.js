const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createUser,
  updateUserPassword,
} = require("../src/controllers/user.controller");

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

test("rejects a non-string password when creating a user", async () => {
  const response = buildResponse();

  await createUser(
    {
      body: {
        role_id: 2,
        name: "Administrator",
        email: "administrator@example.gov.bz",
        password: { length: 100 },
      },
    },
    response,
  );

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.status, false);
});

test("rejects a non-string password when updating a user", async () => {
  const response = buildResponse();

  await updateUserPassword(
    {
      body: { password: ["not", "a", "password"] },
      params: { id: "7" },
    },
    response,
  );

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.status, false);
});
