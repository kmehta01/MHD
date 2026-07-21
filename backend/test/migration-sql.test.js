const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const { adaptForeignKeyColumnTypes, ensureForeignKeys, foreignKeyReferences } = require("../src/utils/migration-sql");

const migration = `
CREATE TABLE child_records (
  complaint_id BIGINT UNSIGNED NOT NULL,
  assigned_by INT UNSIGNED NULL,
  CONSTRAINT fk_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id),
  CONSTRAINT fk_actor FOREIGN KEY (assigned_by) REFERENCES admin_users(id)
);`;

test("migration compatibility discovers declared foreign-key parents", () => {
  assert.deepEqual(foreignKeyReferences(migration), [
    { childColumn: "complaint_id", parentTable: "complaints", parentColumn: "id" },
    { childColumn: "assigned_by", parentTable: "admin_users", parentColumn: "id" },
  ]);
});

test("migration compatibility matches child signedness to installed parent IDs", async () => {
  const connection = {
    query: async () => [[
      { TABLE_NAME: "complaints", COLUMN_NAME: "id", COLUMN_TYPE: "bigint(20) unsigned" },
      { TABLE_NAME: "admin_users", COLUMN_NAME: "id", COLUMN_TYPE: "int(11)" },
    ]],
  };
  const sql = await adaptForeignKeyColumnTypes(connection, migration);
  assert.match(sql, /complaint_id BIGINT\(20\) UNSIGNED NOT NULL/);
  assert.match(sql, /assigned_by INT\(11\) NULL/);
  assert.doesNotMatch(sql, /assigned_by INT UNSIGNED/);
});

test("foreign-key installation repairs an existing signedness mismatch", async () => {
  const statements = [];
  const connection = { query: async (sql) => {
    statements.push(sql);
    if (sql.includes("REFERENTIAL_CONSTRAINTS")) return [[]];
    if (sql.includes("information_schema.COLUMNS")) return [[
      { TABLE_NAME: "complaints", COLUMN_NAME: "status_id", COLUMN_TYPE: "smallint(5) unsigned", IS_NULLABLE: "YES" },
      { TABLE_NAME: "complaint_statuses", COLUMN_NAME: "id", COLUMN_TYPE: "smallint(5)", IS_NULLABLE: "NO" },
    ]];
    return [{ affectedRows: 0 }];
  } };
  await ensureForeignKeys(connection, [["fk_status", "complaints", "status_id", "complaint_statuses", "id"]]);
  assert.ok(statements.some((sql) => sql.includes("MODIFY COLUMN `status_id` SMALLINT(5) NULL")));
  assert.ok(statements.some((sql) => sql.includes("ADD CONSTRAINT `fk_status`")));
});

test("grievance-form migration preserves compatibility while seeding stable choices", () => {
  const sql = fs.readFileSync(path.resolve(__dirname, "../../database/migrations/20260722_grievance_form_options.sql"), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS grievance_form_options/i);
  assert.match(sql, /UNIQUE KEY unique_grievance_form_option \(option_group, option_key\)/i);
  assert.match(sql, /'large_print', 'Large print'/i);
  assert.match(sql, /ELSE assistance END/i);
  assert.match(sql, /MODIFY COLUMN contact_pref VARCHAR\(80\) NULL/i);
  assert.doesNotMatch(sql, /UPDATE complaints SET issue_type/i);
});
