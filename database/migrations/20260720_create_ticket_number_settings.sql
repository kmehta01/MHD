-- Configurable, concurrency-safe grievance ticket numbering.
CREATE TABLE IF NOT EXISTS ticket_number_settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  auto_generate TINYINT(1) NOT NULL DEFAULT 1,
  ticket_prefix VARCHAR(20) NOT NULL DEFAULT 'GRM',
  ticket_format VARCHAR(255) NOT NULL DEFAULT '{PREFIX}-{YEAR}-{SEQUENCE}',
  `separator` VARCHAR(3) NOT NULL DEFAULT '-',
  letter_case ENUM('uppercase','lowercase','preserve') NOT NULL DEFAULT 'uppercase',
  include_year TINYINT(1) NOT NULL DEFAULT 1,
  year_format ENUM('four_digit','two_digit') NOT NULL DEFAULT 'four_digit',
  include_month TINYINT(1) NOT NULL DEFAULT 0,
  include_day TINYINT(1) NOT NULL DEFAULT 0,
  include_department_code TINYINT(1) NOT NULL DEFAULT 0,
  include_location_code TINYINT(1) NOT NULL DEFAULT 0,
  include_category_code TINYINT(1) NOT NULL DEFAULT 0,
  sequence_length INT UNSIGNED NOT NULL DEFAULT 6,
  starting_sequence BIGINT UNSIGNED NOT NULL DEFAULT 1,
  sequence_reset ENUM('never','daily','monthly','yearly') NOT NULL DEFAULT 'yearly',
  sequence_padding TINYINT(1) NOT NULL DEFAULT 1,
  updated_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY index_ticket_settings_updated_by (updated_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ticket_sequences (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sequence_key VARCHAR(150) NOT NULL,
  current_sequence BIGINT UNSIGNED NOT NULL DEFAULT 0,
  period_start DATE NULL,
  period_end DATE NULL,
  last_generated_ticket VARCHAR(255) NULL,
  last_generated_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_sequence_key (sequence_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ticket_number_setting_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  setting_key VARCHAR(150) NOT NULL,
  old_value LONGTEXT NULL,
  new_value LONGTEXT NULL,
  changed_by INT UNSIGNED NOT NULL,
  change_type ENUM('settings_update','sequence_reset','format_change') NOT NULL,
  reason VARCHAR(500) NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ticket_log_setting_key (setting_key),
  KEY idx_ticket_log_changed_by (changed_by),
  KEY idx_ticket_log_change_type (change_type),
  KEY idx_ticket_log_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO ticket_number_settings
  (id, auto_generate, ticket_prefix, ticket_format, `separator`, letter_case,
   include_year, year_format, include_month, include_day, include_department_code,
   include_location_code, include_category_code, sequence_length, starting_sequence,
   sequence_reset, sequence_padding)
VALUES
  (1, 1, 'GRM', '{PREFIX}-{YEAR}-{SEQUENCE}', '-', 'uppercase',
   1, 'four_digit', 0, 0, 0, 0, 0, 6, 1, 'yearly', 1)
ON DUPLICATE KEY UPDATE id=VALUES(id);
