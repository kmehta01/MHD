const db = require("../src/config/db");

const createComplaintTables = async (connection) => {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS complaints (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      token_number VARCHAR(32) NULL,
      assigned_department_id INT UNSIGNED NULL,
      ticket_priority ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL DEFAULT 'Medium',
      incident_date DATE NULL,
      status ENUM(
        'New',
        'Under Review',
        'In Progress',
        'Pending Information',
        'Resolved',
        'Closed',
        'Rejected',
        'Duplicate',
        'Returned'
      ) NOT NULL DEFAULT 'New',
      due_at DATETIME NULL,
      resolved_at DATETIME NULL,
      closed_at DATETIME NULL,
      assistance VARCHAR(80) NULL,
      assistance_other VARCHAR(500) NULL,
      submission_type ENUM('named', 'anonymous') NOT NULL DEFAULT 'named',
      comp_name VARCHAR(160) NULL,
      comp_phone VARCHAR(40) NULL,
      comp_phone_digits VARCHAR(32) NULL,
      comp_address TEXT NULL,
      comp_email VARCHAR(190) NULL,
      contact_pref ENUM('phone', 'email', 'mail', 'in_person', 'whatsapp') NULL,
      on_behalf ENUM('yes', 'no') NULL,
      affected_name VARCHAR(160) NULL,
      relationship VARCHAR(160) NULL,
      permission ENUM('yes', 'no', 'not_applicable') NULL,
      issue_type JSON NULL,
      issue_other VARCHAR(255) NULL,
      channel JSON NULL,
      incident_location VARCHAR(255) NULL,
      description TEXT NULL,
      desired_outcome TEXT NULL,
      tried_resolve ENUM('yes', 'no') NULL,
      prev_attempts TEXT NULL,
      has_documents ENUM('yes', 'no') NULL,
      has_witnesses ENUM('yes', 'no') NULL,
      witness_name VARCHAR(160) NULL,
      witness_phone VARCHAR(40) NULL,
      accommodation JSON NULL,
      accommodation_other VARCHAR(500) NULL,
      declaration_confirm TINYINT(1) NOT NULL DEFAULT 0,
      signature VARCHAR(160) NULL,
      declaration_date DATE NULL,
      intake_source ENUM('public', 'walk_in') NOT NULL DEFAULT 'public',
      office_received_at DATETIME NULL,
      office_received_by VARCHAR(120) NULL,
      office_initial_classification ENUM('Level 1', 'Level 2', 'Level 3', 'Level 4') NULL,
      office_assigned_to VARCHAR(160) NULL,
      created_by_admin_user_id INT UNSIGNED NULL,
      ip_address VARCHAR(64) NULL,
      user_agent VARCHAR(512) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_complaints_token_number (token_number),
      KEY index_complaints_assigned_department (assigned_department_id),
      KEY index_complaints_status_created (status, created_at),
      KEY index_complaints_due_at (due_at),
      KEY index_complaints_resolved_at (resolved_at),
      KEY index_complaints_priority (ticket_priority),
      KEY index_complaints_submission_type (submission_type),
      KEY index_complaints_incident_date (incident_date),
      KEY index_complaints_declaration_date (declaration_date),
      KEY index_complaints_intake_source (intake_source),
      KEY index_complaints_created_by_admin (created_by_admin_user_id),
      KEY index_complaints_comp_phone_digits (comp_phone_digits)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const requiredColumns = [
    ["assigned_department_id", "INT UNSIGNED NULL AFTER token_number"],
    [
      "ticket_priority",
      "ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL DEFAULT 'Medium' AFTER assigned_department_id",
    ],
    ["incident_date", "DATE NULL AFTER ticket_priority"],
    [
      "status",
      "ENUM('New', 'Under Review', 'In Progress', 'Pending Information', 'Resolved', 'Closed', 'Rejected', 'Duplicate', 'Returned') NOT NULL DEFAULT 'New' AFTER incident_date",
    ],
    ["due_at", "DATETIME NULL AFTER status"],
    ["resolved_at", "DATETIME NULL AFTER due_at"],
    ["closed_at", "DATETIME NULL AFTER resolved_at"],
    ["assistance", "VARCHAR(80) NULL AFTER closed_at"],
    ["assistance_other", "VARCHAR(500) NULL AFTER assistance"],
    [
      "submission_type",
      "ENUM('named', 'anonymous') NOT NULL DEFAULT 'named' AFTER assistance_other",
    ],
    ["comp_name", "VARCHAR(160) NULL AFTER submission_type"],
    ["comp_phone", "VARCHAR(40) NULL AFTER comp_name"],
    ["comp_phone_digits", "VARCHAR(32) NULL AFTER comp_phone"],
    ["comp_address", "TEXT NULL AFTER comp_phone_digits"],
    ["comp_email", "VARCHAR(190) NULL AFTER comp_address"],
    ["identification_number_encrypted", "TEXT NULL AFTER comp_email"],
    ["identification_number_hash", "CHAR(64) NULL AFTER identification_number_encrypted"],
    ["identification_number_last4", "VARCHAR(4) NULL AFTER identification_number_hash"],
    [
      "contact_pref",
      "ENUM('phone', 'email', 'mail', 'in_person', 'whatsapp') NULL AFTER identification_number_last4",
    ],
    ["on_behalf", "ENUM('yes', 'no') NULL AFTER contact_pref"],
    ["affected_name", "VARCHAR(160) NULL AFTER on_behalf"],
    ["relationship", "VARCHAR(160) NULL AFTER affected_name"],
    [
      "permission",
      "ENUM('yes', 'no', 'not_applicable') NULL AFTER relationship",
    ],
    ["issue_type", "JSON NULL AFTER permission"],
    ["issue_other", "VARCHAR(255) NULL AFTER issue_type"],
    ["channel", "JSON NULL AFTER issue_other"],
    ["incident_location", "VARCHAR(255) NULL AFTER channel"],
    ["description", "TEXT NULL AFTER incident_location"],
    ["desired_outcome", "TEXT NULL AFTER description"],
    ["resolution_summary", "TEXT NULL AFTER desired_outcome"],
    ["tried_resolve", "ENUM('yes', 'no') NULL AFTER desired_outcome"],
    ["prev_attempts", "TEXT NULL AFTER tried_resolve"],
    ["has_documents", "ENUM('yes', 'no') NULL AFTER prev_attempts"],
    ["has_witnesses", "ENUM('yes', 'no') NULL AFTER has_documents"],
    ["witness_name", "VARCHAR(160) NULL AFTER has_witnesses"],
    ["witness_phone", "VARCHAR(40) NULL AFTER witness_name"],
    ["accommodation", "JSON NULL AFTER witness_phone"],
    ["accommodation_other", "VARCHAR(500) NULL AFTER accommodation"],
    [
      "declaration_confirm",
      "TINYINT(1) NOT NULL DEFAULT 0 AFTER accommodation_other",
    ],
    ["signature", "VARCHAR(160) NULL AFTER declaration_confirm"],
    ["declaration_date", "DATE NULL AFTER signature"],
    [
      "intake_source",
      "ENUM('public', 'walk_in') NOT NULL DEFAULT 'public' AFTER declaration_date",
    ],
    ["office_received_at", "DATETIME NULL AFTER intake_source"],
    ["office_received_by", "VARCHAR(120) NULL AFTER office_received_at"],
    [
      "office_initial_classification",
      "ENUM('Level 1', 'Level 2', 'Level 3', 'Level 4') NULL AFTER office_received_by",
    ],
    ["office_assigned_to", "VARCHAR(160) NULL AFTER office_initial_classification"],
    [
      "created_by_admin_user_id",
      "INT UNSIGNED NULL AFTER office_assigned_to",
    ],
    ["ip_address", "VARCHAR(64) NULL AFTER created_by_admin_user_id"],
    ["user_agent", "VARCHAR(512) NULL AFTER ip_address"],
    [
      "created_at",
      "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER user_agent",
    ],
    [
      "updated_at",
      "TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP AFTER created_at",
    ],
  ];

  for (const [column, definition] of requiredColumns) {
    const [existing] = await connection.query(
      `SELECT 1
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'complaints'
         AND COLUMN_NAME = ?
       LIMIT 1`,
      [column],
    );

    if (!existing.length) {
      await connection.query(
        `ALTER TABLE complaints ADD COLUMN \`${column}\` ${definition}`,
      );
    }
  }

  const [adminIdColumns] = await connection.query(
    `SELECT COLUMN_TYPE
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'admin_users'
       AND COLUMN_NAME = 'id'
     LIMIT 1`,
  );
  const adminIdIsUnsigned = String(
    adminIdColumns[0]?.COLUMN_TYPE || "",
  ).includes("unsigned");
  await connection.query(
    `ALTER TABLE complaints
     MODIFY COLUMN created_by_admin_user_id INT${
       adminIdIsUnsigned ? " UNSIGNED" : ""
     } NULL`,
  );

  await connection.query(`
    ALTER TABLE complaints
    MODIFY COLUMN ticket_priority ENUM('Low', 'Medium', 'High', 'Critical')
    NOT NULL DEFAULT 'Medium'
  `);

  await connection.query(`
    ALTER TABLE complaints
    MODIFY COLUMN status ENUM(
      'New',
      'In Review',
      'Under Review',
      'In Progress',
      'Pending Information',
      'Resolved',
      'Closed',
      'Rejected',
      'Duplicate',
      'Returned'
    ) NOT NULL DEFAULT 'New'
  `);

  await connection.query(
    `UPDATE complaints
     SET status = 'Under Review'
     WHERE status = 'In Review'`,
  );

  await connection.query(`
    ALTER TABLE complaints
    MODIFY COLUMN status ENUM(
      'New',
      'Under Review',
      'In Progress',
      'Pending Information',
      'Resolved',
      'Closed',
      'Rejected',
      'Duplicate',
      'Returned'
    ) NOT NULL DEFAULT 'New'
  `);

  await connection.query(`
    UPDATE complaints
    SET due_at = DATE_ADD(created_at, INTERVAL 10 DAY)
    WHERE due_at IS NULL
  `);

  await connection.query(`
    UPDATE complaints
    SET resolved_at = COALESCE(updated_at, created_at)
    WHERE status IN ('Resolved', 'Closed')
      AND resolved_at IS NULL
  `);

  await connection.query(`
    UPDATE complaints
    SET closed_at = COALESCE(updated_at, resolved_at, created_at)
    WHERE status = 'Closed'
      AND closed_at IS NULL
  `);

  const requiredIndexes = [
    [
      "unique_complaints_token_number",
      "UNIQUE KEY unique_complaints_token_number (token_number)",
    ],
    [
      "index_complaints_status_created",
      "KEY index_complaints_status_created (status, created_at)",
    ],
    [
      "index_complaints_assigned_department",
      "KEY index_complaints_assigned_department (assigned_department_id)",
    ],
    ["index_complaints_due_at", "KEY index_complaints_due_at (due_at)"],
    [
      "index_complaints_resolved_at",
      "KEY index_complaints_resolved_at (resolved_at)",
    ],
    ["index_complaints_priority", "KEY index_complaints_priority (ticket_priority)"],
    [
      "index_complaints_submission_type",
      "KEY index_complaints_submission_type (submission_type)",
    ],
    [
      "index_complaints_incident_date",
      "KEY index_complaints_incident_date (incident_date)",
    ],
    [
      "index_complaints_declaration_date",
      "KEY index_complaints_declaration_date (declaration_date)",
    ],
    [
      "index_complaints_intake_source",
      "KEY index_complaints_intake_source (intake_source)",
    ],
    [
      "index_complaints_created_by_admin",
      "KEY index_complaints_created_by_admin (created_by_admin_user_id)",
    ],
    [
      "index_complaints_comp_phone_digits",
      "KEY index_complaints_comp_phone_digits (comp_phone_digits)",
    ],
    [
      "index_complaints_identification_hash",
      "KEY index_complaints_identification_hash (identification_number_hash)",
    ],
  ];

  for (const [indexName, definition] of requiredIndexes) {
    const [existing] = await connection.query(
      `SELECT 1
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'complaints'
         AND INDEX_NAME = ?
       LIMIT 1`,
      [indexName],
    );

    if (!existing.length) {
      await connection.query(`ALTER TABLE complaints ADD ${definition}`);
    }
  }

  const [createdByForeignKey] = await connection.query(
    `SELECT 1
     FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'complaints'
       AND CONSTRAINT_NAME = 'fk_complaints_created_by_admin'
     LIMIT 1`,
  );
  if (!createdByForeignKey.length) {
    await connection.query(`
      ALTER TABLE complaints
      ADD CONSTRAINT fk_complaints_created_by_admin
      FOREIGN KEY (created_by_admin_user_id) REFERENCES admin_users (id)
      ON DELETE SET NULL
    `);
  }

  await connection.query(`
    CREATE TABLE IF NOT EXISTS complaint_attachments (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      complaint_id BIGINT UNSIGNED NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      stored_name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(120) NOT NULL,
      file_size INT UNSIGNED NOT NULL,
      storage_path VARCHAR(500) NOT NULL,
      uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY index_complaint_attachments_complaint_id (complaint_id),
      CONSTRAINT fk_complaint_attachments_complaint
        FOREIGN KEY (complaint_id) REFERENCES complaints (id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS complaint_reference_sequences (
      period CHAR(7) PRIMARY KEY,
      last_number INT UNSIGNED NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS public_holidays (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      holiday_date DATE NOT NULL,
      name VARCHAR(160) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_public_holiday_date (holiday_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

const run = async () => {
  const connection = await db.getConnection();
  try {
    const [masterColumns] = await connection.query(
      `SELECT 1 FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='complaints' AND COLUMN_NAME='status_id' LIMIT 1`,
    );
    if (masterColumns.length) {
      console.log("Complaint ticket migration already superseded by master-data schema; legacy enum conversion skipped.");
      return;
    }
    await createComplaintTables(connection);
    console.log("Complaint ticket migration complete.");
  } finally {
    connection.release();
    await db.end();
  }
};

run().catch((error) => {
  console.error("Complaint ticket migration failed:", error.message);
  process.exitCode = 1;
});
