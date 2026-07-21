const db = require("../config/db");

const withTransaction = async (operation) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const result = await operation(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const findState = async (complaintId, executor = db, lock = false) => {
  const [rows] = await executor.query(
    `SELECT c.id, c.status_id, c.status, c.priority_id, c.ticket_priority,
            c.assigned_department_id, c.assigned_officer_id, c.due_at,
            c.resolved_at, c.closed_at, s.status_key, s.reporting_group, s.is_final
     FROM complaints c
     LEFT JOIN complaint_statuses s ON s.id=c.status_id
     WHERE c.id=? LIMIT 1${lock ? " FOR UPDATE" : ""}`,
    [complaintId],
  );
  return rows[0] || null;
};

const findStatus = async (statusRef, executor = db) => {
  const [rows] = await executor.query(
    `SELECT id, status_key, name, reporting_group, notification_event, is_final FROM complaint_statuses
     WHERE is_active=1 AND (id=? OR status_key=? OR name=?) LIMIT 1`,
    [Number(statusRef) || 0, String(statusRef || ""), String(statusRef || "")],
  );
  return rows[0] || null;
};

const findPriority = async (priorityRef, executor = db) => {
  const [rows] = await executor.query(
    `SELECT id, priority_key, name, is_high_priority FROM complaint_priorities
     WHERE is_active=1 AND (id=? OR priority_key=? OR name=?) LIMIT 1`,
    [Number(priorityRef) || 0, String(priorityRef || ""), String(priorityRef || "")],
  );
  return rows[0] || null;
};

const isTransitionAllowed = async (fromStatusId, toStatusId, executor = db) => {
  const [rows] = await executor.query(
    `SELECT id FROM workflow_transitions WHERE from_status_id=? AND to_status_id=? AND is_active=1 LIMIT 1`,
    [fromStatusId, toStatusId],
  );
  return Boolean(rows[0]);
};

const assignmentTargetIsValid = async ({ departmentId, officerId }, executor = db) => {
  const [departments] = await executor.query(`SELECT id FROM departments WHERE id=? AND is_active=1 LIMIT 1`, [departmentId]);
  if (!departments[0]) return false;
  if (!officerId) return true;
  const [officers] = await executor.query(
    `SELECT id FROM admin_users WHERE id=? AND department_id=? AND status='active' LIMIT 1`,
    [officerId, departmentId],
  );
  return Boolean(officers[0]);
};

const assign = async ({ complaintId, departmentId, officerId, priorityRef, note, actorId, source = "manual" }) =>
  withTransaction(async (connection) => {
    const state = await findState(complaintId, connection, true);
    if (!state) return null;
    if (!await assignmentTargetIsValid({ departmentId, officerId }, connection)) {
      throw Object.assign(new Error("The department or officer assignment is invalid"), { statusCode: 400 });
    }
    const priority = priorityRef ? await findPriority(priorityRef, connection) : null;
    if (priorityRef && !priority) throw Object.assign(new Error("Invalid grievance priority"), { statusCode: 400 });
    await connection.query(
      `UPDATE complaints SET assigned_department_id=?, assigned_officer_id=?,
       priority_id=COALESCE(?, priority_id), ticket_priority=COALESCE(?, ticket_priority)
       WHERE id=?`,
      [departmentId, officerId || null, priority?.id || null, priority?.name || null, complaintId],
    );
    await connection.query(
      `INSERT INTO complaint_assignment_history
       (complaint_id, from_department_id, to_department_id, assigned_officer_id, note, assigned_by, assignment_source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [complaintId, state.assigned_department_id, departmentId, officerId || null, note || null, actorId, source],
    );
    return { ...state, assignedDepartmentId: departmentId, assignedOfficerId: officerId || null, priority: priority?.name || state.ticket_priority };
  });

const transition = async ({ complaintId, toStatusRef, comment, actorId, resolutionSummary = null, attachments = [] }) =>
  withTransaction(async (connection) => {
    const state = await findState(complaintId, connection, true);
    if (!state) return null;
    const fromStatus = state.status_id ? await findStatus(state.status_id, connection) : await findStatus(state.status, connection);
    const toStatus = await findStatus(toStatusRef, connection);
    if (!fromStatus || !toStatus) throw Object.assign(new Error("The grievance status is invalid"), { statusCode: 400 });
    if (fromStatus.id === toStatus.id) throw Object.assign(new Error("The grievance is already in that status"), { statusCode: 409 });
    if (!await isTransitionAllowed(fromStatus.id, toStatus.id, connection)) {
      throw Object.assign(new Error(`Transition from ${fromStatus.name} to ${toStatus.name} is not allowed`), { statusCode: 409 });
    }
    const resolvedAt = toStatus.reporting_group === "resolved" ? new Date() : null;
    const closedAt = toStatus.reporting_group === "closed" ? new Date() : null;
    await connection.query(
      `UPDATE complaints SET status_id=?, status=?,
       resolved_at=CASE WHEN ? IS NOT NULL THEN ? WHEN ?='open' THEN NULL ELSE resolved_at END,
       closed_at=CASE WHEN ? IS NOT NULL THEN ? WHEN ?='open' THEN NULL ELSE closed_at END,
       resolution_summary=COALESCE(?, resolution_summary)
       WHERE id=?`,
      [toStatus.id, toStatus.name, resolvedAt, resolvedAt, toStatus.reporting_group,
        closedAt, closedAt, toStatus.reporting_group, resolutionSummary, complaintId],
    );
    await connection.query(
      `INSERT INTO complaint_status_history (complaint_id, from_status_id, to_status_id, comment, changed_by)
       VALUES (?, ?, ?, ?, ?)`,
      [complaintId, fromStatus.id, toStatus.id, comment || null, actorId],
    );
    for (const attachment of attachments) {
      await connection.query(
        `INSERT INTO complaint_resolution_documents
         (complaint_id, original_name, stored_name, mime_type, file_size, storage_path, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [complaintId, attachment.originalName, attachment.storedName, attachment.mimeType,
          attachment.fileSize, attachment.storagePath, actorId],
      );
    }
    return { fromStatus, toStatus };
  });

const addInternalComment = async ({ complaintId, comment, actorId }) => {
  const [result] = await db.query(
    `INSERT INTO complaint_internal_comments (complaint_id, comment, created_by) VALUES (?, ?, ?)`,
    [complaintId, comment, actorId],
  );
  return result.insertId;
};

const requestReassignment = async ({ complaintId, departmentId, reason, actorId }) => {
  const [result] = await db.query(
    `INSERT INTO complaint_reassignment_requests (complaint_id, requested_department_id, reason, requested_by)
     VALUES (?, ?, ?, ?)`, [complaintId, departmentId, reason, actorId],
  );
  return result.insertId;
};

const decideReassignment = async ({ requestId, approved, note, actorId, officerId = null }) =>
  withTransaction(async (connection) => {
    const [requests] = await connection.query(
      `SELECT * FROM complaint_reassignment_requests WHERE id=? FOR UPDATE`, [requestId],
    );
    const request = requests[0];
    if (!request) return null;
    if (request.status !== "pending") throw Object.assign(new Error("This reassignment request has already been decided"), { statusCode: 409 });
    const state = await findState(request.complaint_id, connection, true);
    if (approved && !await assignmentTargetIsValid({ departmentId: request.requested_department_id, officerId }, connection)) {
      throw Object.assign(new Error("The department or officer assignment is invalid"), { statusCode: 400 });
    }
    await connection.query(
      `UPDATE complaint_reassignment_requests SET status=?, decided_by=?, decision_note=?, decided_at=NOW() WHERE id=?`,
      [approved ? "approved" : "rejected", actorId, note || null, requestId],
    );
    if (approved) {
      await connection.query(`UPDATE complaints SET assigned_department_id=?, assigned_officer_id=? WHERE id=?`, [request.requested_department_id, officerId, request.complaint_id]);
      await connection.query(
        `INSERT INTO complaint_assignment_history
         (complaint_id, from_department_id, to_department_id, assigned_officer_id, note, assigned_by, assignment_source)
         VALUES (?, ?, ?, ?, ?, ?, 'reassignment')`,
        [request.complaint_id, state.assigned_department_id, request.requested_department_id, officerId, note || request.reason, actorId],
      );
    }
    return { request, approved };
  });

const requestDueDateExtension = async ({ complaintId, requestedDueAt, reason, actorId }) => {
  const [result] = await db.query(
    `INSERT INTO due_date_extension_requests (complaint_id, requested_due_at, reason, requested_by)
     VALUES (?, ?, ?, ?)`, [complaintId, requestedDueAt, reason, actorId],
  );
  return result.insertId;
};

const findDueDateExtensionRequest = async (requestId) => {
  const [rows] = await db.query(
    `SELECT * FROM due_date_extension_requests WHERE id=? LIMIT 1`,
    [requestId],
  );
  return rows[0] || null;
};

const decideDueDateExtension = async ({ requestId, approved, note, actorId }) =>
  withTransaction(async (connection) => {
    const [requests] = await connection.query(`SELECT * FROM due_date_extension_requests WHERE id=? FOR UPDATE`, [requestId]);
    const request = requests[0];
    if (!request) return null;
    if (request.status !== "pending") throw Object.assign(new Error("This due-date request has already been decided"), { statusCode: 409 });
    await connection.query(
      `UPDATE due_date_extension_requests SET status=?, decided_by=?, decision_note=?, decided_at=NOW() WHERE id=?`,
      [approved ? "approved" : "rejected", actorId, note || null, requestId],
    );
    if (approved) await connection.query(
      `UPDATE complaints SET due_at=?, overdue_at=NULL, is_escalated=0 WHERE id=?`,
      [request.requested_due_at, request.complaint_id],
    );
    return { request, approved };
  });

const updateDueDate = async ({ complaintId, dueAt }) => {
  const [result] = await db.query(
    `UPDATE complaints SET due_at=?, overdue_at=NULL, is_escalated=0 WHERE id=?`,
    [dueAt, complaintId],
  );
  return result.affectedRows;
};

const getLifecycle = async (complaintId) => {
  const [[statusHistory], [assignmentHistory], [comments], [reassignmentRequests], [dueDateRequests], [documents]] = await Promise.all([
    db.query(`SELECT h.id, fs.name AS from_status, ts.name AS to_status, h.comment, h.changed_by, au.name AS changed_by_name, h.created_at
              FROM complaint_status_history h LEFT JOIN complaint_statuses fs ON fs.id=h.from_status_id
              JOIN complaint_statuses ts ON ts.id=h.to_status_id LEFT JOIN admin_users au ON au.id=h.changed_by
              WHERE h.complaint_id=? ORDER BY h.created_at DESC, h.id DESC`, [complaintId]),
    db.query(`SELECT h.*, fd.name AS from_department, td.name AS to_department, au.name AS assigned_by_name
              FROM complaint_assignment_history h LEFT JOIN departments fd ON fd.id=h.from_department_id
              LEFT JOIN departments td ON td.id=h.to_department_id LEFT JOIN admin_users au ON au.id=h.assigned_by
              WHERE h.complaint_id=? ORDER BY h.created_at DESC, h.id DESC`, [complaintId]),
    db.query(`SELECT c.id, c.comment, c.created_at, au.name AS created_by_name FROM complaint_internal_comments c
              LEFT JOIN admin_users au ON au.id=c.created_by WHERE c.complaint_id=? ORDER BY c.created_at DESC, c.id DESC`, [complaintId]),
    db.query(`SELECT r.*, d.name AS requested_department, requester.name AS requested_by_name, decider.name AS decided_by_name
              FROM complaint_reassignment_requests r JOIN departments d ON d.id=r.requested_department_id
              LEFT JOIN admin_users requester ON requester.id=r.requested_by LEFT JOIN admin_users decider ON decider.id=r.decided_by
              WHERE r.complaint_id=? ORDER BY r.created_at DESC`, [complaintId]),
    db.query(`SELECT r.*, requester.name AS requested_by_name, decider.name AS decided_by_name
              FROM due_date_extension_requests r LEFT JOIN admin_users requester ON requester.id=r.requested_by
              LEFT JOIN admin_users decider ON decider.id=r.decided_by WHERE r.complaint_id=? ORDER BY r.created_at DESC`, [complaintId]),
    db.query(`SELECT id, original_name, mime_type, file_size, uploaded_at FROM complaint_resolution_documents WHERE complaint_id=? ORDER BY uploaded_at DESC`, [complaintId]),
  ]);
  return { statusHistory, assignmentHistory, comments, reassignmentRequests, dueDateRequests, resolutionDocuments: documents };
};

const findResolutionDocument = async ({ complaintId, documentId, scope }) => {
  const conditions = ["rd.id=?", "rd.complaint_id=?"];
  const values = [documentId, complaintId];
  if (scope.type === "department") { conditions.push("c.assigned_department_id=?"); values.push(scope.departmentId); }
  else if (scope.type === "none") conditions.push("1=0");
  const [rows] = await db.query(
    `SELECT rd.id, rd.original_name, rd.mime_type, rd.file_size, rd.storage_path
     FROM complaint_resolution_documents rd JOIN complaints c ON c.id=rd.complaint_id
     WHERE ${conditions.join(" AND ")} LIMIT 1`, values,
  );
  return rows[0] || null;
};

const listOpenForDueDateRecalculation = async (limit = 500) => {
  const [rows] = await db.query(
    `SELECT c.id, c.token_number, c.created_at, c.office_received_at,
            COALESCE(c.office_received_at, c.created_at) AS due_start_at,
            c.due_at, s.name AS status, s.status_key FROM complaints c
     JOIN complaint_statuses s ON s.id=c.status_id WHERE s.reporting_group='open' ORDER BY c.created_at, c.id LIMIT ?`,
    [Math.min(5000, Math.max(1, Number(limit) || 500))],
  );
  return rows;
};

const applyDueDateRecalculation = async (updates) => withTransaction(async (connection) => {
  for (const update of updates) {
    await connection.query(
      `UPDATE complaints SET due_at=?, overdue_at=NULL, is_escalated=0 WHERE id=?`,
      [update.dueAt, update.id],
    );
  }
  return updates.length;
});

module.exports = {
  addInternalComment, assign, decideDueDateExtension, decideReassignment, findState,
  applyDueDateRecalculation, findDueDateExtensionRequest, findResolutionDocument, findStatus,
  getLifecycle, listOpenForDueDateRecalculation,
  requestDueDateExtension, requestReassignment,
  transition, updateDueDate,
};
