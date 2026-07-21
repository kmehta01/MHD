const db = require("../config/db");

const listTemplates = async () => {
  const [rows] = await db.query(`SELECT * FROM notification_templates ORDER BY event_type, channel`);
  return rows;
};

const saveTemplate = async ({ id, eventType, channel, name, subjectTemplate, bodyTemplate, isActive }) => {
  if (id) {
    const [result] = await db.query(
      `UPDATE notification_templates SET event_type=?, channel=?, name=?, subject_template=?, body_template=?, is_active=? WHERE id=?`,
      [eventType, channel, name, subjectTemplate || null, bodyTemplate, isActive ? 1 : 0, id],
    );
    return result.affectedRows ? Number(id) : null;
  }
  const [result] = await db.query(
    `INSERT INTO notification_templates (event_type, channel, name, subject_template, body_template, is_active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [eventType, channel, name, subjectTemplate || null, bodyTemplate, isActive ? 1 : 0],
  );
  return result.insertId;
};

const findTemplate = async (eventType, channel, executor = db) => {
  const [rows] = await executor.query(
    `SELECT * FROM notification_templates WHERE event_type=? AND channel=? AND is_active=1 LIMIT 1`,
    [eventType, channel],
  );
  return rows[0] || null;
};

const findComplaintContext = async (complaintId) => {
  const [rows] = await db.query(
    `SELECT c.id, c.token_number, c.comp_name, c.comp_email, c.status, c.due_at,
            c.assigned_department_id, d.name AS department_name
     FROM complaints c LEFT JOIN departments d ON d.id=c.assigned_department_id
     WHERE c.id=? LIMIT 1`, [complaintId],
  );
  return rows[0] || null;
};

const findAdministratorRecipients = async ({ roleSlugs = [], departmentId = null }) => {
  const conditions = ["au.status='active'", "au.email IS NOT NULL"];
  const values = [];
  if (roleSlugs.length) {
    conditions.push(`r.slug IN (${roleSlugs.map(() => "?").join(",")})`);
    values.push(...roleSlugs);
  }
  if (departmentId) {
    conditions.push("au.department_id=?");
    values.push(departmentId);
  }
  const [rows] = await db.query(
    `SELECT DISTINCT au.id, au.name, au.email FROM admin_users au JOIN roles r ON r.id=au.role_id
     WHERE ${conditions.join(" AND ")} ORDER BY au.id`, values,
  );
  return rows;
};

const enqueue = async (item, executor = db) => {
  const [result] = await executor.query(
    `INSERT IGNORE INTO notification_outbox
     (idempotency_key, event_type, channel, complaint_id, admin_user_id, recipient_email, template_id, payload)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [item.idempotencyKey, item.eventType, item.channel, item.complaintId || null,
      item.adminUserId || null, item.recipientEmail || null, item.templateId || null,
      JSON.stringify(item.payload || {})],
  );
  return result.insertId || null;
};

const claimNext = async (owner) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT o.*, t.subject_template, t.body_template, t.name AS template_name
       FROM notification_outbox o LEFT JOIN notification_templates t ON t.id=o.template_id
       WHERE (o.status='pending' AND o.available_at<=NOW())
          OR (o.status='processing' AND o.processing_started_at<DATE_SUB(NOW(), INTERVAL 10 MINUTE))
       ORDER BY o.available_at, o.id LIMIT 1 FOR UPDATE`,
    );
    const item = rows[0];
    if (!item) { await connection.commit(); return null; }
    await connection.query(
      `UPDATE notification_outbox SET status='processing', processing_started_at=NOW(), attempts=attempts+1, last_error=NULL WHERE id=?`,
      [item.id],
    );
    await connection.commit();
    return { ...item, workerOwner: owner, attempts: Number(item.attempts) + 1 };
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
};

const complete = async (id) => db.query(`UPDATE notification_outbox SET status='sent', sent_at=NOW() WHERE id=?`, [id]);
const fail = async (id, message, attempts) => {
  const terminal = attempts >= 5;
  const delayMinutes = Math.min(60, 2 ** Math.max(0, attempts - 1));
  await db.query(
    `UPDATE notification_outbox SET status=?, last_error=?, available_at=DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id=?`,
    [terminal ? "failed" : "pending", String(message || "Delivery failed").slice(0, 5000), delayMinutes, id],
  );
};

const createDashboardNotification = async (item, title, message) => {
  await db.query(
    `INSERT IGNORE INTO admin_notifications
     (idempotency_key, admin_user_id, complaint_id, event_type, title, message)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [item.idempotency_key, item.admin_user_id, item.complaint_id, item.event_type, title, message],
  );
};

const listForUser = async ({ userId, page = 1, perPage = 20, unreadOnly = false }) => {
  const offset = (page - 1) * perPage;
  const unread = unreadOnly ? "AND n.read_at IS NULL" : "";
  const [rows] = await db.query(
    `SELECT n.id, n.complaint_id, n.event_type, n.title, n.message, n.read_at, n.created_at, c.token_number
     FROM admin_notifications n LEFT JOIN complaints c ON c.id=n.complaint_id
     WHERE n.admin_user_id=? ${unread} ORDER BY n.created_at DESC, n.id DESC LIMIT ? OFFSET ?`,
    [userId, perPage, offset],
  );
  const [counts] = await db.query(
    `SELECT COUNT(*) AS total, SUM(read_at IS NULL) AS unread FROM admin_notifications WHERE admin_user_id=?`, [userId],
  );
  return { rows, total: Number(counts[0]?.total || 0), unread: Number(counts[0]?.unread || 0) };
};

const markRead = async ({ id, userId }) => {
  const [result] = await db.query(`UPDATE admin_notifications SET read_at=COALESCE(read_at, NOW()) WHERE id=? AND admin_user_id=?`, [id, userId]);
  return result.affectedRows;
};

const markAllRead = async (userId) => {
  const [result] = await db.query(`UPDATE admin_notifications SET read_at=NOW() WHERE admin_user_id=? AND read_at IS NULL`, [userId]);
  return result.affectedRows;
};

module.exports = { claimNext, complete, createDashboardNotification, enqueue, fail, findAdministratorRecipients, findComplaintContext, findTemplate, listForUser, listTemplates, markAllRead, markRead, saveTemplate };
