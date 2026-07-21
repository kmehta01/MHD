const db = require("../config/db");

const findSequence = async (sequenceKey, executor = db, { forUpdate = false } = {}) => {
  const [rows] = await executor.query(
    `SELECT id, sequence_key, current_sequence, period_start, period_end,
            last_generated_ticket, last_generated_at, created_at, updated_at
     FROM ticket_sequences
     WHERE sequence_key = ?
     LIMIT 1${forUpdate ? " FOR UPDATE" : ""}`,
    [sequenceKey],
  );
  return rows[0] || null;
};

const ensureSequence = async ({ key, start, end, initialSequence }, executor) => {
  await executor.query(
    `INSERT IGNORE INTO ticket_sequences
       (sequence_key, current_sequence, period_start, period_end)
     VALUES (?, ?, ?, ?)`,
    [key, initialSequence, start, end],
  );
  return findSequence(key, executor, { forUpdate: true });
};

const updateSequence = async ({ id, sequence, ticketNumber }, executor) => {
  await executor.query(
    `UPDATE ticket_sequences
     SET current_sequence = ?, last_generated_ticket = ?,
         last_generated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [sequence, ticketNumber, id],
  );
};

const resetSequence = async ({ id, sequence }, executor) => {
  await executor.query(
    `UPDATE ticket_sequences
     SET current_sequence = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [sequence, id],
  );
};

const preserveSequenceFloor = async ({ id, sequence }, executor) => {
  await executor.query(
    `UPDATE ticket_sequences
     SET current_sequence = GREATEST(current_sequence, ?), updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [sequence, id],
  );
};

const ticketExists = async (ticketNumber, executor = db) => {
  const [rows] = await executor.query(
    "SELECT id FROM complaints WHERE token_number = ? LIMIT 1",
    [ticketNumber],
  );
  return rows.length > 0;
};

module.exports = { ensureSequence, findSequence, preserveSequenceFloor, resetSequence, ticketExists, updateSequence };
