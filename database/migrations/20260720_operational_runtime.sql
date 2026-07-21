CREATE TABLE IF NOT EXISTS notification_templates (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_type VARCHAR(60) NOT NULL,
  channel ENUM('email', 'dashboard') NOT NULL,
  name VARCHAR(160) NOT NULL,
  subject_template VARCHAR(255) NULL,
  body_template TEXT NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_notification_template_event_channel (event_type, channel)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification_outbox (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  idempotency_key VARCHAR(190) NOT NULL,
  event_type VARCHAR(60) NOT NULL,
  channel ENUM('email', 'dashboard') NOT NULL,
  complaint_id BIGINT UNSIGNED NULL,
  admin_user_id INT UNSIGNED NULL,
  recipient_email VARCHAR(190) NULL,
  template_id INT UNSIGNED NULL,
  payload JSON NOT NULL,
  status ENUM('pending', 'processing', 'sent', 'failed') NOT NULL DEFAULT 'pending',
  attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  available_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processing_started_at DATETIME NULL,
  sent_at DATETIME NULL,
  last_error TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_notification_idempotency (idempotency_key),
  KEY index_notification_outbox_work (status, available_at),
  CONSTRAINT fk_notification_outbox_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  CONSTRAINT fk_notification_outbox_user FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notification_outbox_template FOREIGN KEY (template_id) REFERENCES notification_templates(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  idempotency_key VARCHAR(190) NOT NULL,
  admin_user_id INT UNSIGNED NOT NULL,
  complaint_id BIGINT UNSIGNED NULL,
  event_type VARCHAR(60) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  read_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_admin_notification_idempotency (idempotency_key),
  KEY index_admin_notifications_user_unread (admin_user_id, read_at, created_at),
  CONSTRAINT fk_admin_notification_user FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_admin_notification_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS background_job_leases (
  lease_key VARCHAR(100) PRIMARY KEY,
  lease_owner CHAR(36) NOT NULL,
  locked_until DATETIME NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS report_jobs (
  id CHAR(36) PRIMARY KEY,
  requested_by INT UNSIGNED NOT NULL,
  report_type VARCHAR(60) NOT NULL DEFAULT 'grievances',
  output_format ENUM('PDF', 'Excel', 'CSV') NOT NULL,
  filters JSON NOT NULL,
  settings_snapshot JSON NOT NULL,
  status ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
  total_records INT UNSIGNED NOT NULL DEFAULT 0,
  output_path VARCHAR(500) NULL,
  output_name VARCHAR(255) NULL,
  mime_type VARCHAR(120) NULL,
  error_message TEXT NULL,
  processing_started_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY index_report_jobs_work (status, created_at),
  KEY index_report_jobs_user (requested_by, created_at),
  CONSTRAINT fk_report_jobs_user FOREIGN KEY (requested_by) REFERENCES admin_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO notification_templates (event_type, channel, name, subject_template, body_template) VALUES
  ('submission', 'email', 'Submission acknowledgement', 'Grievance {{ticketNumber}} received', 'Your grievance {{ticketNumber}} has been received. {{acknowledgementMessage}}'),
  ('submission', 'dashboard', 'New grievance', NULL, 'New grievance {{ticketNumber}} was submitted.'),
  ('assignment', 'email', 'Assignment notification', 'Grievance {{ticketNumber}} assigned', 'Grievance {{ticketNumber}} has been assigned to {{departmentName}}.'),
  ('assignment', 'dashboard', 'Assignment notification', NULL, 'Grievance {{ticketNumber}} was assigned to {{departmentName}}.'),
  ('due_reminder', 'email', 'Due date reminder', 'Grievance {{ticketNumber}} is due soon', 'Grievance {{ticketNumber}} is due on {{dueAt}}.'),
  ('due_reminder', 'dashboard', 'Due date reminder', NULL, 'Grievance {{ticketNumber}} is due on {{dueAt}}.'),
  ('overdue', 'email', 'Overdue grievance', 'Grievance {{ticketNumber}} is overdue', 'Grievance {{ticketNumber}} is overdue.'),
  ('overdue', 'dashboard', 'Overdue grievance', NULL, 'Grievance {{ticketNumber}} is overdue.'),
  ('resolution', 'dashboard', 'Resolution submitted', NULL, 'A resolution was submitted for grievance {{ticketNumber}}.'),
  ('returned', 'email', 'Resolution returned', 'Resolution returned for {{ticketNumber}}', 'The resolution for grievance {{ticketNumber}} was returned for further work.'),
  ('returned', 'dashboard', 'Resolution returned', NULL, 'The resolution for grievance {{ticketNumber}} was returned.'),
  ('status_change', 'email', 'Status change', 'Grievance {{ticketNumber}} status updated', 'The status of grievance {{ticketNumber}} is now {{status}}.'),
  ('closure', 'email', 'Grievance closed', 'Grievance {{ticketNumber}} closed', 'Grievance {{ticketNumber}} has been closed.'),
  ('closure', 'dashboard', 'Grievance closed', NULL, 'Grievance {{ticketNumber}} was closed.')
ON DUPLICATE KEY UPDATE name=VALUES(name), subject_template=VALUES(subject_template), body_template=VALUES(body_template);

INSERT INTO permissions (module, action, permission_key, description, is_active) VALUES
  ('notifications', 'view', 'notifications.view', 'View administrator notifications', 1),
  ('notifications', 'manage_templates', 'notifications.templates.manage', 'Manage notification templates', 1),
  ('reports', 'export', 'reports.export', 'Create and download report exports', 1),
  ('grievances', 'view_pii', 'grievances.view_pii', 'View unmasked citizen personal information', 1)
ON DUPLICATE KEY UPDATE description=VALUES(description), is_active=1;

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
  ON p.permission_key IN ('notifications.view','notifications.templates.manage','reports.export','grievances.view_pii')
WHERE r.slug='super-admin';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.permission_key='notifications.view'
WHERE r.slug IN ('admin','ministry-user');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.permission_key='reports.export'
WHERE r.slug IN ('admin','ministry-user');
