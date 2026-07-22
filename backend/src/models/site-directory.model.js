const db = require("../config/db");
const { SOCIAL_PLATFORMS } = require("../config/site-directory");

const groupContacts = (rows, ownerColumn) => {
  const grouped = new Map();
  for (const row of rows) {
    const ownerId = Number(row[ownerColumn]);
    if (!grouped.has(ownerId)) grouped.set(ownerId, []);
    grouped.get(ownerId).push({
      id: Number(row.id), key: row.contact_key, type: row.contact_type,
      label: row.label, displayValue: row.display_value, linkValue: row.link_value,
      sortOrder: Number(row.sort_order), isActive: Boolean(row.is_active),
    });
  }
  return grouped;
};

const listDirectory = async ({ activeOnly = true } = {}) => {
  const activeDepartment = activeOnly ? "AND d.is_active=1 AND d.show_in_public_directory=1" : "";
  const activeFacility = activeOnly ? "WHERE f.is_active=1" : "";
  const activeContact = activeOnly ? "WHERE is_active=1" : "";
  const activeSocial = activeOnly ? "WHERE is_active=1 AND url IS NOT NULL AND url<>''" : "";
  const [[departments], [departmentContacts], [facilities], [facilityContacts], [socialRows]] = await Promise.all([
    db.query(`SELECT d.id, d.code, d.name, d.public_display_name, d.public_address,
      d.public_summary, d.public_icon_key, d.public_sort_order, d.show_in_public_directory, d.is_active
      FROM departments d WHERE 1=1 ${activeDepartment}
      ORDER BY d.public_sort_order, COALESCE(d.public_display_name,d.name), d.id`),
    db.query(`SELECT id, department_id, contact_key, contact_type, label, display_value,
      link_value, sort_order, is_active FROM department_public_contacts ${activeContact}
      ORDER BY sort_order, id`),
    db.query(`SELECT f.id, f.facility_key, f.department_id, d.code AS department_code,
      f.name, f.description, f.address, f.image_path, f.sort_order, f.is_active
      FROM public_facilities f LEFT JOIN departments d ON d.id=f.department_id
      ${activeFacility} ORDER BY f.sort_order, f.name, f.id`),
    db.query(`SELECT id, facility_id, contact_key, contact_type, label, display_value,
      link_value, sort_order, is_active FROM facility_public_contacts ${activeContact}
      ORDER BY sort_order, id`),
    db.query(`SELECT id, platform_key, label, url, sort_order, is_active
      FROM public_social_links ${activeSocial} ORDER BY sort_order, id`),
  ]);
  const departmentContactMap = groupContacts(departmentContacts, "department_id");
  const facilityContactMap = groupContacts(facilityContacts, "facility_id");
  return {
    departments: departments.map((item) => ({
      id: Number(item.id), code: item.code, name: item.public_display_name || item.name,
      ...(activeOnly ? {} : { operationalName: item.name }),
      address: item.public_address, summary: item.public_summary, iconKey: item.public_icon_key,
      sortOrder: Number(item.public_sort_order), isVisible: Boolean(item.show_in_public_directory),
      isActive: Boolean(item.is_active), contacts: departmentContactMap.get(Number(item.id)) || [],
    })),
    facilities: facilities.map((item) => ({
      id: Number(item.id), key: item.facility_key, departmentId: item.department_id ? Number(item.department_id) : null,
      departmentCode: item.department_code || null, name: item.name, description: item.description,
      address: item.address, imagePath: item.image_path, sortOrder: Number(item.sort_order),
      isActive: Boolean(item.is_active), contacts: facilityContactMap.get(Number(item.id)) || [],
    })),
    socialLinks: socialRows.map((item) => ({
      id: Number(item.id), platformKey: item.platform_key, label: item.label, url: item.url,
      iconKey: SOCIAL_PLATFORMS[item.platform_key]?.iconKey || null,
      sortOrder: Number(item.sort_order), isActive: Boolean(item.is_active),
    })),
  };
};

const saveDepartmentProfile = async (item) => {
  const [result] = await db.query(
    `UPDATE departments SET public_display_name=?, public_address=?, public_summary=?,
      public_icon_key=?, public_sort_order=?, show_in_public_directory=? WHERE id=?`,
    [item.name, item.address, item.summary, item.iconKey, item.sortOrder, item.isVisible ? 1 : 0, item.id],
  );
  return result.affectedRows;
};

const saveFacility = async (item) => {
  if (item.id) {
    const [result] = await db.query(
      `UPDATE public_facilities SET department_id=?, name=?, description=?, address=?,
       sort_order=?, is_active=? WHERE id=?`,
      [item.departmentId, item.name, item.description, item.address, item.sortOrder, item.isActive ? 1 : 0, item.id],
    );
    return result.affectedRows ? item.id : null;
  }
  const [result] = await db.query(
    `INSERT INTO public_facilities
     (facility_key, department_id, name, description, address, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [item.key, item.departmentId, item.name, item.description, item.address, item.sortOrder, item.isActive ? 1 : 0],
  );
  return result.insertId;
};

const findFacility = async (id) => {
  const [rows] = await db.query(`SELECT * FROM public_facilities WHERE id=? LIMIT 1`, [id]);
  return rows[0] || null;
};

const updateFacilityImage = async (id, imagePath) => {
  const [result] = await db.query(`UPDATE public_facilities SET image_path=? WHERE id=?`, [imagePath, id]);
  return result.affectedRows;
};

const contactTable = (ownerType) => ownerType === "department"
  ? { table: "department_public_contacts", ownerColumn: "department_id" }
  : ownerType === "facility" ? { table: "facility_public_contacts", ownerColumn: "facility_id" } : null;

const findContact = async (ownerType, id) => {
  const config = contactTable(ownerType);
  if (!config) return null;
  const [rows] = await db.query(`SELECT * FROM ${config.table} WHERE id=? LIMIT 1`, [id]);
  return rows[0] || null;
};

const ownerExists = async (ownerType, id) => {
  const table = ownerType === "department" ? "departments" : ownerType === "facility" ? "public_facilities" : null;
  if (!table) return false;
  const [rows] = await db.query(`SELECT 1 FROM ${table} WHERE id=? LIMIT 1`, [id]);
  return Boolean(rows.length);
};

const saveContact = async (ownerType, item) => {
  const config = contactTable(ownerType);
  if (!config) throw Object.assign(new Error("Unsupported directory owner"), { statusCode: 400 });
  if (item.id) {
    const [result] = await db.query(
      `UPDATE ${config.table} SET contact_type=?, label=?, display_value=?, link_value=?,
       sort_order=?, is_active=? WHERE id=?`,
      [item.type, item.label, item.displayValue, item.linkValue, item.sortOrder, item.isActive ? 1 : 0, item.id],
    );
    return result.affectedRows ? item.id : null;
  }
  const [result] = await db.query(
    `INSERT INTO ${config.table}
     (${config.ownerColumn}, contact_key, contact_type, label, display_value, link_value, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [item.ownerId, item.key, item.type, item.label, item.displayValue, item.linkValue,
      item.sortOrder, item.isActive ? 1 : 0],
  );
  return result.insertId;
};

const saveSocialLink = async (item) => {
  if (item.id) {
    const [result] = await db.query(
      `UPDATE public_social_links SET label=?, url=?, sort_order=?, is_active=? WHERE id=?`,
      [item.label, item.url, item.sortOrder, item.isActive ? 1 : 0, item.id],
    );
    return result.affectedRows ? item.id : null;
  }
  const [result] = await db.query(
    `INSERT INTO public_social_links (platform_key, label, url, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?)`,
    [item.platformKey, item.label, item.url, item.sortOrder, item.isActive ? 1 : 0],
  );
  return result.insertId;
};

const findSocialLink = async (id) => {
  const [rows] = await db.query(`SELECT * FROM public_social_links WHERE id=? LIMIT 1`, [id]);
  return rows[0] || null;
};

module.exports = {
  findContact, findFacility, findSocialLink, listDirectory, ownerExists, saveContact,
  saveDepartmentProfile, saveFacility, saveSocialLink, updateFacilityImage,
};
