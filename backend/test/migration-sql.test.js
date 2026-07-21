const assert = require("node:assert/strict");
const test = require("node:test");
const { adaptForeignKeyColumnTypes, foreignKeyReferences } = require("../src/utils/migration-sql");

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
