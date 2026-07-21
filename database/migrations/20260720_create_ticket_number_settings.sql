CREATE TABLE IF NOT EXISTS ticket_number_settings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  auto_generate TINYINT(1) NOT NULL DEFAULT 1,
  ticket_prefix VARCHAR(20) NOT NULL DEFAULT 'GRM',
  ticket_format VARCHAR(255) NOT NULL DEFAULT '{PREFIX}-{YEAR}-{SEQUENCE}',
  `separator` VARCHAR(3) NOT NULL DEFAULT '-',
  letter_case ENUM('uppercase', 'lowercase', 'preserve') NOT NULL DEFAULT 'uppercase',
  include_year TINYINT(1) NOT NULL DEFAULT 1,
  year_format ENUM('four_digit', 'two_digit') NOT NULL DEFAULT 'four_digit',
  include_month TINYINT(1) NOT NULL DEFAULT 0,
  include_day TINYINT(1) NOT NULL DEFAULT 0,
  include_department_code TINYINT(1) NOT NULL DEFAULT 0,
  include_location_code TINYINT(1) NOT NULL DEFAULT 0,
  include_category_code TINYINT(1) NOT NULL DEFAULT 0,
  sequence_length INT UNSIGNED NOT NULL DEFAULT 6,
  starting_sequence BIGINT UNSIGNED NOT NULL DEFAULT 1,
  sequence_reset ENUM('never', 'daily', 'monthly', 'yearly') NOT NULL DEFAULT 'yearly',
  sequence_padding TINYINT(1) NOT NULL DEFAULT 1,
  updated_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY index_ticket_settings_updated_by (updated_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ticket_sequences (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sequence_key VARCHAR(150) NOT NULL,
  current_sequence BIGINT UNSIGNED NOT NULL DEFAULT 0,
  period_start DATE NULL,
  period_end DATE NULL,
  last_generated_ticket VARCHAR(255) NULL,
  last_generated_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_sequence_key (sequence_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ticket_number_setting_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(150) NOT NULL,
  old_value LONGTEXT NULL,
  new_value LONGTEXT NULL,
  changed_by INT UNSIGNED NOT NULL,
  change_type ENUM('settings_update', 'sequence_reset', 'format_change') NOT NULL,
  reason VARCHAR(500) NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ticket_log_setting_key (setting_key),
  KEY idx_ticket_log_changed_by (changed_by),
  KEY idx_ticket_log_change_type (change_type),
  KEY idx_ticket_log_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO ticket_number_settings (id)
VALUES (1)
ON DUPLICATE KEY UPDATE id = VALUES(id);

INSERT INTO permissions (module, action, permission_key, description, is_active)
VALUES
  ('settings_ticket_number', 'view', 'settings.ticket_number.view', 'View Ticket Number Format settings', 1),
  ('settings_ticket_number', 'update', 'settings.ticket_number.update', 'Update Ticket Number Format settings', 1),
  ('settings_ticket_number', 'reset', 'settings.ticket_number.reset', 'Reset the active ticket sequence', 1),
  ('settings_ticket_number', 'history', 'settings.ticket_number.history', 'View Ticket Number Format history', 1)
ON DUPLICATE KEY UPDATE
  module = VALUES(module), action = VALUES(action), description = VALUES(description), is_active = 1;

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.permission_key IN (
  'settings.ticket_number.view', 'settings.ticket_number.update',
  'settings.ticket_number.reset', 'settings.ticket_number.history'
)
WHERE r.slug = 'super-admin';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.permission_key = 'settings.ticket_number.view'
WHERE r.slug = 'admin'
  AND EXISTS (
    SELECT 1 FROM role_permissions existing
    JOIN permissions existing_permission ON existing_permission.id = existing.permission_id
    WHERE existing.role_id = r.id
      AND existing_permission.permission_key IN ('settings.view', 'settings.general.view')
  );
