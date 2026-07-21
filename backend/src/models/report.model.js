const db = require("../config/db");

const create = async (job) => {
  await db.query(
    `INSERT INTO report_jobs (id, requested_by, report_type, output_format, filters, settings_snapshot)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [job.id, job.requestedBy, job.reportType, job.outputFormat,
      JSON.stringify(job.filters || {}), JSON.stringify(job.settingsSnapshot)],
  );
  return job.id;
};

const findById = async (id) => {
  const [rows] = await db.query(`SELECT * FROM report_jobs WHERE id=? LIMIT 1`, [id]);
  return rows[0] || null;
};

const listForUser = async ({ userId, all = false }) => {
  const [rows] = await db.query(
    `SELECT id, requested_by, report_type, output_format, status, total_records,
            output_name, mime_type, error_message, completed_at, created_at
     FROM report_jobs ${all ? "" : "WHERE requested_by=?"} ORDER BY created_at DESC LIMIT 100`,
    all ? [] : [userId],
  );
  return rows;
};

const claimNext = async () => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT * FROM report_jobs
       WHERE status='pending' OR (status='processing' AND processing_started_at<DATE_SUB(NOW(), INTERVAL 30 MINUTE))
       ORDER BY created_at LIMIT 1 FOR UPDATE`,
    );
    const job = rows[0];
    if (!job) { await connection.commit(); return null; }
    await connection.query(`UPDATE report_jobs SET status='processing', processing_started_at=NOW(), error_message=NULL WHERE id=?`, [job.id]);
    await connection.commit();
    return job;
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
};

const complete = async ({ id, totalRecords, outputPath, outputName, mimeType }) =>
  db.query(
    `UPDATE report_jobs SET status='completed', total_records=?, output_path=?, output_name=?, mime_type=?, completed_at=NOW() WHERE id=?`,
    [totalRecords, outputPath, outputName, mimeType, id],
  );

const fail = async (id, message) =>
  db.query(`UPDATE report_jobs SET status='failed', error_message=?, completed_at=NOW() WHERE id=?`, [String(message || "Report generation failed").slice(0, 5000), id]);

const loadRows = async ({ filters, maximumRecords }) => {
  const conditions = [];
  const values = [];
  if (filters.departmentId) { conditions.push("c.assigned_department_id=?"); values.push(filters.departmentId); }
  if (filters.statusId) { conditions.push("c.status_id=?"); values.push(filters.statusId); }
  if (filters.priorityId) { conditions.push("c.priority_id=?"); values.push(filters.priorityId); }
  if (filters.dateFrom) { conditions.push("c.created_at>=?"); values.push(`${filters.dateFrom} 00:00:00`); }
  if (filters.dateTo) { conditions.push("c.created_at<?"); values.push(`${filters.dateTo} 23:59:59`); }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [rows] = await db.query(
    `SELECT c.token_number, s.name AS status, p.name AS ticket_priority, c.created_at, c.updated_at,
            c.due_at, c.resolved_at, c.closed_at, c.comp_name, c.comp_phone,
            c.comp_email, c.identification_number_last4, c.submission_type,
            c.issue_other, c.incident_location, c.description,
            d.name AS assigned_department_name, cc.name AS category_name, cl.name AS location_name
     FROM complaints c LEFT JOIN departments d ON d.id=c.assigned_department_id
     LEFT JOIN complaint_categories cc ON cc.id=c.category_id
     LEFT JOIN complaint_locations cl ON cl.id=c.location_id
     JOIN complaint_statuses s ON s.id=c.status_id
     JOIN complaint_priorities p ON p.id=c.priority_id
     ${where} ORDER BY c.created_at DESC, c.id DESC LIMIT ?`,
    [...values, maximumRecords],
  );
  return rows;
};

const getRequestedBy = async (id) => {
  const [rows] = await db.query(`SELECT id, name, email FROM admin_users WHERE id=? LIMIT 1`, [id]);
  return rows[0] || null;
};

module.exports = { claimNext, complete, create, fail, findById, getRequestedBy, listForUser, loadRows };
