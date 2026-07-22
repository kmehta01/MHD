const mysql = require("mysql2/promise");
const { ensureForeignKeys } = require("../src/utils/migration-sql");
require("dotenv").config();

const ensureColumn = async (connection, table, column, definition) => {
  const [rows] = await connection.query(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=? LIMIT 1`,
    [table, column],
  );
  if (!rows.length) await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
};

const seedDepartment = async (connection, code, profile, contacts) => {
  await connection.query(
    `UPDATE departments SET public_display_name=?, public_address=?, public_summary=?,
       public_icon_key=?, public_sort_order=?, show_in_public_directory=1
     WHERE code=?`,
    [profile.name, profile.address, profile.summary || null, profile.icon, profile.order, code],
  );
  const [[department]] = await connection.query(`SELECT id FROM departments WHERE code=? LIMIT 1`, [code]);
  if (!department) return;
  for (const contact of contacts) {
    await connection.query(
      `INSERT INTO department_public_contacts
       (department_id, contact_key, contact_type, label, display_value, link_value, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE contact_type=VALUES(contact_type), label=VALUES(label),
         display_value=VALUES(display_value), link_value=VALUES(link_value), sort_order=VALUES(sort_order)`,
      [department.id, ...contact],
    );
  }
};

const seedFacility = async (connection, facility, contacts) => {
  await connection.query(
    `INSERT INTO public_facilities
     (facility_key, department_id, name, description, address, image_path, sort_order, is_active)
     VALUES (?, (SELECT id FROM departments WHERE code=? LIMIT 1), ?, ?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE department_id=VALUES(department_id), name=VALUES(name),
       description=VALUES(description), address=VALUES(address), image_path=VALUES(image_path),
       sort_order=VALUES(sort_order)`,
    [facility.key, facility.departmentCode, facility.name, facility.description || null,
      facility.address || null, facility.imagePath, facility.order],
  );
  const [[row]] = await connection.query(`SELECT id FROM public_facilities WHERE facility_key=?`, [facility.key]);
  for (const contact of contacts) {
    await connection.query(
      `INSERT INTO facility_public_contacts
       (facility_id, contact_key, contact_type, label, display_value, link_value, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE contact_type=VALUES(contact_type), label=VALUES(label),
         display_value=VALUES(display_value), link_value=VALUES(link_value), sort_order=VALUES(sort_order)`,
      [row.id, ...contact],
    );
  }
};

const run = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
  });
  try {
    await ensureColumn(connection, "departments", "public_display_name", "VARCHAR(160) NULL AFTER name");
    await ensureColumn(connection, "departments", "public_address", "VARCHAR(500) NULL AFTER public_display_name");
    await ensureColumn(connection, "departments", "public_summary", "TEXT NULL AFTER public_address");
    await ensureColumn(connection, "departments", "public_icon_key", "VARCHAR(40) NULL AFTER public_summary");
    await ensureColumn(connection, "departments", "public_sort_order", "INT NOT NULL DEFAULT 100 AFTER public_icon_key");
    await ensureColumn(connection, "departments", "show_in_public_directory", "TINYINT(1) NOT NULL DEFAULT 0 AFTER public_sort_order");

    await connection.query(`CREATE TABLE IF NOT EXISTS department_public_contacts (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      department_id INT UNSIGNED NOT NULL,
      contact_key VARCHAR(60) NOT NULL,
      contact_type VARCHAR(20) NOT NULL,
      label VARCHAR(80) NOT NULL,
      display_value VARCHAR(190) NOT NULL,
      link_value VARCHAR(500) NULL,
      sort_order INT NOT NULL DEFAULT 100,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_department_contact (department_id, contact_key),
      KEY idx_department_public_contacts (department_id, is_active, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await connection.query(`CREATE TABLE IF NOT EXISTS public_facilities (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      facility_key VARCHAR(80) NOT NULL,
      department_id INT UNSIGNED NULL,
      name VARCHAR(180) NOT NULL,
      description TEXT NULL,
      address VARCHAR(500) NULL,
      image_path VARCHAR(500) NULL,
      sort_order INT NOT NULL DEFAULT 100,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_facility_key (facility_key),
      KEY idx_public_facilities (is_active, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await connection.query(`CREATE TABLE IF NOT EXISTS facility_public_contacts (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      facility_id BIGINT UNSIGNED NOT NULL,
      contact_key VARCHAR(60) NOT NULL,
      contact_type VARCHAR(20) NOT NULL,
      label VARCHAR(80) NOT NULL,
      display_value VARCHAR(190) NOT NULL,
      link_value VARCHAR(500) NULL,
      sort_order INT NOT NULL DEFAULT 100,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_facility_contact (facility_id, contact_key),
      KEY idx_facility_public_contacts (facility_id, is_active, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await connection.query(`CREATE TABLE IF NOT EXISTS public_social_links (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      platform_key VARCHAR(40) NOT NULL,
      label VARCHAR(80) NOT NULL,
      url VARCHAR(500) NULL,
      sort_order INT NOT NULL DEFAULT 100,
      is_active TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_social_platform (platform_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    await ensureForeignKeys(connection, [
      ["fk_department_public_contact_department", "department_public_contacts", "department_id", "departments", "id"],
      ["fk_public_facility_department", "public_facilities", "department_id", "departments", "id"],
      ["fk_facility_public_contact_facility", "facility_public_contacts", "facility_id", "public_facilities", "id"],
    ]);

    const departments = [
      ["MHQ", { name: "Ministry of Human Development Headquarters", address: "West Block, Independence Plaza, Belmopan, Belize", icon: "building", order: 10 }, [["phone", "phone", "Telephone", "(501) 822-2161", "+5018222161", 10], ["email", "email", "Email", "senior.secretary@humandev.gov.bz", "senior.secretary@humandev.gov.bz", 20]]],
      ["CR", { name: "Community Rehabilitation Department", address: "The Hub, Chetumal Boulevard, Belize City, Belize", icon: "people_group", order: 20 }, [["phone", "phone", "Telephone", "(501) 223-2716 / 4003 / 3992", "+5012232716", 10], ["email", "email", "Email", "secretary.crd@humandev.gov.bz", "secretary.crd@humandev.gov.bz", 20]]],
      ["HS", { name: "Department of Human Services", address: "40 Regent Street, Belize City, Belize", icon: "hands_helping", order: 30 }, [["phone", "phone", "Telephone", "(501) 227-7451 / 2057", "+5012277451", 10], ["email", "email", "Email", "secretary.hsd@humandev.gov.bz", "secretary.hsd@humandev.gov.bz", 20]]],
      ["FSAGA", { name: "Family Support & Gender Affairs Department", address: "#26 Albert Street, Belize City, Belize", icon: "heart", order: 40 }, [["phone", "phone", "Telephone", "(501) 227-7397 / 3888", "+5012277397", 10], ["email", "email", "Email", "secretary.wfsd@humandev.gov.bz", "secretary.wfsd@humandev.gov.bz", 20]]],
      ["PP", { name: "Policy and Planning Unit", address: "West Block, Independence Plaza, Belmopan, Belize", icon: "chart_line", order: 50 }, [["email", "email", "Email", "secretary.ppu@humandev.gov.bz", "secretary.ppu@humandev.gov.bz", 10]]],
    ];
    for (const department of departments) await seedDepartment(connection, ...department);

    const facilities = [
      [{ key: "golden_haven", departmentCode: "FSAGA", name: "Golden Haven Rest Home", address: "Mile 16, George Price Highway, Hattieville, Belize District", imagePath: "/assets/images/golden-haven.png", order: 10 }, [["phone", "phone", "Telephone", "(501) 205-6079", "+5012056079", 10]]],
      [{ key: "good_samaritan", departmentCode: "FSAGA", name: "Good Samaritan Homeless Shelter", description: "Temporary shelter and reintegration support for homeless and displaced persons.", imagePath: "/assets/images/homeless-shelter.png", order: 20 }, []],
      [{ key: "belize_community_counselling", departmentCode: "CR", name: "Belize Community Counselling Centre", address: "The Hub, Chetumal Boulevard, Belize City, Belize", imagePath: "/assets/images/counselling-centre.png", order: 30 }, [["phone", "phone", "Telephone", "(501) 223-1406", "+5012231406", 10], ["email", "email", "Email", "recept.bcccc.crd@humandev.gov.bz", "recept.bcccc.crd@humandev.gov.bz", 20]]],
      [{ key: "dorothy_menzies", departmentCode: "HS", name: "Dorothy Menzies Child Care Centre", address: "Corner St. Thomas and 19th Street, Belize City, Belize", imagePath: "/assets/images/child-care-centre.png", order: 40 }, [["phone", "phone", "Telephone", "(501) 203-5225", "+5012035225", 10], ["email", "email", "Email", "fostermother.dmccc@humandev.gov.bz", "fostermother.dmccc@humandev.gov.bz", 20]]],
      [{ key: "new_beginnings", departmentCode: "CR", name: "New Beginnings Youth Development Center", address: "21 1/2 Miles, George Price Highway, Rockville, Belize District, Belize", imagePath: "/assets/images/youth-development-center.png", order: 50 }, [["phone", "phone", "Telephone", "(501) 245-8577", "+5012458577", 10]]],
    ];
    for (const facility of facilities) await seedFacility(connection, ...facility);

    for (const [key, label, order] of [["facebook", "Facebook", 10], ["x", "X", 20], ["instagram", "Instagram", 30], ["youtube", "YouTube", 40]]) {
      await connection.query(
        `INSERT INTO public_social_links (platform_key, label, sort_order, is_active)
         VALUES (?, ?, ?, 0) ON DUPLICATE KEY UPDATE label=VALUES(label), sort_order=VALUES(sort_order)`,
        [key, label, order],
      );
    }
    await connection.query(
      `INSERT IGNORE INTO system_settings
       (setting_group, setting_key, setting_value, value_type, is_public, is_encrypted)
       VALUES ('organization', 'organization.officialPhoneLabel', '24/7 Emergency & Social Services Hotline', 'string', 1, 0)`,
    );
    console.log("Site directory migration completed successfully.");
  } finally { await connection.end(); }
};

if (require.main === module) run().catch((error) => {
  console.error("Site directory migration failed:", error.message);
  process.exit(1);
});

module.exports = { ensureColumn, run, seedDepartment, seedFacility };
