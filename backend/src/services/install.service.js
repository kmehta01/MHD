const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { ensureForeignKeys, readCompatibleMigration } = require("../utils/migration-sql");
const {
  generalSettingDefinitions,
} = require("../utils/default-general-settings");

const backendRoot = path.resolve(__dirname, "../..");
const projectRoot = path.resolve(backendRoot, "..");
const adminPanelRoot = path.join(projectRoot, "admin-panel");

const backendEnvPath = path.join(backendRoot, ".env");
const adminEnvPath = path.join(adminPanelRoot, ".env");
const lockPath = path.join(backendRoot, "install.lock");
const sqlPath = path.join(projectRoot, "database", "database.sql");
const installMigrationPaths = [
  path.join(projectRoot, "database", "migrations", "20260720_runtime_general_settings.sql"),
  path.join(projectRoot, "database", "migrations", "20260720_grievance_lifecycle.sql"),
  path.join(projectRoot, "database", "migrations", "20260721_master_data_runtime.sql"),
  path.join(projectRoot, "database", "migrations", "20260720_operational_runtime.sql"),
];
const masterDataForeignKeys = [
  ["fk_complaints_status", "complaints", "status_id", "complaint_statuses", "id"],
  ["fk_complaints_priority", "complaints", "priority_id", "complaint_priorities", "id"],
  ["fk_complaints_category", "complaints", "category_id", "complaint_categories", "id"],
  ["fk_complaints_location", "complaints", "location_id", "complaint_locations", "id"],
  ["fk_complaints_submitted_department", "complaints", "submitted_department_id", "departments", "id"],
  ["fk_complaints_assigned_department", "complaints", "assigned_department_id", "departments", "id"],
];

const installerTables = [
  "report_jobs",
  "admin_notifications",
  "notification_outbox",
  "notification_templates",
  "background_job_leases",
  "complaint_resolution_documents",
  "complaint_internal_comments",
  "complaint_escalations",
  "due_date_extension_requests",
  "complaint_reassignment_requests",
  "complaint_assignment_history",
  "complaint_status_history",
  "assignment_routing_rules",
  "workflow_transitions",
  "department_category_mappings",
  "complaint_locations",
  "complaint_categories",
  "complaint_priorities",
  "complaint_statuses",
  "public_holidays",
  "admin_sessions",
  "ticket_number_setting_logs",
  "ticket_sequences",
  "ticket_number_settings",
  "complaint_attachments",
  "complaints",
  "admin_two_factor_recovery_codes",
  "admin_two_factor_challenges",
  "admin_audit_logs",
  "admin_auth_events",
  "role_permissions",
  "permissions",
  "system_settings",
  "system_setting_logs",
  "admin_users",
  "departments",
  "roles",
];

class InstallerError extends Error {
  constructor(message, statusCode = 400, details = undefined) {
    super(message);
    this.name = "InstallerError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

const trimTrailingSlash = (value) => String(value || "").replace(/\/+$/g, "");

const normalizeBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

const validateDatabaseName = (value) => {
  if (!/^[a-zA-Z0-9_$-]+$/.test(value)) {
    throw new InstallerError(
      "Database name can only contain letters, numbers, underscores, dashes, and dollar signs",
    );
  }
};

const validatePort = (value, fieldName) => {
  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new InstallerError(`${fieldName} must be a valid port number`);
  }

  return port;
};

const getBackendPort = (backendUrl, fallbackPort) => {
  if (fallbackPort) {
    return validatePort(fallbackPort, "Backend port");
  }

  try {
    const parsedUrl = new URL(backendUrl);
    if (parsedUrl.port) {
      return validatePort(parsedUrl.port, "Backend port");
    }
  } catch {
    // Validation reports invalid URLs separately.
  }

  return 5001;
};

const assertUrl = (value, fieldName) => {
  try {
    return trimTrailingSlash(new URL(value).toString());
  } catch {
    throw new InstallerError(`${fieldName} must be a valid URL`);
  }
};

const formatEnvValue = (value) => {
  const stringValue = value === undefined || value === null ? "" : String(value);

  if (!stringValue) {
    return "";
  }

  if (/[\s#"']/g.test(stringValue)) {
    return JSON.stringify(stringValue);
  }

  return stringValue;
};

const buildEnv = (entries) =>
  Object.entries(entries)
    .map(([key, value]) => `${key}=${formatEnvValue(value)}`)
    .join("\n")
    .concat("\n");

const getInstallerStatus = () => {
  const installed = fs.existsSync(lockPath);

  return {
    installed,
    lock_path: lockPath,
    message: installed
      ? "Project is already installed"
      : "Project installation is pending",
  };
};

const normalizeConfig = (input = {}) => {
  const backendUrl = assertUrl(
    input.backend_url || input.app_url || "http://localhost:5001",
    "Backend URL",
  );
  const adminUrl = assertUrl(
    input.admin_url || "http://localhost:5174",
    "Admin panel URL",
  );
  const backendPort = getBackendPort(backendUrl, input.backend_port);
  const frontendUrl = input.frontend_url
    ? assertUrl(input.frontend_url, "Public website URL")
    : "";
  const apiBaseUrl = trimTrailingSlash(
    input.api_base_url || `${backendUrl}/api`,
  );

  const config = {
    backend_url: backendUrl,
    backend_port: backendPort,
    admin_url: adminUrl,
    frontend_url: frontendUrl,
    api_base_url: apiBaseUrl,
    db_host: String(input.db_host || "localhost").trim(),
    db_name: String(input.db_name || "").trim(),
    db_user: String(input.db_user || "").trim(),
    db_password: input.db_password === undefined ? "" : String(input.db_password),
    db_timezone: String(input.db_timezone || "+00:00").trim(),
    admin_name: String(input.admin_name || "").trim(),
    admin_email: String(input.admin_email || "").trim().toLowerCase(),
    admin_password: String(input.admin_password || ""),
    jwt_secret: String(input.jwt_secret || "").trim(),
    jwt_expires_in: String(input.jwt_expires_in || "1d").trim(),
    node_env: String(input.node_env || "development").trim(),
    reset_database: normalizeBoolean(input.reset_database, true),
    two_factor_enforced: normalizeBoolean(input.two_factor_enforced, false),
    two_factor_pepper: String(
      input.two_factor_pepper || input.jwt_secret || "",
    ).trim(),
    smtp_host: String(input.smtp_host || "").trim(),
    smtp_port: validatePort(input.smtp_port || 587, "SMTP port"),
    smtp_secure: normalizeBoolean(input.smtp_secure, false),
    smtp_user: String(input.smtp_user || "").trim(),
    smtp_password: input.smtp_password === undefined ? "" : String(input.smtp_password),
    smtp_from: String(
      input.smtp_from ||
        "MHD Belize Administration <no-reply@example.gov.bz>",
    ).trim(),
    recaptcha_secret_key: String(input.recaptcha_secret_key || "").trim(),
    recaptcha_site_key: String(input.recaptcha_site_key || "").trim(),
    pii_encryption_key: String(input.pii_encryption_key || crypto.randomBytes(32).toString("hex")).trim(),
    complaint_token_prefix: String(input.complaint_token_prefix || "GRM").trim(),
    complaint_token_random_length: Number.parseInt(
      input.complaint_token_random_length || 7,
      10,
    ),
  };

  const missingFields = [];

  [
    "db_host",
    "db_name",
    "db_user",
    "admin_name",
    "admin_email",
    "admin_password",
    "jwt_secret",
    "two_factor_pepper",
  ].forEach((field) => {
    if (!config[field]) {
      missingFields.push(field);
    }
  });

  if (missingFields.length > 0) {
    throw new InstallerError("Required installation fields are missing", 400, {
      missing_fields: missingFields,
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.admin_email)) {
    throw new InstallerError("Super Admin email must be valid");
  }

  if (config.admin_password.length < 8) {
    throw new InstallerError(
      "Super Admin password must be at least 8 characters long",
    );
  }

  if (
    config.jwt_secret.length < 32 ||
    /(?:change|example|replace|sample|test)[-_ ]*(?:me|this|secret|value)?/i.test(
      config.jwt_secret,
    )
  ) {
    throw new InstallerError(
      "JWT secret must be a unique, non-placeholder value of at least 32 characters",
    );
  }

  if (config.two_factor_pepper.length < 32) {
    throw new InstallerError(
      "Two-factor pepper must be at least 32 characters long",
    );
  }

  validateDatabaseName(config.db_name);

  if (!/^[+-](?:0\d|1[0-4]):[0-5]\d$/.test(config.db_timezone)) {
    throw new InstallerError(
      "Database timezone must be an offset such as +00:00 or +05:30",
    );
  }

  if (config.two_factor_enforced) {
    const missingSmtpFields = [];

    ["smtp_host", "smtp_port", "smtp_from"].forEach((field) => {
      if (!config[field]) {
        missingSmtpFields.push(field);
      }
    });

    if (missingSmtpFields.length > 0) {
      throw new InstallerError(
        "SMTP settings are required when two-factor authentication is enforced",
        400,
        { missing_fields: missingSmtpFields },
      );
    }
  }

  if (!/^[a-zA-Z0-9]{1,8}$/.test(config.complaint_token_prefix)) {
    throw new InstallerError(
      "Complaint token prefix must be 1 to 8 letters or numbers",
    );
  }

  if (
    !Number.isInteger(config.complaint_token_random_length) ||
    config.complaint_token_random_length < 4 ||
    config.complaint_token_random_length > 16
  ) {
    throw new InstallerError(
      "Complaint token random length must be between 4 and 16",
    );
  }

  return config;
};

const resetManagedTables = async (connection) => {
  await connection.query("SET FOREIGN_KEY_CHECKS = 0");

  for (const table of installerTables) {
    await connection.query(`DROP TABLE IF EXISTS \`${table}\``);
  }

  await connection.query("SET FOREIGN_KEY_CHECKS = 1");
};

const runSchema = async (connection) => {
  if (!fs.existsSync(sqlPath)) {
    throw new InstallerError("database.sql file not found", 500, {
      path: sqlPath,
    });
  }

  const sql = fs.readFileSync(sqlPath, "utf8");
  await connection.query(sql);
  for (const migrationPath of installMigrationPaths) {
    if (!fs.existsSync(migrationPath)) {
      throw new InstallerError("Required database migration not found", 500, { path: migrationPath });
    }
    await connection.query(await readCompatibleMigration(connection, migrationPath));
  }
  await ensureForeignKeys(connection, masterDataForeignKeys);
};

const createSuperAdmin = async (connection, config) => {
  const hashedPassword = await bcrypt.hash(config.admin_password, 10);

  const [roles] = await connection.query(
    "SELECT id FROM roles WHERE slug = ? LIMIT 1",
    ["super-admin"],
  );

  const roleId = roles.length > 0 ? roles[0].id : null;

  if (!roleId) {
    throw new InstallerError("Super Admin role was not created", 500);
  }

  await connection.query(
    `INSERT INTO admin_users
      (name, email, password, role_id, status, password_changed_at, must_change_password)
     VALUES (?, ?, ?, ?, 'active', NOW(), 0)
     ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      password = VALUES(password),
      role_id = VALUES(role_id),
      status = 'active',
      password_changed_at = NOW(),
      must_change_password = 0,
      updated_at = NOW()`,
    [config.admin_name, config.admin_email, hashedPassword, roleId],
  );
};

const seedGeneralSettings = async (connection) => {
  for (const definition of generalSettingDefinitions) {
    const value = definition.valueType === "boolean"
      ? (definition.defaultValue ? "1" : "0")
      : definition.valueType === "json"
        ? JSON.stringify(definition.defaultValue)
        : String(definition.defaultValue ?? "");

    await connection.query(
      `INSERT INTO system_settings
         (setting_group, setting_key, setting_value, value_type, is_public, is_encrypted)
       VALUES (?, ?, ?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE
         setting_group = VALUES(setting_group),
         value_type = VALUES(value_type),
         is_public = VALUES(is_public)`,
      [
        definition.group,
        definition.settingKey,
        value,
        definition.valueType,
        definition.isPublic ? 1 : 0,
      ],
    );
  }
};

const writeEnvironmentFiles = (config) => {
  const backendEnv = buildEnv({
    APP_NAME: "MHD_BELIZE_WEBSITE",
    APP_URL: config.backend_url,
    PORT: config.backend_port,
    DB_HOST: config.db_host,
    DB_USER: config.db_user,
    DB_PASSWORD: config.db_password,
    DB_NAME: config.db_name,
    DB_TIMEZONE: config.db_timezone,
    JWT_SECRET: config.jwt_secret,
    JWT_EXPIRES_IN: config.jwt_expires_in,
    FRONTEND_URL: config.frontend_url,
    ADMIN_URL: config.admin_url,
    NODE_ENV: config.node_env,
    TRUST_PROXY: "",
    TWO_FACTOR_ENFORCED: config.two_factor_enforced,
    TWO_FACTOR_PEPPER: config.two_factor_pepper,
    SMTP_HOST: config.smtp_host,
    SMTP_PORT: config.smtp_port,
    SMTP_SECURE: config.smtp_secure,
    SMTP_USER: config.smtp_user,
    SMTP_PASSWORD: config.smtp_password,
    SMTP_FROM: config.smtp_from,
    RECAPTCHA_SECRET_KEY: config.recaptcha_secret_key,
    RECAPTCHA_SITE_KEY: config.recaptcha_site_key,
    PII_ENCRYPTION_KEY: config.pii_encryption_key,
    COMPLAINT_TOKEN_PREFIX: config.complaint_token_prefix.toUpperCase(),
    COMPLAINT_TOKEN_RANDOM_LENGTH: config.complaint_token_random_length,
    DEFAULT_GRIEVANCE_DUE_DAYS: 10,
    INSTALLATION_STATUS: true,
  });

  const adminEnv = buildEnv({
    VITE_API_BASE_URL: config.api_base_url,
    VITE_BACKEND_URL: config.backend_url,
  });

  fs.writeFileSync(backendEnvPath, backendEnv);
  fs.writeFileSync(adminEnvPath, adminEnv);
};

const createInstallLock = () => {
  fs.writeFileSync(
    lockPath,
    `Installed on ${new Date().toISOString()}\n`,
    "utf8",
  );
};

const runInstaller = async (input = {}) => {
  if (fs.existsSync(lockPath)) {
    throw new InstallerError("Project is already installed", 403);
  }

  const config = normalizeConfig(input);
  let connection;

  try {
    connection = await mysql.createConnection({
      host: config.db_host,
      user: config.db_user,
      password: config.db_password,
      multipleStatements: true,
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.db_name}\``);
    await connection.query(`USE \`${config.db_name}\``);

    if (config.reset_database) {
      await resetManagedTables(connection);
    }

    await runSchema(connection);
    await createSuperAdmin(connection, config);
    await seedGeneralSettings(connection);
    writeEnvironmentFiles(config);
    createInstallLock();

    return {
      status: true,
      message: "Project installed successfully. Please restart backend server.",
      installed: true,
    };
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

module.exports = {
  InstallerError,
  getInstallerStatus,
  runInstaller,
};
