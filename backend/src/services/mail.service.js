const nodemailer = require("nodemailer");

let transporter;

const parseBoolean = (value) => String(value).toLowerCase() === "true";

const getTransporter = () => {
  const requiredVariables = ["SMTP_HOST", "SMTP_PORT", "SMTP_FROM"];
  const missingVariables = requiredVariables.filter(
    (variable) => !process.env[variable],
  );

  if (missingVariables.length > 0) {
    const error = new Error(
      `Missing SMTP configuration: ${missingVariables.join(", ")}`,
    );
    error.code = "SMTP_CONFIGURATION_ERROR";
    throw error;
  }

  if (!transporter) {
    const auth =
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          }
        : undefined;

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: parseBoolean(process.env.SMTP_SECURE),
      auth,
    });
  }

  return transporter;
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const sendLoginOtp = async ({ email, name, otp, expiresInMinutes }) => {
  const safeName = escapeHtml(name);
  const transport = getTransporter();

  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Your MHD Belize administrator verification code",
    text: [
      `Hello ${name},`,
      "",
      `Your verification code is ${otp}.`,
      `It expires in ${expiresInMinutes} minutes and can be used only once.`,
      "",
      "If you did not attempt to sign in, contact ICT Support immediately.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#263442">
        <h2 style="color:#12355b">Administrator sign-in verification</h2>
        <p>Hello ${safeName},</p>
        <p>Use this code to finish signing in to the MHD Belize administration portal:</p>
        <p style="font-size:30px;font-weight:700;letter-spacing:8px;color:#12355b">${otp}</p>
        <p>This code expires in ${expiresInMinutes} minutes and can be used only once.</p>
        <p>If you did not attempt to sign in, contact ICT Support immediately.</p>
      </div>
    `,
  });
};

const sendEmail = async ({ to, subject, text, html = null }) => {
  if (!to) throw new TypeError("An email recipient is required");
  const transport = getTransporter();
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text,
    ...(html ? { html } : {}),
  });
};

const verifySmtpConnection = async () => {
  const transport = getTransporter();
  await transport.verify();
};

module.exports = {
  sendEmail,
  sendLoginOtp,
  verifySmtpConnection,
};
