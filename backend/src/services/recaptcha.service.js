const https = require("https");

const verifyRecaptcha = (token, remoteIp) =>
  new Promise((resolve, reject) => {
    if (process.env.NODE_ENV === "test" && token === "test-recaptcha-token") {
      resolve(true);
      return;
    }

    const secret = process.env.RECAPTCHA_SECRET_KEY;

    if (!secret) {
      const error = new Error("Google reCAPTCHA is not configured");
      error.code = "RECAPTCHA_CONFIGURATION_ERROR";
      reject(error);
      return;
    }

    const body = new URLSearchParams({
      secret,
      response: token || "",
      ...(remoteIp ? { remoteip: remoteIp } : {}),
    }).toString();

    const request = https.request(
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

        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          payload += chunk;
        });
        response.on("end", () => {
          try {
            const parsed = JSON.parse(payload);
            resolve(Boolean(parsed.success));
          } catch (error) {
            reject(error);
          }
        });
      },
    );

    request.on("timeout", () => {
      request.destroy(new Error("Google reCAPTCHA verification timed out"));
    });
    request.on("error", reject);
    request.write(body);
    request.end();
  });

module.exports = {
  verifyRecaptcha,
};
