const db = require("../config/db");

const createChallenge = async ({
  userId,
  challengeTokenHash,
  otpHash,
  expiresAt,
  resendAvailableAt,
}) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      `SELECT id FROM admin_users WHERE id = ? FOR UPDATE`,
      [userId],
    );

    await connection.query(
      `UPDATE admin_two_factor_challenges
       SET used_at = NOW()
       WHERE admin_user_id = ? AND used_at IS NULL`,
      [userId],
    );

    const [result] = await connection.query(
      `INSERT INTO admin_two_factor_challenges
       (admin_user_id, challenge_token_hash, otp_hash, expires_at, resend_available_at)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, challengeTokenHash, otpHash, expiresAt, resendAvailableAt],
    );

    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const findChallengeByTokenHash = async (challengeTokenHash) => {
  const [challenges] = await db.query(
    `SELECT
      c.id,
      c.admin_user_id,
      c.otp_hash,
      c.attempt_count,
      c.resend_count,
      c.expires_at,
      c.resend_available_at,
      c.used_at,
      c.locked_at,
      au.name,
      au.email,
      au.profile_photo,
      au.status,
      au.department_id,
      d.name AS department_name,
      r.id AS role_id,
      r.name AS role_name,
      r.slug AS role_slug,
      r.is_active AS role_is_active
    FROM admin_two_factor_challenges c
    JOIN admin_users au ON au.id = c.admin_user_id
    LEFT JOIN roles r ON r.id = au.role_id
    LEFT JOIN departments d ON d.id = au.department_id
    WHERE c.challenge_token_hash = ?
    LIMIT 1`,
    [challengeTokenHash],
  );

  return challenges[0] || null;
};

const markChallengeUsed = async (challengeId) => {
  const [result] = await db.query(
    `UPDATE admin_two_factor_challenges
     SET used_at = NOW()
     WHERE id = ? AND used_at IS NULL`,
    [challengeId],
  );

  return result.affectedRows === 1;
};

const rotateChallengeOtp = async ({
  challengeId,
  otpHash,
  expiresAt,
  resendAvailableAt,
  maxResends,
}) => {
  const [result] = await db.query(
    `UPDATE admin_two_factor_challenges
     SET otp_hash = ?,
         expires_at = ?,
         resend_available_at = ?,
         resend_count = resend_count + 1
     WHERE id = ?
       AND used_at IS NULL
       AND locked_at IS NULL
       AND expires_at > NOW()
       AND resend_available_at <= NOW()
       AND resend_count < ?`,
    [otpHash, expiresAt, resendAvailableAt, challengeId, maxResends],
  );

  return result.affectedRows === 1;
};

const recordFailedAttempt = async (challengeId, maxAttempts) => {
  await db.query(
    `UPDATE admin_two_factor_challenges
     SET locked_at = CASE
           WHEN attempt_count + 1 >= ? THEN NOW()
           ELSE locked_at
         END,
         attempt_count = attempt_count + 1
     WHERE id = ?
       AND used_at IS NULL
       AND locked_at IS NULL
       AND expires_at > NOW()
       AND attempt_count < ?`,
    [maxAttempts, challengeId, maxAttempts],
  );

  const [challenges] = await db.query(
    `SELECT attempt_count, locked_at
     FROM admin_two_factor_challenges
     WHERE id = ?
     LIMIT 1`,
    [challengeId],
  );

  return challenges[0] || null;
};

const consumeOtpChallenge = async (challengeId, otpHash) => {
  const [result] = await db.query(
    `UPDATE admin_two_factor_challenges
     SET used_at = NOW()
     WHERE id = ?
       AND otp_hash = ?
       AND used_at IS NULL
       AND locked_at IS NULL
       AND expires_at > NOW()`,
    [challengeId, otpHash],
  );

  return result.affectedRows === 1;
};

const countRecoveryCodes = async (userId) => {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM admin_two_factor_recovery_codes
     WHERE admin_user_id = ?`,
    [userId],
  );

  return Number(rows[0]?.total || 0);
};

const replaceRecoveryCodesWithExecutor = async ({
  userId,
  codeHashes,
  generatedByUserId = null,
}, executor) => {
  const [users] = await executor.query(
    `SELECT id FROM admin_users WHERE id = ? FOR UPDATE`,
    [userId],
  );

  if (users.length === 0) {
    const error = new Error("User not found");
    error.code = "USER_NOT_FOUND";
    throw error;
  }

  await executor.query(
    `DELETE FROM admin_two_factor_recovery_codes
     WHERE admin_user_id = ?`,
    [userId],
  );

  for (const codeHash of codeHashes) {
    await executor.query(
      `INSERT INTO admin_two_factor_recovery_codes
       (admin_user_id, code_hash, generated_by_user_id)
       VALUES (?, ?, ?)`,
      [userId, codeHash, generatedByUserId],
    );
  }
};

const replaceRecoveryCodes = async (options, executor = null) => {
  if (executor) {
    return replaceRecoveryCodesWithExecutor(options, executor);
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await replaceRecoveryCodesWithExecutor(options, connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const consumeRecoveryCodeAndChallenge = async ({
  userId,
  challengeId,
  codeHash,
}) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [recoveryResult] = await connection.query(
      `UPDATE admin_two_factor_recovery_codes
       SET used_at = NOW()
       WHERE admin_user_id = ?
         AND code_hash = ?
         AND used_at IS NULL`,
      [userId, codeHash],
    );

    if (recoveryResult.affectedRows !== 1) {
      await connection.rollback();
      return false;
    }

    const [challengeResult] = await connection.query(
      `UPDATE admin_two_factor_challenges
       SET used_at = NOW()
       WHERE id = ?
         AND admin_user_id = ?
         AND used_at IS NULL
         AND locked_at IS NULL
         AND expires_at > NOW()`,
      [challengeId, userId],
    );

    if (challengeResult.affectedRows !== 1) {
      await connection.rollback();
      return false;
    }

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  consumeOtpChallenge,
  consumeRecoveryCodeAndChallenge,
  countRecoveryCodes,
  createChallenge,
  findChallengeByTokenHash,
  markChallengeUsed,
  recordFailedAttempt,
  replaceRecoveryCodes,
  rotateChallengeOtp,
};
