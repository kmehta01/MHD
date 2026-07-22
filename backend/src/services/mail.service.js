const nodemailer = require("nodemailer");
const SettingsPolicy = require("./settings-policy.service");

let transporter;

const parseBoolean = (value) => String(value).toLowerCase() === "true";
const clean = (value) => String(value || "").trim();

const getTransporter = () => {
  const requiredVariables = ["SMTP_HOST", "SMTP_PORT", "SMTP_FROM"];
  const missingVariables = requiredVariables.filter((variable) => !process.env[variable]);

  if (missingVariables.length > 0) {
    const error = new Error(`Missing SMTP configuration: ${missingVariables.join(", ")}`);
    error.code = "SMTP_CONFIGURATION_ERROR";
    throw error;
  }

  if (!transporter) {
    const auth = process.env.SMTP_USER && process.env.SMTP_PASSWORD
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
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

const escapeHtml = (value) => String(value || "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const resolveEmailIdentity = (settings = {}) => {
  const organization = settings.organization || {};
  const portal = settings.portal || {};
  const footer = settings.footer || {};
  const email = settings.email || {};
  const organizationName = clean(organization.organizationName);
  const organizationShortName = clean(organization.organizationShortName);
  const portalName = clean(organization.portalName || portal.portalName || portal.portalTitle);
  const subjectPrefix = clean(email.subjectPrefix) || organizationShortName || portalName;
  const supportEmail = clean(footer.supportEmail) || clean(organization.officialEmail);
  const replyToAddress = clean(email.replyToAddress) || supportEmail;
  const emailFooterText = clean(email.footerText) || [organizationName, portalName].filter(Boolean).join(" · ");
  return {
    organizationName,
    organizationShortName,
    portalName,
    supportEmail,
    replyToAddress,
    emailFooterText,
    subjectPrefix,
  };
};

const prefixSubject = (subject, prefix) => {
  const cleanSubject = clean(subject);
  const cleanPrefix = clean(prefix);
  if (!cleanPrefix || cleanSubject.startsWith(`[${cleanPrefix}]`)) return cleanSubject;
  return `[${cleanPrefix}] ${cleanSubject}`;
};

const applyEmailIdentity = ({ subject, text, html }, identity) => {
  const footerText = clean(identity.emailFooterText);
  return {
    subject: prefixSubject(subject, identity.subjectPrefix),
    text: footerText ? `${String(text || "").trimEnd()}\n\n--\n${footerText}` : String(text || ""),
    html: html && footerText
      ? `${html}<p style="margin-top:24px;padding-top:12px;border-top:1px solid #d9e1e8;color:#5b6773;font-size:13px">${escapeHtml(footerText)}</p>`
      : html,
  };
};

const sendLoginOtp = async ({ email, name, otp, expiresInMinutes, settings: suppliedSettings }) => {
  const settings = suppliedSettings || await SettingsPolicy.getPolicy();
  const identity = resolveEmailIdentity(settings);
  const safeName = escapeHtml(name);
  const safePortalName = escapeHtml(identity.portalName || "administration portal");
  const supportInstruction = identity.supportEmail
    ? `contact ${identity.supportEmail} immediately`
    : "contact your system administrator immediately";
  const content = applyEmailIdentity({
    subject: "Administrator verification code",
    text: [
      `Hello ${name},`,
      "",
      `Use this code to finish signing in to ${identity.portalName || "the administration portal"}: ${otp}`,
      `It expires in ${expiresInMinutes} minutes and can be used only once.`,
      "",
      `If you did not attempt to sign in, ${supportInstruction}.`,
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#263442">
        <h2 style="color:#12355b">Administrator sign-in verification</h2>
        <p>Hello ${safeName},</p>
        <p>Use this code to finish signing in to ${safePortalName}:</p>
        <p style="font-size:30px;font-weight:700;letter-spacing:8px;color:#12355b">${escapeHtml(otp)}</p>
        <p>This code expires in ${escapeHtml(expiresInMinutes)} minutes and can be used only once.</p>
        <p>If you did not attempt to sign in, ${escapeHtml(supportInstruction)}.</p>
      </div>
    `,
  }, identity);

  await getTransporter().sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    ...(identity.replyToAddress ? { replyTo: identity.replyToAddress } : {}),
    ...content,
  });
};

const sendEmail = async ({ to, subject, text, html = null, settings: suppliedSettings }) => {
  if (!to) throw new TypeError("An email recipient is required");
  const settings = suppliedSettings || await SettingsPolicy.getPolicy();
  const identity = resolveEmailIdentity(settings);
  const content = applyEmailIdentity({ subject, text, html }, identity);
  await getTransporter().sendMail({
    from: process.env.SMTP_FROM,
    to,
    ...(identity.replyToAddress ? { replyTo: identity.replyToAddress } : {}),
    ...content,
  });
};

const verifySmtpConnection = async () => getTransporter().verify();
const resetTransporterForTests = () => { transporter = undefined; };

module.exports = {
  applyEmailIdentity,
  escapeHtml,
  prefixSubject,
  resetTransporterForTests,
  resolveEmailIdentity,
  sendEmail,
  sendLoginOtp,
  verifySmtpConnection,
};
