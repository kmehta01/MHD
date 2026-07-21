CREATE TABLE IF NOT EXISTS admin_two_factor_challenges (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_user_id INT UNSIGNED NOT NULL,
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
  UNIQUE KEY uq_admin_2fa_challenge_token (challenge_token_hash),
  KEY idx_admin_2fa_challenge_user (admin_user_id),
  KEY idx_admin_2fa_challenge_active (admin_user_id, used_at, locked_at, expires_at),
  CONSTRAINT fk_admin_2fa_challenge_user FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_two_factor_recovery_codes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_user_id INT UNSIGNED NOT NULL,
  code_hash CHAR(64) NOT NULL,
  generated_by_user_id INT UNSIGNED NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_admin_2fa_recovery_code (code_hash),
  KEY idx_admin_2fa_recovery_user (admin_user_id, used_at),
  KEY fk_admin_2fa_recovery_generator (generated_by_user_id),
  CONSTRAINT fk_admin_2fa_recovery_user FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_admin_2fa_recovery_generator FOREIGN KEY (generated_by_user_id) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_auth_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_user_id INT UNSIGNED NULL,
  actor_user_id INT UNSIGNED NULL,
  event_type VARCHAR(64) NOT NULL,
  success TINYINT(1) NOT NULL DEFAULT 1,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(512) NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_admin_auth_event_user (admin_user_id, created_at),
  KEY idx_admin_auth_event_actor (actor_user_id, created_at),
  KEY idx_admin_auth_event_type (event_type, created_at),
  CONSTRAINT fk_admin_auth_event_user FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE SET NULL,
  CONSTRAINT fk_admin_auth_event_actor FOREIGN KEY (actor_user_id) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
