CREATE TABLE IF NOT EXISTS system_settings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  setting_group VARCHAR(100) NOT NULL,
  setting_key VARCHAR(150) NOT NULL,
  setting_value LONGTEXT NULL,
  value_type ENUM('string', 'number', 'boolean', 'json', 'file', 'email', 'url') NOT NULL DEFAULT 'string',
  is_public TINYINT(1) NOT NULL DEFAULT 0,
  is_encrypted TINYINT(1) NOT NULL DEFAULT 0,
  created_by INT UNSIGNED NULL,
  updated_by INT UNSIGNED NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_setting_key (setting_key),
  KEY index_system_settings_group (setting_group),
  KEY index_system_settings_updated_by (updated_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_setting_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  setting_id BIGINT UNSIGNED NULL,
  setting_key VARCHAR(150) NOT NULL,
  old_value LONGTEXT NULL,
  new_value LONGTEXT NULL,
  changed_by INT UNSIGNED NOT NULL,
  change_reason VARCHAR(500) NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY index_setting_logs_key (setting_key),
  KEY index_setting_logs_changed_by (changed_by),
  KEY index_setting_logs_created_at (created_at),
  CONSTRAINT fk_setting_logs_setting FOREIGN KEY (setting_id) REFERENCES system_settings (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO permissions (module, action, permission_key, description, is_active)
VALUES
  ('settings_general', 'view', 'settings.general.view', 'View General Settings', 1),
  ('settings_general', 'update', 'settings.general.update', 'Update General Settings', 1),
  ('settings_general', 'reset', 'settings.general.reset', 'Restore default General Settings', 1),
  ('settings_general', 'history', 'settings.general.history', 'View General Settings change history', 1)
ON DUPLICATE KEY UPDATE
  module = VALUES(module),
  action = VALUES(action),
  description = VALUES(description),
  is_active = 1;

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.permission_key IN (
  'settings.general.view',
  'settings.general.update',
  'settings.general.reset',
  'settings.general.history'
)
WHERE r.slug = 'super-admin';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.permission_key = 'settings.general.view'
WHERE r.slug = 'admin'
  AND EXISTS (
    SELECT 1
    FROM role_permissions legacy_rp
    JOIN permissions legacy_p ON legacy_p.id = legacy_rp.permission_id
    WHERE legacy_rp.role_id = r.id
      AND legacy_p.permission_key = 'settings.view'
  );
