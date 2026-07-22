const db = require("../config/db");

const listPublicCatalog = async () => {
  const [[categories], [locations], [departments], formOptions] = await Promise.all([
    db.query(`SELECT c.id, c.code, c.name,
      GROUP_CONCAT(DISTINCT CASE WHEN m.is_active=1 AND d.is_active=1 THEN m.department_id END ORDER BY m.department_id SEPARATOR ',') AS department_ids
      FROM complaint_categories c
      LEFT JOIN department_category_mappings m ON m.category_id=c.id AND m.is_active=1
      LEFT JOIN departments d ON d.id=m.department_id AND d.is_active=1
      WHERE c.is_active=1 GROUP BY c.id ORDER BY c.name`),
    db.query(`SELECT id, code, name FROM complaint_locations WHERE is_active=1 ORDER BY name`),
    db.query(`SELECT id, code, name FROM departments WHERE is_active=1 ORDER BY name`),
    listFormOptions({ activeOnly: true }),
  ]);
  return { categories: categories.map((row) => ({
    ...row,
    departmentIds: String(row.department_ids || "").split(",").filter(Boolean).map(Number),
    department_ids: undefined,
  })), locations, departments, formOptions };
};

const formOptionGroupNames = Object.freeze({
  assistance: "assistance",
  contact_preference: "contactPreferences",
  submission_channel: "submissionChannels",
  accommodation: "accommodations",
});

async function listFormOptions({ activeOnly = false } = {}) {
  const [rows] = await db.query(
    `SELECT id, option_group, option_key, display_label, help_text, contact_requirement,
            sort_order, is_active, created_at, updated_at
       FROM grievance_form_options ${activeOnly ? "WHERE is_active=1" : ""}
      ORDER BY FIELD(option_group,'assistance','contact_preference','submission_channel','accommodation'), sort_order, id`,
  );
  const grouped = Object.fromEntries(Object.values(formOptionGroupNames).map((name) => [name, []]));
  for (const row of rows) {
    grouped[formOptionGroupNames[row.option_group]].push({
      id: row.id, group: row.option_group, key: row.option_key,
      label: row.display_label, helpText: row.help_text,
      contactRequirement: row.contact_requirement, sortOrder: row.sort_order,
      isActive: Boolean(row.is_active), createdAt: row.created_at, updatedAt: row.updated_at,
    });
  }
  return grouped;
}

const listIntakeClassifications = async ({ activeOnly = false } = {}) => {
  const [rows] = await db.query(
    `SELECT id, classification_key, name, help_text, sort_order, is_active, created_at, updated_at
       FROM complaint_intake_classifications ${activeOnly ? "WHERE is_active=1" : ""}
      ORDER BY sort_order, id`,
  );
  return rows;
};

const findActiveIntakeClassification = async (value, executor = db) => {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  const numericId = /^\d+$/.test(normalized) ? Number(normalized) : 0;
  const [rows] = await executor.query(
    `SELECT id, classification_key, name, help_text, sort_order
       FROM complaint_intake_classifications
      WHERE is_active=1 AND (id=? OR classification_key=? OR name=?) LIMIT 1`,
    [numericId, normalized, normalized],
  );
  return rows[0] || null;
};

const getIntakeClassification = async (id) => {
  const [rows] = await db.query(`SELECT * FROM complaint_intake_classifications WHERE id=? LIMIT 1`, [id]);
  return rows[0] || null;
};

const saveIntakeClassification = async (item) => {
  if (item.id) {
    const [result] = await db.query(
      `UPDATE complaint_intake_classifications
          SET name=?, help_text=?, sort_order=?, is_active=? WHERE id=?`,
      [item.name, item.helpText, item.sortOrder, item.isActive ? 1 : 0, item.id],
    );
    return result.affectedRows || result.changedRows ? item.id : item.id;
  }
  const [result] = await db.query(
    `INSERT INTO complaint_intake_classifications
       (classification_key,name,help_text,sort_order,is_active) VALUES (?,?,?,?,?)`,
    [item.key, item.name, item.helpText, item.sortOrder, item.isActive ? 1 : 0],
  );
  return result.insertId;
};

const getIntakeClassificationDependencies = async (id) => {
  const [[row]] = await db.query(
    `SELECT COUNT(*) count FROM complaints c
       JOIN complaint_statuses s ON s.id=c.status_id
      WHERE c.office_initial_classification_id=? AND s.is_final=0`, [id],
  );
  return { activeComplaints: Number(row?.count || 0) };
};

const deactivateIntakeClassification = async (id) => {
  const [result] = await db.query(
    `UPDATE complaint_intake_classifications SET is_active=0 WHERE id=?`, [id],
  );
  return result.affectedRows;
};

const saveFormOption = async (item) => {
  if (item.id) {
    const [result] = await db.query(
      `UPDATE grievance_form_options SET display_label=?, help_text=?, contact_requirement=?, sort_order=?, is_active=? WHERE id=?`,
      [item.label, item.helpText, item.contactRequirement, item.sortOrder, item.isActive ? 1 : 0, item.id],
    );
    return result.affectedRows ? item.id : null;
  }
  const [result] = await db.query(
    `INSERT INTO grievance_form_options
       (option_group, option_key, display_label, help_text, contact_requirement, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [item.group, item.key, item.label, item.helpText, item.contactRequirement,
      item.sortOrder, item.isActive ? 1 : 0],
  );
  return result.insertId;
};

const getFormOption = async (id) => {
  const [rows] = await db.query(`SELECT * FROM grievance_form_options WHERE id=? LIMIT 1`, [id]);
  return rows[0] || null;
};

const getFormOptionDeactivationDependencies = async (id) => {
  const option = await getFormOption(id);
  if (!option) return null;
  const [[active]] = await db.query(
    `SELECT COUNT(*) count FROM grievance_form_options WHERE option_group=? AND is_active=1 AND id<>?`,
    [option.option_group, id],
  );
  return {
    option,
    remainingActive: Number(active.count || 0),
    requiredGroup: ["submission_channel", "contact_preference"].includes(option.option_group),
  };
};

const deactivateFormOption = async (id) => {
  const [result] = await db.query(`UPDATE grievance_form_options SET is_active=0 WHERE id=?`, [id]);
  return result.affectedRows;
};

const catalogTables = Object.freeze({
  categories: "complaint_categories",
  locations: "complaint_locations",
  departments: "departments",
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
      `UPDATE ${table} SET name=?, is_active=? WHERE id=?`,
      [item.name, item.isActive ? 1 : 0, item.id],
    );
    return Number(result.affectedRows) ? Number(item.id) : null;
  }
  const [result] = await db.query(
    `INSERT INTO ${table} (${catalog === "departments" ? "code, slug, name" : "code, name"}, is_active) VALUES (${catalog === "departments" ? "?, ?, ?" : "?, ?"}, ?)`,
    catalog === "departments"
      ? [item.code, item.code.toLowerCase(), item.name, item.isActive ? 1 : 0]
      : [item.code, item.name, item.isActive ? 1 : 0],
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
    db.query(`SELECT id, status_key, name, reporting_group, notification_event, is_final, is_system, is_active, sort_order FROM complaint_statuses ORDER BY sort_order, id`),
    db.query(`SELECT id, priority_key, name, is_high_priority, is_system, is_active, sort_order FROM complaint_priorities ORDER BY sort_order, id`),
    db.query(`SELECT t.id, t.from_status_id, fs.status_key AS from_status_key, fs.name AS from_status, t.to_status_id, ts.status_key AS to_status_key, ts.name AS to_status, t.is_active
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
    `SELECT id, status_key, name, reporting_group, notification_event, is_final FROM complaint_statuses WHERE (status_key=? OR name=?) AND is_active=1 LIMIT 1`,
    [name, name],
  );
  return rows[0] || null;
};

const findPriorityByName = async (name, executor = db) => {
  const [rows] = await executor.query(
    `SELECT id, priority_key, name, is_high_priority FROM complaint_priorities WHERE (priority_key=? OR name=?) AND is_active=1 LIMIT 1`,
    [name, name],
  );
  return rows[0] || null;
};

const findActiveCategoryMapping = async (departmentId, categoryId, executor = db) => {
  const [rows] = await executor.query(
    `SELECT 1 FROM department_category_mappings m
      JOIN departments d ON d.id=m.department_id AND d.is_active=1
      JOIN complaint_categories c ON c.id=m.category_id AND c.is_active=1
      WHERE m.department_id=? AND m.category_id=? AND m.is_active=1 LIMIT 1`,
    [departmentId, categoryId],
  );
  return Boolean(rows[0]);
};

const saveCategoryMappings = async (categoryId, departmentIds) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(`UPDATE department_category_mappings SET is_active=0 WHERE category_id=?`, [categoryId]);
    for (const departmentId of departmentIds) {
      await connection.query(
        `INSERT INTO department_category_mappings (category_id, department_id, is_active) VALUES (?, ?, 1)
         ON DUPLICATE KEY UPDATE is_active=1`, [categoryId, departmentId],
      );
    }
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
};

const saveStatus = async (item) => {
  if (item.id) {
    const [existing] = await db.query(`SELECT reporting_group, notification_event, is_final, is_system, is_active FROM complaint_statuses WHERE id=?`, [item.id]);
    if (!existing[0]) return null;
    const protectedItem = Boolean(existing[0].is_system);
    const [result] = await db.query(
      `UPDATE complaint_statuses SET name=?, reporting_group=?, notification_event=?, is_final=?, is_active=?, sort_order=? WHERE id=?`,
      [item.name, protectedItem ? existing[0].reporting_group : item.reportingGroup,
        protectedItem ? existing[0].notification_event : item.notificationEvent,
        protectedItem ? existing[0].is_final : item.isFinal,
        protectedItem ? existing[0].is_active : item.isActive, item.sortOrder, item.id],
    );
    return result.affectedRows || result.changedRows ? item.id : item.id;
  }
  const [result] = await db.query(
    `INSERT INTO complaint_statuses (status_key,name,reporting_group,notification_event,is_final,is_active,sort_order) VALUES (?,?,?,?,?,?,?)`,
    [item.key, item.name, item.reportingGroup, item.notificationEvent, item.isFinal, item.isActive, item.sortOrder],
  );
  return result.insertId;
};

const savePriority = async (item) => {
  if (item.id) {
    const [result] = await db.query(
      `UPDATE complaint_priorities SET name=?, is_high_priority=?, is_active=?, sort_order=? WHERE id=?`,
      [item.name, item.isHighPriority, item.isActive, item.sortOrder, item.id],
    );
    return result.affectedRows || result.changedRows ? item.id : item.id;
  }
  const [result] = await db.query(
    `INSERT INTO complaint_priorities (priority_key,name,is_high_priority,is_active,sort_order) VALUES (?,?,?,?,?)`,
    [item.key, item.name, item.isHighPriority, item.isActive, item.sortOrder],
  );
  return result.insertId;
};

const saveTransition = async ({ fromStatusId, toStatusId, isActive }) => {
  const [result] = await db.query(
    `INSERT INTO workflow_transitions (from_status_id,to_status_id,is_active) VALUES (?,?,?)
     ON DUPLICATE KEY UPDATE is_active=VALUES(is_active), id=LAST_INSERT_ID(id)`,
    [fromStatusId, toStatusId, isActive],
  );
  return result.insertId;
};

const getDeactivationDependencies = async (type, id) => {
  const queries = {
    departments: [
      [`SELECT COUNT(*) count FROM admin_users WHERE department_id=? AND status='active'`, "activeUsers"],
      [`SELECT COUNT(*) count FROM complaints c JOIN complaint_statuses s ON s.id=c.status_id WHERE (c.assigned_department_id=? OR c.submitted_department_id=?) AND s.is_final=0`, "activeComplaints", true],
    ],
    categories: [[`SELECT COUNT(*) count FROM complaints c JOIN complaint_statuses s ON s.id=c.status_id WHERE c.category_id=? AND s.is_final=0`, "activeComplaints"]],
    locations: [[`SELECT COUNT(*) count FROM complaints c JOIN complaint_statuses s ON s.id=c.status_id WHERE c.location_id=? AND s.is_final=0`, "activeComplaints"]],
    statuses: [
      [`SELECT COUNT(*) count FROM complaints c JOIN complaint_statuses s ON s.id=c.status_id WHERE c.status_id=? AND s.is_final=0`, "activeComplaints"],
      [`SELECT COUNT(*) count FROM workflow_transitions WHERE (from_status_id=? OR to_status_id=?) AND is_active=1`, "activeTransitions", true],
      [`SELECT COUNT(*) count FROM system_settings gs JOIN complaint_statuses ms ON ms.status_key=gs.setting_value WHERE gs.setting_key='workflow.defaultNewGrievanceStatus' AND ms.id=?`, "configuredDefaults"],
    ],
    priorities: [
      [`SELECT COUNT(*) count FROM complaints c JOIN complaint_statuses s ON s.id=c.status_id WHERE c.priority_id=? AND s.is_final=0`, "activeComplaints"],
      [`SELECT COUNT(*) count FROM system_settings gs JOIN complaint_priorities mp ON mp.priority_key=gs.setting_value WHERE gs.setting_key='assignment.defaultAssignmentPriority' AND mp.id=?`, "configuredDefaults"],
    ],
  };
  const dependencies = {};
  for (const [sql, key, twice] of queries[type] || []) {
    const [rows] = await db.query(sql, twice ? [id, id] : [id]);
    dependencies[key] = Number(rows[0]?.count || 0);
  }
  return dependencies;
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
  createRoutingRule, deactivateCatalogItem, deactivateHoliday, deactivateIntakeClassification, deactivateRoutingRule,
  findActiveCatalogItem, findActiveCategoryMapping, findActiveIntakeClassification, findPriorityByName, findRoutingRule, findStatusByName,
  getDeactivationDependencies, getIntakeClassification, getIntakeClassificationDependencies,
  getFormOption, getFormOptionDeactivationDependencies,
  listAssignableOfficers, listCatalog, listHolidays, listIntakeClassifications, listPublicCatalog,
  listFormOptions, listRoutingRules, listWorkflow, saveCatalogItem, saveCategoryMappings,
  saveFormOption, saveHoliday, saveIntakeClassification, savePriority, saveStatus, saveTransition,
  deactivateFormOption, updateRoutingRule,
};
