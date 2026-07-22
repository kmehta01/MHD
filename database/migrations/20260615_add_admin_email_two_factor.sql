-- Authentication hardening and durable two-factor/session state.
SET @grm_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
  AND TABLE_NAME='admin_users' AND COLUMN_NAME='failed_login_attempts')=0,
  'ALTER TABLE admin_users ADD COLUMN failed_login_attempts INT UNSIGNED NOT NULL DEFAULT 0 AFTER last_login','SELECT 1');
PREPARE grm_stmt FROM @grm_sql; EXECUTE grm_stmt; DEALLOCATE PREPARE grm_stmt;
SET @grm_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
  AND TABLE_NAME='admin_users' AND COLUMN_NAME='locked_until')=0,
  'ALTER TABLE admin_users ADD COLUMN locked_until DATETIME NULL AFTER failed_login_attempts','SELECT 1');
PREPARE grm_stmt FROM @grm_sql; EXECUTE grm_stmt; DEALLOCATE PREPARE grm_stmt;
SET @grm_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
  AND TABLE_NAME='admin_users' AND COLUMN_NAME='password_changed_at')=0,
  'ALTER TABLE admin_users ADD COLUMN password_changed_at DATETIME NULL AFTER locked_until','SELECT 1');
PREPARE grm_stmt FROM @grm_sql; EXECUTE grm_stmt; DEALLOCATE PREPARE grm_stmt;
SET @grm_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
  AND TABLE_NAME='admin_users' AND COLUMN_NAME='must_change_password')=0,
  'ALTER TABLE admin_users ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0 AFTER password_changed_at','SELECT 1');
PREPARE grm_stmt FROM @grm_sql; EXECUTE grm_stmt; DEALLOCATE PREPARE grm_stmt;

CREATE TABLE IF NOT EXISTS admin_two_factor_challenges (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_user_id INT NOT NULL,
  challenge_token_hash CHAR(64) NOT NULL,
  otp_hash CHAR(64) NOT NULL,
  attempt_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
  resend_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
  expires_at DATETIME NOT NULL,
  resend_available_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  locked_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_2fa_challenge_token (challenge_token_hash),
  KEY idx_admin_2fa_challenge_user (admin_user_id),
  KEY idx_admin_2fa_challenge_active (admin_user_id, used_at, locked_at, expires_at),
  CONSTRAINT fk_admin_2fa_challenge_user FOREIGN KEY (admin_user_id)
    REFERENCES admin_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_two_factor_recovery_codes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_user_id INT NOT NULL,
  code_hash CHAR(64) NOT NULL,
  generated_by_user_id INT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_2fa_recovery_code (code_hash),
  KEY idx_admin_2fa_recovery_user (admin_user_id, used_at),
  KEY fk_admin_2fa_recovery_generator (generated_by_user_id),
  CONSTRAINT fk_admin_2fa_recovery_user FOREIGN KEY (admin_user_id)
    REFERENCES admin_users (id) ON DELETE CASCADE,
  CONSTRAINT fk_admin_2fa_recovery_generator FOREIGN KEY (generated_by_user_id)
    REFERENCES admin_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_token CHAR(36) NOT NULL,
  admin_user_id INT NOT NULL,
  two_factor_verified TINYINT(1) NOT NULL DEFAULT 0,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  last_activity_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  revoke_reason VARCHAR(120) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_admin_session_token (session_token),
  KEY index_admin_sessions_user_active (admin_user_id, revoked_at, expires_at),
  CONSTRAINT fk_admin_sessions_user FOREIGN KEY (admin_user_id)
    REFERENCES admin_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
