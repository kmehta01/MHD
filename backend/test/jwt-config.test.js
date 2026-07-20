const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { getJwtSecret } = require("../src/config/jwt");

test("requires a strong runtime JWT secret", () => {
  const originalJwtSecret = process.env.JWT_SECRET;

  try {
    delete process.env.JWT_SECRET;
    assert.throws(getJwtSecret, /at least 32 characters/);

    process.env.JWT_SECRET = "replace-with-a-long-random-secret";
    assert.throws(getJwtSecret, /non-placeholder/);

    const generatedSecret = crypto.randomBytes(48).toString("base64url");
    process.env.JWT_SECRET = generatedSecret;
    assert.equal(getJwtSecret(), generatedSecret);
  } finally {
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
  }
});
