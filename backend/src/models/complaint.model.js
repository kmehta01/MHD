const db = require("../config/db");

const DEFAULT_TOKEN_PREFIX = "GRM";

const getTokenPrefix = () => {
  const prefix = String(process.env.COMPLAINT_TOKEN_PREFIX || DEFAULT_TOKEN_PREFIX)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);

  return prefix || DEFAULT_TOKEN_PREFIX;
};

const getBelizeDateParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Belize",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);

  return {
    year: parts.find((part) => part.type === "year")?.value,
    month: parts.find((part) => part.type === "month")?.value,
  };
};

const buildComplaintToken = ({
  date = new Date(),
  prefix = getTokenPrefix(),
  sequence = 1,
} = {}) => {
  const { year, month } = getBelizeDateParts(date);
  return `${prefix}-${year}-${month}-${String(sequence).padStart(4, "0")}`;
};

const assignComplaintToken = async (connection, complaintId) => {
  const date = new Date();
  const { year, month } = getBelizeDateParts(date);
  const period = `${year}-${month}`;

  await connection.query(
    `INSERT IGNORE INTO complaint_reference_sequences
     (period, last_number)
     VALUES (?, 0)`,
    [period],
  );

  const [rows] = await connection.query(
    `SELECT last_number
     FROM complaint_reference_sequences
     WHERE period = ?
     FOR UPDATE`,
    [period],
  );

  const sequence = Number(rows[0]?.last_number || 0) + 1;
  const tokenNumber = buildComplaintToken({ date, sequence });

  await connection.query(
    `UPDATE complaint_reference_sequences
     SET last_number = ?
     WHERE period = ?`,
    [sequence, period],
  );

  await connection.query(
    `UPDATE complaints SET token_number = ? WHERE id = ?`,
    [tokenNumber, complaintId],
  );

  return tokenNumber;
};

const normalizeLimit = (value, fallback = 25) =>
  Math.min(100, Math.max(1, Number.parseInt(value, 10) || fallback));

const normalizePage = (value) =>
  Math.max(1, Number.parseInt(value, 10) || 1);

const createWithAttachments = async ({ complaint, attachments }) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const grievance = complaint.grievanceData || {};
    const office = complaint.officeData || {};
    const [result] = await connection.query(`INSERT INTO complaints SET ?`, [
      {
        ticket_priority: complaint.ticketPriority,
        incident_date: complaint.incidentDate,
        due_at: new Date(
          Date.now() +
            Math.max(
              1,
              Number.parseInt(
                process.env.DEFAULT_GRIEVANCE_DUE_DAYS || "10",
                10,
              ) || 10,
            ) *
              24 *
              60 *
              60 *
              1000,
        ),
        assistance: grievance.assistance?.[0] || null,
        assistance_other: grievance.assistance_other,
        submission_type: grievance.submission_type || "named",
        comp_name: grievance.comp_name,
        comp_phone: grievance.comp_phone,
        comp_phone_digits: complaint.phoneNumberDigits || null,
        comp_address: grievance.comp_address,
        comp_email: grievance.comp_email,
        contact_pref: grievance.contact_pref,
        on_behalf: grievance.on_behalf,
        affected_name: grievance.affected_name,
        relationship: grievance.relationship,
        permission: grievance.permission,
        issue_type: JSON.stringify(grievance.issue_type || []),
        issue_other: grievance.issue_other,
        channel: JSON.stringify(grievance.channel || []),
        incident_location: grievance.incident_location,
        description: grievance.description,
        desired_outcome: grievance.desired_outcome,
        tried_resolve: grievance.tried_resolve,
        prev_attempts: grievance.prev_attempts,
        has_documents: grievance.has_documents,
        has_witnesses: grievance.has_witnesses,
        witness_name: grievance.witness_name,
        witness_phone: grievance.witness_phone,
        accommodation: JSON.stringify(grievance.accommodation || []),
        accommodation_other: grievance.accommodation_other,
        declaration_confirm: grievance.declaration_confirm ? 1 : 0,
        signature: grievance.signature,
        declaration_date: grievance.declaration_date,
        intake_source: office.intakeSource || "public",
        office_received_at: office.receivedDate || null,
        office_received_by: office.receivedBy || null,
        office_initial_classification: office.initialClassification || null,
        office_assigned_to: office.assignedTo || null,
        created_by_admin_user_id: office.createdByAdminUserId || null,
        ip_address: complaint.ipAddress,
        user_agent: complaint.userAgent,
      },
    ]);

    const complaintId = result.insertId;
    const tokenNumber = await assignComplaintToken(connection, complaintId);

    for (const attachment of attachments) {
      await connection.query(
        `INSERT INTO complaint_attachments
         (complaint_id, original_name, stored_name, mime_type, file_size, storage_path)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          complaintId,
          attachment.originalName,
          attachment.storedName,
          attachment.mimeType,
          attachment.fileSize,
          attachment.storagePath,
        ],
      );
    }

    await connection.commit();

    return {
      id: complaintId,
      tokenNumber,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const buildFilters = (
  {
    search,
    status,
    priority,
    assignment,
    deadline,
    todayStart,
    tomorrowStart,
  },
  scope = { type: "all", departmentId: null },
) => {
  const conditions = [];
  const values = [];

  if (scope.type === "department") {
    conditions.push("c.assigned_department_id = ?");
    values.push(scope.departmentId);
  } else if (scope.type === "none") {
    conditions.push("1 = 0");
  }

  if (search) {
    const term = `%${search}%`;
    conditions.push(`(
      c.token_number LIKE ? OR c.comp_name LIKE ? OR c.comp_phone LIKE ? OR
      c.comp_email LIKE ? OR c.issue_other LIKE ? OR c.incident_location LIKE ? OR
      c.description LIKE ?
    )`);
    values.push(term, term, term, term, term, term, term);
  }

  if (status) {
    conditions.push("c.status = ?");
    values.push(status);
  }

  if (priority) {
    conditions.push("c.ticket_priority = ?");
    values.push(priority);
  }

  if (assignment === "assigned") {
    conditions.push("c.assigned_department_id IS NOT NULL");
  } else if (assignment === "unassigned") {
    conditions.push("c.assigned_department_id IS NULL");
  }

  if (deadline === "overdue") {
    conditions.push(
      "c.due_at < ? AND c.status NOT IN ('Resolved', 'Closed', 'Rejected', 'Duplicate')",
    );
    values.push(todayStart);
  } else if (deadline === "due_today") {
    conditions.push(
      "c.due_at >= ? AND c.due_at < ? AND c.status NOT IN ('Resolved', 'Closed', 'Rejected', 'Duplicate')",
    );
    values.push(todayStart, tomorrowStart);
  }

  return {
    clause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    values,
  };
};

const findAll = async (filters, pagination) => {
  const page = normalizePage(pagination.page);
  const perPage = normalizeLimit(pagination.perPage);
  const offset = (page - 1) * perPage;
  const { clause, values } = buildFilters(
    filters,
    pagination.scope || { type: "all", departmentId: null },
  );

  const [rows] = await db.query(
    `SELECT
      c.id, c.token_number, c.assigned_department_id, c.ticket_priority,
      c.status, c.submission_type, c.comp_name, c.comp_phone, c.comp_email,
      c.issue_type, c.issue_other, c.incident_location,
      c.created_at, c.updated_at, d.name AS assigned_department_name
     FROM complaints c
     LEFT JOIN departments d ON d.id = c.assigned_department_id
     ${clause}
     ORDER BY c.created_at DESC, c.id DESC
     LIMIT ? OFFSET ?`,
    [...values, perPage, offset],
  );

  const [counts] = await db.query(
    `SELECT COUNT(*) AS total FROM complaints c ${clause}`,
    values,
  );

  return {
    rows,
    pagination: {
      page,
      per_page: perPage,
      total: Number(counts[0]?.total || 0),
      total_pages: Math.max(1, Math.ceil(Number(counts[0]?.total || 0) / perPage)),
    },
  };
};

const findNotifications = async ({
  afterId = 0,
  limit = 5,
  scope = { type: "all", departmentId: null },
} = {}) => {
  const normalizedAfterId = Math.max(0, Number.parseInt(afterId, 10) || 0);
  const normalizedLimit = Math.min(
    10,
    Math.max(1, Number.parseInt(limit, 10) || 5),
  );

  const { clause, values } = buildFilters({}, scope);
  const [rows] = await db.query(
    `SELECT
      c.id, c.token_number, c.assigned_department_id, c.issue_type,
      c.issue_other, c.submission_type, c.comp_name, c.incident_location,
      c.status, c.created_at, d.name AS assigned_department_name
     FROM complaints c
     LEFT JOIN departments d ON d.id = c.assigned_department_id
     ${clause}
     ORDER BY c.created_at DESC, c.id DESC
     LIMIT ?`,
    [...values, normalizedLimit],
  );

  const unreadConditions =
    scope.type === "department"
      ? "WHERE c.assigned_department_id = ? AND c.id > ?"
      : scope.type === "none"
        ? "WHERE 1 = 0 AND c.id > ?"
        : "WHERE c.id > ?";
  const unreadValues =
    scope.type === "department"
      ? [scope.departmentId, normalizedAfterId]
      : [normalizedAfterId];

  const [counts] = await db.query(
    `SELECT COUNT(*) AS unread_count
     FROM complaints c
     ${unreadConditions}`,
    unreadValues,
  );

  return {
    rows,
    unreadCount: Number(counts[0]?.unread_count || 0),
    latestId: Number(rows[0]?.id || normalizedAfterId),
  };
};

const findById = async (
  id,
  scope = { type: "all", departmentId: null },
) => {
  const { clause, values } = buildFilters({}, scope);
  const idClause = clause
    ? `${clause} AND c.id = ?`
    : "WHERE c.id = ?";
  const [complaints] = await db.query(
    `SELECT
      c.id, c.token_number, c.assigned_department_id, c.ticket_priority,
      c.incident_date, c.status, c.assistance, c.assistance_other,
      c.submission_type, c.comp_name, c.comp_phone, c.comp_phone_digits,
      c.comp_address, c.comp_email, c.contact_pref, c.on_behalf,
      c.affected_name, c.relationship, c.permission, c.issue_type,
      c.issue_other, c.channel, c.incident_location, c.description,
      c.desired_outcome, c.tried_resolve, c.prev_attempts, c.has_documents,
      c.has_witnesses, c.witness_name, c.witness_phone, c.accommodation,
      c.accommodation_other, c.declaration_confirm, c.signature,
      c.declaration_date, c.intake_source, c.office_received_at,
      c.office_received_by, c.office_initial_classification,
      c.office_assigned_to, c.created_by_admin_user_id,
      c.created_at, c.updated_at,
      d.name AS assigned_department_name
     FROM complaints c
     LEFT JOIN departments d ON d.id = c.assigned_department_id
     ${idClause}
     LIMIT 1`,
    [...values, id],
  );

  if (!complaints[0]) return null;

  const [attachments] = await db.query(
    `SELECT id, original_name, mime_type, file_size, uploaded_at
     FROM complaint_attachments
     WHERE complaint_id = ?
     ORDER BY id ASC`,
    [id],
  );

  return {
    ...complaints[0],
    attachments,
  };
};

const findByToken = async (tokenNumber) => {
  const [complaints] = await db.query(
    `SELECT
      id, token_number, ticket_priority, status, submission_type,
      comp_name, comp_phone_digits, comp_address, comp_email,
      issue_type, issue_other, incident_location,
      created_at, updated_at
     FROM complaints
     WHERE token_number = ?
     LIMIT 1`,
    [tokenNumber],
  );

  return complaints[0] || null;
};

const findAttachment = async ({
  complaintId,
  attachmentId,
  scope = { type: "all", departmentId: null },
}) => {
  const conditions = [
    "attachment.id = ?",
    "attachment.complaint_id = ?",
  ];
  const values = [attachmentId, complaintId];

  if (scope.type === "department") {
    conditions.push("complaint.assigned_department_id = ?");
    values.push(scope.departmentId);
  } else if (scope.type === "none") {
    conditions.push("1 = 0");
  }

  const [attachments] = await db.query(
    `SELECT
       attachment.id, attachment.complaint_id, attachment.original_name,
       attachment.mime_type, attachment.file_size, attachment.storage_path
     FROM complaint_attachments attachment
     JOIN complaints complaint ON complaint.id = attachment.complaint_id
     WHERE ${conditions.join(" AND ")}
     LIMIT 1`,
    values,
  );

  return attachments[0] || null;
};

module.exports = {
  buildComplaintToken,
  createWithAttachments,
  findAll,
  findAttachment,
  findById,
  findByToken,
  findNotifications,
};
