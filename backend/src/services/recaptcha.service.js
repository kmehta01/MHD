const https = require("https");

const MAX_TOKEN_LENGTH = 4096;
const MAX_RESPONSE_BYTES = 64 * 1024;

const buildError = (message, code) => Object.assign(new Error(message), { code });

const verifyRecaptcha = (token, remoteIp, { request: requestTransport = https.request } = {}) =>
  new Promise((resolve, reject) => {
    if (process.env.NODE_ENV === "test" && token === "test-recaptcha-token") {
      resolve(true);
      return;
    }

    const normalizedToken = String(token || "").trim();
    if (!normalizedToken || normalizedToken.length > MAX_TOKEN_LENGTH) {
      resolve(false);
      return;
    }

    const secret = String(process.env.RECAPTCHA_SECRET_KEY || "").trim();

    if (!secret) {
      reject(buildError("Google reCAPTCHA is not configured", "RECAPTCHA_CONFIGURATION_ERROR"));
      return;
    }

    const body = new URLSearchParams({
      secret,
      response: normalizedToken,
      ...(remoteIp ? { remoteip: remoteIp } : {}),
    }).toString();

    const request = requestTransport(
      {
        hostname: "www.google.com",
        path: "/recaptcha/api/siteverify",
        method: "POST",
        timeout: 5000,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (response) => {
        let payload = "";

        if (response.statusCode < 200 || response.statusCode >= 300) {
          response.resume?.();
          reject(buildError("Google reCAPTCHA verification is unavailable", "RECAPTCHA_PROVIDER_ERROR"));
          return;
        }

        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          payload += chunk;
          if (Buffer.byteLength(payload) > MAX_RESPONSE_BYTES) {
            request.destroy(buildError("Google reCAPTCHA returned an oversized response", "RECAPTCHA_PROVIDER_ERROR"));
          }
        });
        response.on("end", () => {
          try {
            const parsed = JSON.parse(payload);
            resolve(Boolean(parsed.success));
          } catch {
            reject(buildError("Google reCAPTCHA returned an invalid response", "RECAPTCHA_PROVIDER_ERROR"));
          }
        });
      },
    );

    request.on("timeout", () => {
      request.destroy(buildError("Google reCAPTCHA verification timed out", "RECAPTCHA_TIMEOUT"));
    });
    request.on("error", reject);
    request.write(body);
    request.end();
  });

module.exports = {
  MAX_TOKEN_LENGTH,
  verifyRecaptcha,
};
