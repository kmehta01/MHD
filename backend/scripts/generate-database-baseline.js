#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const projectRoot = path.resolve(__dirname, "../..");
const outputPath = path.join(projectRoot, "database", "database.sql");

const seedColumns = {
  roles: ["id", "name", "slug", "is_active"],
  departments: [
    "id", "name", "public_display_name", "public_address", "public_summary",
    "public_icon_key", "public_sort_order", "show_in_public_directory", "slug", "code", "is_active",
  ],
  permissions: ["id", "module", "action", "permission_key", "description", "is_active"],
  role_permissions: ["role_id", "permission_id"],
  complaint_intake_classifications: [
    "id", "classification_key", "name", "help_text", "sort_order", "is_active",
  ],
  complaint_statuses: [
    "id", "status_key", "name", "reporting_group", "notification_event", "is_final", "is_system",
    "is_active", "sort_order",
  ],
  complaint_priorities: [
    "id", "priority_key", "name", "is_high_priority", "is_system", "sort_order", "is_active",
  ],
  complaint_categories: ["id", "code", "name", "is_active"],
  complaint_locations: ["id", "code", "name", "is_active"],
  grievance_form_options: [
    "id", "option_group", "option_key", "display_label", "help_text",
    "contact_requirement", "sort_order", "is_active",
  ],
  department_category_mappings: ["department_id", "category_id", "is_active"],
  workflow_transitions: ["id", "from_status_id", "to_status_id", "is_active"],
  notification_templates: [
    "id", "event_type", "channel", "name", "subject_template", "body_template", "is_active",
  ],
  system_settings: [
    "id", "setting_group", "setting_key", "setting_value", "value_type", "is_public", "is_encrypted",
  ],
  ticket_number_settings: [
    "id", "auto_generate", "ticket_prefix", "ticket_format", "separator", "letter_case",
    "include_year", "year_format", "include_month", "include_day", "include_department_code",
    "include_location_code", "include_category_code", "sequence_length", "starting_sequence",
    "sequence_reset", "sequence_padding",
  ],
};

const migrationKeys = [
  "2026-07-16-dashboard-widget-permissions-v1",
  "2026-07-16-dashboard-widget-permissions-v2",
  "20260720-role-permissions",
  "20260615-two-factor",
  "20260720-complaints-foundation",
  "20260720-audit-logs",
  "20260720-profile-photo",
  "20260720-general-settings",
  "20260720-ticket-number",
  "20260720-runtime-settings",
  "20260720-grievance-lifecycle",
  "20260720-operational-runtime",
  "20260721-master-data",
  "20260722-grievance-form-options",
  "20260723-attachment-policy",
  "20260724-due-date-policy",
  "20260725-site-directory",
  "20260726-email-identity",
  "20260727-complaint-enum-normalization",
  "20260728-schema-contract-repair",
];

const quoteIdentifier = (value) => `\`${String(value).replace(/`/g, "``")}\``;

const quoteValue = (connection, value) => {
  if (value === undefined || value === null) return "NULL";
  return connection.escape(value);
};

const sanitizeRow = (table, row) => {
  const sanitized = { ...row };
  if (table === "departments") {
    sanitized.public_display_name = null;
    sanitized.public_address = null;
    sanitized.public_summary = null;
    sanitized.public_icon_key = null;
    sanitized.public_sort_order = 100;
    sanitized.show_in_public_directory = 0;
  }
  if (table === "system_settings") {
    if (["organization.logo", "organization.favicon"].includes(sanitized.setting_key)) {
      sanitized.setting_value = "";
    }
    if (sanitized.is_encrypted) sanitized.setting_value = "";
  }
  return sanitized;
};

const normalizeCreateTable = (table, source) => {
  let sql = source
    .replace(/^CREATE TABLE /i, "CREATE TABLE IF NOT EXISTS ")
    .replace(/ AUTO_INCREMENT=\d+/i, "");

  if (table === "complaints" && !/`resolution_summary`/i.test(sql)) {
    sql = sql.replace(
      /  `description` text DEFAULT NULL,\n/,
      "  `description` text DEFAULT NULL,\n  `resolution_summary` text DEFAULT NULL,\n",
    );
  }

  if (table === "complaints") {
    sql = sql.replace(/  KEY `index_complaints_assigned_department` \(`assigned_department_id`\),\n/, "");
  }
  if (table === "departments") {
    sql = sql.replace(/  UNIQUE KEY `unique_department_code` \(`code`\),\n/, "");
  }

  return `${sql};`;
};

const sortTablesByDependencies = (tables, foreignKeys) => {
  const tableSet = new Set(tables);
  const dependencies = new Map(tables.map((table) => [table, new Set()]));
  for (const row of foreignKeys) {
    if (tableSet.has(row.TABLE_NAME) && tableSet.has(row.REFERENCED_TABLE_NAME)) {
      dependencies.get(row.TABLE_NAME).add(row.REFERENCED_TABLE_NAME);
    }
  }

  const ordered = [];
  const remaining = new Set(tables);
  while (remaining.size) {
    const ready = [...remaining]
      .filter((table) => [...dependencies.get(table)].every((dependency) => !remaining.has(dependency)))
      .sort();
    if (!ready.length) {
      throw new Error(`Foreign-key dependency cycle detected: ${[...remaining].join(", ")}`);
    }
    for (const table of ready) {
      ordered.push(table);
      remaining.delete(table);
    }
  }
  return ordered;
};

const buildSeedSql = async (connection, table) => {
  const columns = seedColumns[table];
  const [rows] = await connection.query(
    `SELECT ${columns.map(quoteIdentifier).join(", ")} FROM ${quoteIdentifier(table)} ORDER BY ${columns.map(quoteIdentifier).join(", ")}`,
  );
  if (!rows.length) return "";

  const values = rows.map((sourceRow) => {
    const row = sanitizeRow(table, sourceRow);
    return `(${columns.map((column) => quoteValue(connection, row[column])).join(", ")})`;
  });
  const updateColumns = columns.filter((column) => column !== "id" && !column.endsWith("_id"));
  const updateClause = updateColumns.length
    ? updateColumns.map((column) => `${quoteIdentifier(column)}=VALUES(${quoteIdentifier(column)})`).join(", ")
    : `${quoteIdentifier(columns[0])}=VALUES(${quoteIdentifier(columns[0])})`;

  return [
    `INSERT INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(", ")}) VALUES`,
    values.join(",\n"),
    `ON DUPLICATE KEY UPDATE ${updateClause};`,
  ].join("\n");
};

const run = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const [tableRows] = await connection.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME",
    );
    const tables = tableRows.map((row) => row.TABLE_NAME);
    const [foreignKeys] = await connection.query(
      `SELECT DISTINCT TABLE_NAME, REFERENCED_TABLE_NAME
         FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL`,
    );
    const orderedTables = sortTablesByDependencies(tables, foreignKeys);
    const sections = [
      "-- GRM Portal canonical database baseline",
      "-- Contains schema and safe reference data only; no operational or personal data.",
      "SET NAMES utf8mb4;",
      "SET @GRM_OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS;",
      "SET FOREIGN_KEY_CHECKS = 0;",
    ];

    for (const table of orderedTables) {
      const [[row]] = await connection.query(`SHOW CREATE TABLE ${quoteIdentifier(table)}`);
      sections.push(`\n-- Table: ${table}\n${normalizeCreateTable(table, row["Create Table"])}`);
    }

    sections.push("\n-- Safe reference data");
    for (const table of Object.keys(seedColumns)) {
      sections.push(`\n-- Seed: ${table}\n${await buildSeedSql(connection, table)}`);
    }
    sections.push([
      "\n-- This baseline already contains the result of the known migration chain.",
      "INSERT IGNORE INTO `schema_migrations` (`migration_key`) VALUES",
      migrationKeys.map((key) => `(${connection.escape(key)})`).join(",\n"),
      ";",
      "SET FOREIGN_KEY_CHECKS = @GRM_OLD_FOREIGN_KEY_CHECKS;",
      "",
    ].join("\n"));

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, sections.filter(Boolean).join("\n"), "utf8");
    console.log(`Generated ${outputPath} from ${tables.length} table definitions and allowlisted reference data.`);
  } finally {
    await connection.end();
  }
};

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
