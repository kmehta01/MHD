-- Runtime settings and immutable change history.
CREATE TABLE IF NOT EXISTS system_settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  setting_group VARCHAR(100) NOT NULL,
  setting_key VARCHAR(150) NOT NULL,
  setting_value LONGTEXT NULL,
  value_type ENUM('string','number','boolean','json','file','email','url') NOT NULL DEFAULT 'string',
  is_public TINYINT(1) NOT NULL DEFAULT 0,
  is_encrypted TINYINT(1) NOT NULL DEFAULT 0,
  created_by INT UNSIGNED NULL,
  updated_by INT UNSIGNED NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_setting_key (setting_key),
  KEY index_system_settings_group (setting_group),
  KEY index_system_settings_updated_by (updated_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_setting_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  setting_id BIGINT UNSIGNED NULL,
  setting_key VARCHAR(150) NOT NULL,
  old_value LONGTEXT NULL,
  new_value LONGTEXT NULL,
  changed_by INT UNSIGNED NOT NULL,
  change_reason VARCHAR(500) NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY index_setting_logs_key (setting_key),
  KEY index_setting_logs_changed_by (changed_by),
  KEY index_setting_logs_created_at (created_at),
  KEY fk_setting_logs_setting (setting_id),
  CONSTRAINT fk_setting_logs_setting FOREIGN KEY (setting_id)
    REFERENCES system_settings (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

