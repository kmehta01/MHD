const crypto = require("crypto");
const path = require("path");
const db = require("../config/db");
const SettingsPolicy = require("./settings-policy.service");
const NotificationService = require("./notification.service");
const LifecycleModel = require("../models/lifecycle.model");
const ReportService = require("./report.service");
const AuditLogModel = require("../models/audit-log.model");
const { createPolicyCalendar } = require("./due-date.service");
const { unlinkGeneratedUpload } = require("../utils/safe-upload-file");

const owner = crypto.randomUUID();
const backendRoot = path.resolve(__dirname, "../..");
const uploadRoot = path.resolve(backendRoot, "uploads", "complaints");
const STORED_COMPLAINT_FILE_PATTERN = /^\d+-\d+\.(?:pdf|doc|docx|jpg|jpeg|png|xls|xlsx)$/;
let timer = null;
let running = false;

const acquireLease = async (leaseKey, seconds = 55) => {
  await db.query(
    `INSERT INTO background_job_leases (lease_key, lease_owner, locked_until)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))
     ON DUPLICATE KEY UPDATE
       lease_owner=IF(locked_until<NOW() OR lease_owner=VALUES(lease_owner), VALUES(lease_owner), lease_owner),
       locked_until=IF(locked_until<NOW() OR lease_owner=VALUES(lease_owner), VALUES(locked_until), locked_until)`,
    [leaseKey, owner, seconds],
  );
  const [rows] = await db.query(`SELECT lease_owner FROM background_job_leases WHERE lease_key=?`, [leaseKey]);
  return rows[0]?.lease_owner === owner;
};

const dueVersionKey = (value) => String(new Date(value).getTime());

const processNotificationOutbox = async () => {
  if (!await acquireLease("notification-outbox")) return;
  for (let count = 0; count < 50; count += 1) {
    if (!await NotificationService.processNext(owner)) break;
  }
};

const processReports = async () => {
  if (!await acquireLease("report-export", 300)) return;
  for (let count = 0; count < 5; count += 1) {
    if (!await ReportService.processNext()) break;
  }
};

const processDueDates = async (settings, {
  acquire = acquireLease,
  enqueue = NotificationService.enqueueComplaintEvent,
  query = (...args) => db.query(...args),
  now = new Date(),
  batchSize = 500,
} = {}) => {
  if (!settings.dueDate.dueDateRequired || !await acquire("due-date-policy")) return;
  const evaluatedAt = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(evaluatedAt.getTime())) throw new TypeError("Worker evaluation time is invalid");
  const calendar = await createPolicyCalendar({ settings, executor: { query } });
  const limit = Math.min(1000, Math.max(1, Number(batchSize) || 500));
  let cursor = 0;

  while (true) {
    const [complaints] = await query(
      `SELECT c.id, c.due_at
       FROM complaints c
       JOIN complaint_statuses s ON s.id=c.status_id
       WHERE c.due_at IS NOT NULL AND s.reporting_group='open' AND c.id>?
       ORDER BY c.id
       LIMIT ?`,
      [cursor, limit],
    );
    if (!complaints.length) break;

    for (const complaint of complaints) {
      const dueAt = new Date(complaint.due_at);
      if (Number.isNaN(dueAt.getTime())) continue;
      const version = dueVersionKey(dueAt);

      if (settings.notifications.notifyDueDateReminder && evaluatedAt < dueAt) {
        const reminderAt = calendar.calculateReminderAt(dueAt);
        if (evaluatedAt >= reminderAt) {
          await enqueue({
            eventType: "due_reminder", complaintId: complaint.id,
            eventKey: `due-reminder:${complaint.id}:${version}`,
          });
        }
      }

      if (settings.dueDate.automaticallyMarkOverdue && evaluatedAt > dueAt) {
        await query(
          `UPDATE complaints SET overdue_at=COALESCE(overdue_at, ?) WHERE id=?`,
          [evaluatedAt, complaint.id],
        );
        if (settings.notifications.notifyOverdueGrievance) {
          await enqueue({
            eventType: "overdue", complaintId: complaint.id,
            eventKey: `overdue:${complaint.id}:${version}`,
          });
        }
      }

      if (settings.dueDate.enableEscalation) {
        const escalationAt = calendar.calculateEscalationAt(dueAt);
        if (evaluatedAt >= escalationAt) {
          const escalationKey = `due:${version}:${settings.dueDate.escalateAfterDays}`;
          const [result] = await query(
            `INSERT IGNORE INTO complaint_escalations (complaint_id, escalation_key) VALUES (?, ?)`,
            [complaint.id, escalationKey],
          );
          if (result.affectedRows) {
            await query(`UPDATE complaints SET is_escalated=1 WHERE id=?`, [complaint.id]);
            if (settings.notifications.notifyOverdueGrievance) {
              await enqueue({
                eventType: "overdue", complaintId: complaint.id,
                eventKey: `escalation:${complaint.id}:${escalationKey}`,
              });
            }
          }
        }
      }
    }

    const nextCursor = Number(complaints[complaints.length - 1].id);
    if (complaints.length < limit || nextCursor <= cursor) break;
    cursor = nextCursor;
  }
};

const processAutoClose = async (settings) => {
  if (!settings.workflow.autoCloseResolvedGrievances || !await acquireLease("workflow-auto-close")) return;
  const [rows] = await db.query(
    `SELECT c.id FROM complaints c JOIN complaint_statuses s ON s.id=c.status_id
     WHERE s.reporting_group='resolved' AND c.resolved_at<=DATE_SUB(NOW(), INTERVAL ? DAY) LIMIT 200`,
    [settings.workflow.autoCloseAfterDays],
  );
  for (const complaint of rows) {
    try {
      await LifecycleModel.transition({
        complaintId: complaint.id, toStatusRef: "closed",
        comment: "Automatically closed according to General Settings policy", actorId: null,
      });
      await NotificationService.enqueueComplaintEvent({
        eventType: "closure", complaintId: complaint.id,
        eventKey: `auto-close:${complaint.id}`,
      });
    } catch (error) { console.error(`Auto-close failed for grievance ${complaint.id}:`, error.message); }
  }
};

const safeDeleteAttachment = async (storagePath) => {
  if (typeof storagePath !== "string") return false;
  const normalized = storagePath.replace(/\\/g, "/");
  const prefix = "uploads/complaints/";
  if (!normalized.startsWith(prefix)) return false;
  const filename = normalized.slice(prefix.length);
  if (normalized !== `${prefix}${filename}` || filename.includes("/")) return false;
  return unlinkGeneratedUpload(uploadRoot, filename, STORED_COMPLAINT_FILE_PATTERN);
};

const processRetention = async (settings) => {
  if (!await acquireLease("privacy-retention", 300)) return;
  const [complaints] = await db.query(
    `SELECT id FROM complaints
     WHERE anonymized_at IS NULL AND COALESCE(closed_at, created_at)<DATE_SUB(NOW(), INTERVAL ? MONTH)
     ORDER BY id LIMIT 100`, [settings.privacy.dataRetentionMonths],
  );
  for (const complaint of complaints) {
    const connection = await db.getConnection();
    let storedFiles = [];
    try {
      await connection.beginTransaction();
      const [attachments] = await connection.query(
        `SELECT id, storage_path FROM complaint_attachments WHERE complaint_id=? FOR UPDATE`, [complaint.id],
      );
      const [resolutionDocuments] = await connection.query(
        `SELECT id, storage_path FROM complaint_resolution_documents WHERE complaint_id=? FOR UPDATE`, [complaint.id],
      );
      storedFiles = [...attachments, ...resolutionDocuments].map((attachment) => attachment.storage_path);
      await connection.query(`DELETE FROM complaint_attachments WHERE complaint_id=?`, [complaint.id]);
      await connection.query(`DELETE FROM complaint_resolution_documents WHERE complaint_id=?`, [complaint.id]);
      await connection.query(
        `UPDATE complaints SET
          comp_name=NULL, comp_phone=NULL, comp_phone_digits=NULL, comp_address=NULL, comp_email=NULL,
          identification_number_encrypted=NULL, identification_number_hash=NULL, identification_number_last4=NULL,
          affected_name=NULL, relationship=NULL, witness_name=NULL, witness_phone=NULL, signature=NULL,
          ip_address=NULL, user_agent=NULL, anonymized_at=NOW()
         WHERE id=?`, [complaint.id],
      );
      await connection.commit();
      await AuditLogModel.create({
        eventType: "RETENTION_ANONYMIZED", action: "anonymize",
        resourceType: "complaint", resourceId: complaint.id,
        message: `Anonymized grievance ID ${complaint.id} under the configured retention policy`,
      }).catch((error) => console.error(`Retention audit failed for grievance ${complaint.id}:`, error.message));
      for (const storagePath of storedFiles) {
        await safeDeleteAttachment(storagePath).catch((error) =>
          console.error(`Retained attachment cleanup failed for grievance ${complaint.id}:`, error.message));
      }
    } catch (error) {
      await connection.rollback();
      console.error(`Retention failed for grievance ${complaint.id}:`, error.message);
    } finally { connection.release(); }
  }
};

const runOnce = async () => {
  if (running) return;
  running = true;
  try {
    const settings = await SettingsPolicy.getPolicy();
    await processDueDates(settings);
    await processAutoClose(settings);
    await processRetention(settings);
    await processReports();
    await processNotificationOutbox();
  } catch (error) { console.error("Runtime policy worker failed:", error.message); }
  finally { running = false; }
};

const start = () => {
  if (timer || process.env.DISABLE_RUNTIME_WORKER === "true") return;
  const interval = Math.max(15000, Number(process.env.RUNTIME_WORKER_INTERVAL_MS) || 60000);
  timer = setInterval(runOnce, interval);
  timer.unref?.();
  setImmediate(runOnce);
};

const stop = () => { if (timer) clearInterval(timer); timer = null; };

module.exports = { acquireLease, processAutoClose, processDueDates, processRetention, runOnce, start, stop };
