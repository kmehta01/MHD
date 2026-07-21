const db = require("../config/db");

const listPublicCatalog = async () => {
  const [[categories], [locations], [departments]] = await Promise.all([
    db.query(`SELECT id, code, name FROM complaint_categories WHERE is_active=1 ORDER BY name`),
    db.query(`SELECT id, code, name FROM complaint_locations WHERE is_active=1 ORDER BY name`),
    db.query(`SELECT id, code, name FROM departments WHERE is_active=1 ORDER BY name`),
  ]);
  return { categories, locations, departments };
};

const catalogTables = Object.freeze({
  categories: "complaint_categories",
  locations: "complaint_locations",
});

const listCatalog = async (catalog) => {
  const table = catalogTables[catalog];
  if (!table) throw Object.assign(new Error("Unsupported catalog"), { statusCode: 400 });
  const [rows] = await db.query(
    `SELECT id, code, name, is_active, created_at, updated_at FROM ${table} ORDER BY name`,
  );
  return rows;
};

const saveCatalogItem = async (catalog, item) => {
  const table = catalogTables[catalog];
  if (!table) throw Object.assign(new Error("Unsupported catalog"), { statusCode: 400 });
  if (item.id) {
    const [result] = await db.query(
      `UPDATE ${table} SET code=?, name=?, is_active=? WHERE id=?`,
      [item.code, item.name, item.isActive ? 1 : 0, item.id],
    );
    return Number(result.affectedRows) ? Number(item.id) : null;
  }
  const [result] = await db.query(
    `INSERT INTO ${table} (code, name, is_active) VALUES (?, ?, ?)`,
    [item.code, item.name, item.isActive ? 1 : 0],
  );
  return result.insertId;
};

const deactivateCatalogItem = async (catalog, id) => {
  const table = catalogTables[catalog];
  if (!table) throw Object.assign(new Error("Unsupported catalog"), { statusCode: 400 });
  const [result] = await db.query(`UPDATE ${table} SET is_active=0 WHERE id=?`, [id]);
  return result.affectedRows;
};

const listWorkflow = async () => {
  const [[statuses], [priorities], [transitions]] = await Promise.all([
    db.query(`SELECT id, status_key, name, is_final, is_active, sort_order FROM complaint_statuses ORDER BY sort_order, id`),
    db.query(`SELECT id, priority_key, name, is_active, sort_order FROM complaint_priorities ORDER BY sort_order, id`),
    db.query(`SELECT t.id, t.from_status_id, fs.name AS from_status, t.to_status_id, ts.name AS to_status, t.is_active
              FROM workflow_transitions t
              JOIN complaint_statuses fs ON fs.id=t.from_status_id
              JOIN complaint_statuses ts ON ts.id=t.to_status_id
              ORDER BY fs.sort_order, ts.sort_order`),
  ]);
  return { statuses, priorities, transitions };
};

const listAssignableOfficers = async () => {
  const [rows] = await db.query(
    `SELECT au.id, au.name, au.email, au.department_id, d.name AS department_name
     FROM admin_users au LEFT JOIN departments d ON d.id=au.department_id
     WHERE au.status='active' ORDER BY au.name`,
  );
  return rows;
};

const findActiveCatalogItem = async (table, id, executor = db) => {
  const allowedTables = new Set(["complaint_categories", "complaint_locations", "departments"]);
  if (!allowedTables.has(table)) throw new Error("Unsupported catalog");
  const [rows] = await executor.query(
    `SELECT id, code, name FROM ${table} WHERE id=? AND is_active=1 LIMIT 1`,
    [id],
  );
  return rows[0] || null;
};

const findStatusByName = async (name, executor = db) => {
  const [rows] = await executor.query(
    `SELECT id, status_key, name, is_final FROM complaint_statuses WHERE name=? AND is_active=1 LIMIT 1`,
    [name],
  );
  return rows[0] || null;
};

const findPriorityByName = async (name, executor = db) => {
  const [rows] = await executor.query(
    `SELECT id, priority_key, name FROM complaint_priorities WHERE name=? AND is_active=1 LIMIT 1`,
    [name],
  );
  return rows[0] || null;
};

const findRoutingRule = async ({ matchTypes, categoryId, departmentId, locationId }, executor = db) => {
  const matches = [];
  if (matchTypes.includes("category") && categoryId) matches.push(["category", String(categoryId)]);
  if (matchTypes.includes("department") && departmentId) matches.push(["department", String(departmentId)]);
  if (matchTypes.includes("location") && locationId) matches.push(["location", String(locationId)]);
  if (matchTypes.includes("fallback")) matches.push(["fallback", null]);
  if (!matches.length) return null;
  const conditions = matches.map(([, value]) =>
    value === null ? `(match_type=? AND match_value IS NULL)` : `(match_type=? AND match_value=?)`,
  );
  const values = matches.flatMap(([type, value]) => value === null ? [type] : [type, value]);
  const [rows] = await executor.query(
    `SELECT id, match_type, match_value, destination_department_id, assigned_officer_id
     FROM assignment_routing_rules
     WHERE is_active=1 AND (${conditions.join(" OR ")})
     ORDER BY rule_priority ASC, id ASC LIMIT 1`,
    values,
  );
  return rows[0] || null;
};

const listRoutingRules = async () => {
  const [rows] = await db.query(
    `SELECT r.id, r.name, r.match_type, r.match_value, r.destination_department_id,
            r.assigned_officer_id, r.rule_priority, r.is_active, r.created_at, r.updated_at,
            d.name AS destination_department_name, au.name AS assigned_officer_name
     FROM assignment_routing_rules r
     JOIN departments d ON d.id=r.destination_department_id
     LEFT JOIN admin_users au ON au.id=r.assigned_officer_id
     ORDER BY r.rule_priority, r.id`,
  );
  return rows;
};

const createRoutingRule = async (rule, userId) => {
  const [result] = await db.query(
    `INSERT INTO assignment_routing_rules
      (name, match_type, match_value, destination_department_id, assigned_officer_id,
       rule_priority, is_active, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [rule.name, rule.matchType, rule.matchValue, rule.departmentId,
      rule.officerId, rule.priority, rule.isActive ? 1 : 0, userId],
  );
  return result.insertId;
};

const updateRoutingRule = async (id, rule) => {
  const [result] = await db.query(
    `UPDATE assignment_routing_rules SET name=?, match_type=?, match_value=?,
       destination_department_id=?, assigned_officer_id=?, rule_priority=?, is_active=?
     WHERE id=?`,
    [rule.name, rule.matchType, rule.matchValue, rule.departmentId,
      rule.officerId, rule.priority, rule.isActive ? 1 : 0, id],
  );
  return result.affectedRows;
};

const deactivateRoutingRule = async (id) => {
  const [result] = await db.query(`UPDATE assignment_routing_rules SET is_active=0 WHERE id=?`, [id]);
  return result.affectedRows;
};

const listHolidays = async () => {
  const [rows] = await db.query(`SELECT id, holiday_date, name, is_active FROM public_holidays ORDER BY holiday_date DESC`);
  return rows;
};

const saveHoliday = async ({ id, date, name, isActive }) => {
  if (id) {
    const [result] = await db.query(`UPDATE public_holidays SET holiday_date=?, name=?, is_active=? WHERE id=?`, [date, name, isActive ? 1 : 0, id]);
    return Number(result.affectedRows) ? Number(id) : null;
  }
  const [result] = await db.query(
    `INSERT INTO public_holidays (holiday_date, name, is_active) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE name=VALUES(name), is_active=VALUES(is_active), id=LAST_INSERT_ID(id)`,
    [date, name, isActive ? 1 : 0],
  );
  return result.insertId;
};

const deactivateHoliday = async (id) => {
  const [result] = await db.query(`UPDATE public_holidays SET is_active=0 WHERE id=?`, [id]);
  return result.affectedRows;
};

module.exports = {
  createRoutingRule, deactivateCatalogItem, deactivateHoliday, deactivateRoutingRule,
  findActiveCatalogItem, findPriorityByName, findRoutingRule, findStatusByName,
  listAssignableOfficers, listCatalog, listHolidays, listPublicCatalog,
  listRoutingRules, listWorkflow, saveCatalogItem, saveHoliday, updateRoutingRule,
};
