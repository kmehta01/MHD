ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS failed_login_attempts INT UNSIGNED NOT NULL DEFAULT 0 AFTER last_login,
  ADD COLUMN IF NOT EXISTS locked_until DATETIME NULL AFTER failed_login_attempts,
  ADD COLUMN IF NOT EXISTS password_changed_at DATETIME NULL AFTER locked_until,
  ADD COLUMN IF NOT EXISTS must_change_password TINYINT(1) NOT NULL DEFAULT 0 AFTER password_changed_at;

UPDATE admin_users
SET password_changed_at = COALESCE(password_changed_at, updated_at, created_at)
WHERE password_changed_at IS NULL;

CREATE TABLE IF NOT EXISTS admin_sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_token CHAR(36) NOT NULL,
  admin_user_id INT UNSIGNED NOT NULL,
  two_factor_verified TINYINT(1) NOT NULL DEFAULT 0,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  last_activity_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  revoke_reason VARCHAR(120) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_admin_session_token (session_token),
  KEY index_admin_sessions_user_active (admin_user_id, revoked_at, expires_at),
  CONSTRAINT fk_admin_sessions_user FOREIGN KEY (admin_user_id)
    REFERENCES admin_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS public_holidays (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  holiday_date DATE NOT NULL,
  name VARCHAR(160) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_public_holiday_date (holiday_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELETE FROM system_settings
WHERE setting_key IN (
  'grievanceSubmission.citizenRegistrationRequired',
  'ticket.autoGenerateTicketNumber',
  'ticket.ticketPrefix',
  'ticket.startingSequenceNumber',
  'ticket.sequenceReset',
  'notifications.enableSmsNotifications',
  'notifications.enableWhatsappNotifications',
  'security.auditUserLoginActivity',
  'footer.applicationVersion'
);
