const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const test = require("node:test");
const { MAX_TOKEN_LENGTH, verifyRecaptcha } = require("../src/services/recaptcha.service");

const withSecret = async (value, callback) => {
  const previous = process.env.RECAPTCHA_SECRET_KEY;
  process.env.RECAPTCHA_SECRET_KEY = value;
  try { return await callback(); }
  finally {
    if (previous === undefined) delete process.env.RECAPTCHA_SECRET_KEY;
    else process.env.RECAPTCHA_SECRET_KEY = previous;
  }
};

const transportFor = ({ payload = { success: true }, statusCode = 200, timeout = false } = {}) => {
  const captured = {};
  const request = (options, callback) => {
    captured.options = options;
    const outgoing = new EventEmitter();
    outgoing.write = (body) => { captured.body = body; };
    outgoing.destroy = (error) => queueMicrotask(() => outgoing.emit("error", error));
    outgoing.end = () => queueMicrotask(() => {
      if (timeout) {
        outgoing.emit("timeout");
        return;
      }
      const response = new EventEmitter();
      response.statusCode = statusCode;
      response.setEncoding = () => {};
      response.resume = () => {};
      callback(response);
      if (statusCode >= 200 && statusCode < 300) {
        response.emit("data", JSON.stringify(payload));
        response.emit("end");
      }
    });
    return outgoing;
  };
  return { captured, request };
};

test("reCAPTCHA rejects missing and oversized tokens without contacting Google", async () => {
  await withSecret("secret", async () => {
    assert.equal(await verifyRecaptcha(""), false);
    assert.equal(await verifyRecaptcha("x".repeat(MAX_TOKEN_LENGTH + 1)), false);
  });
});

test("reCAPTCHA sends the token, secret, and requester IP to Google", async () => {
  const transport = transportFor();
  await withSecret("server-secret", async () => {
    assert.equal(await verifyRecaptcha("citizen-token", "203.0.113.8", transport), true);
  });
  const body = new URLSearchParams(transport.captured.body);
  assert.equal(body.get("secret"), "server-secret");
  assert.equal(body.get("response"), "citizen-token");
  assert.equal(body.get("remoteip"), "203.0.113.8");
  assert.equal(transport.captured.options.path, "/recaptcha/api/siteverify");
});

test("reCAPTCHA rejects invalid or reused tokens reported by Google", async () => {
  const transport = transportFor({ payload: { success: false, "error-codes": ["timeout-or-duplicate"] } });
  await withSecret("secret", async () => {
    assert.equal(await verifyRecaptcha("expired-or-reused", null, transport), false);
  });
});

test("reCAPTCHA distinguishes missing configuration and provider outages", async () => {
  await withSecret("", async () => {
    await assert.rejects(verifyRecaptcha("token"), { code: "RECAPTCHA_CONFIGURATION_ERROR" });
  });
  await withSecret("secret", async () => {
    await assert.rejects(verifyRecaptcha("token", null, transportFor({ statusCode: 503 })), { code: "RECAPTCHA_PROVIDER_ERROR" });
    await assert.rejects(verifyRecaptcha("token", null, transportFor({ timeout: true })), { code: "RECAPTCHA_TIMEOUT" });
  });
});
