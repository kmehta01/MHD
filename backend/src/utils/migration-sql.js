const fs = require("node:fs");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const foreignKeyReferences = (sql) => {
  const references = [];
  const pattern = /FOREIGN\s+KEY\s*\(\s*`?([A-Za-z0-9_]+)`?\s*\)\s+REFERENCES\s+`?([A-Za-z0-9_]+)`?\s*\(\s*`?([A-Za-z0-9_]+)`?\s*\)/gi;
  for (const match of sql.matchAll(pattern)) {
    references.push({ childColumn: match[1], parentTable: match[2], parentColumn: match[3] });
  }
  return references;
};

const compatibleIntegerType = (columnType) => {
  const normalized = String(columnType || "").trim();
  return /^(?:tinyint|smallint|mediumint|int|bigint)(?:\(\d+\))?(?: unsigned)?$/i.test(normalized)
    ? normalized.toUpperCase()
    : null;
};

const adaptForeignKeyColumnTypes = async (connection, sql) => {
  const references = foreignKeyReferences(sql);
  if (!references.length) return sql;

  const parentTables = [...new Set(references.map((item) => item.parentTable))];
  const [columns] = await connection.query(
    `SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?)`,
    [parentTables],
  );
  const parentTypes = new Map(columns.map((column) => [
    `${column.TABLE_NAME}.${column.COLUMN_NAME}`,
    compatibleIntegerType(column.COLUMN_TYPE),
  ]));

  let compatibleSql = sql;
  for (const reference of references) {
    const parentType = parentTypes.get(`${reference.parentTable}.${reference.parentColumn}`);
    if (!parentType) continue;
    const declaration = new RegExp(
      `(\\b${escapeRegex(reference.childColumn)}\\s+)(?:TINYINT|SMALLINT|MEDIUMINT|INT|INTEGER|BIGINT)(?:\\s*\\(\\d+\\))?(?:\\s+UNSIGNED)?`,
      "gi",
    );
    compatibleSql = compatibleSql.replace(declaration, `$1${parentType}`);
  }
  return compatibleSql;
};

const readCompatibleMigration = async (connection, migrationPath) =>
  adaptForeignKeyColumnTypes(connection, fs.readFileSync(migrationPath, "utf8"));

const ensureForeignKeys = async (connection, definitions) => {
  const [existing] = await connection.query(
    `SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE()`,
  );
  const names = new Set(existing.map((row) => row.CONSTRAINT_NAME));
  for (const [name, childTable, childColumn, parentTable, parentColumn] of definitions) {
    if (names.has(name)) continue;
    const identifiers = [name, childTable, childColumn, parentTable, parentColumn];
    if (identifiers.some((value) => !/^[A-Za-z0-9_]+$/.test(value))) throw new Error("Unsafe foreign-key identifier");
    const [columns] = await connection.query(
      `SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA=DATABASE()
          AND ((TABLE_NAME=? AND COLUMN_NAME=?) OR (TABLE_NAME=? AND COLUMN_NAME=?))`,
      [childTable, childColumn, parentTable, parentColumn],
    );
    const child = columns.find((column) => column.TABLE_NAME === childTable && column.COLUMN_NAME === childColumn);
    const parent = columns.find((column) => column.TABLE_NAME === parentTable && column.COLUMN_NAME === parentColumn);
    const parentType = compatibleIntegerType(parent?.COLUMN_TYPE);
    if (!child || !parentType) throw new Error(`Foreign-key columns are unavailable for ${name}`);
    if (String(child.COLUMN_TYPE).toLowerCase() !== String(parent.COLUMN_TYPE).toLowerCase()) {
      await connection.query(
        `ALTER TABLE \`${childTable}\` MODIFY COLUMN \`${childColumn}\` ${parentType} ${child.IS_NULLABLE === "YES" ? "NULL" : "NOT NULL"}`,
      );
    }
    await connection.query(
      `ALTER TABLE \`${childTable}\` ADD CONSTRAINT \`${name}\` FOREIGN KEY (\`${childColumn}\`) REFERENCES \`${parentTable}\` (\`${parentColumn}\`)`,
    );
  }
};

module.exports = { adaptForeignKeyColumnTypes, ensureForeignKeys, foreignKeyReferences, readCompatibleMigration };
