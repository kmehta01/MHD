CREATE TABLE IF NOT EXISTS roles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_roles_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS permissions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  module VARCHAR(80) NOT NULL,
  action VARCHAR(80) NOT NULL,
  permission_key VARCHAR(160) NOT NULL,
  description VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_permissions_key (permission_key),
  KEY index_permissions_module_action (module, action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INT UNSIGNED NOT NULL,
  permission_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permissions_role
    FOREIGN KEY (role_id) REFERENCES roles (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_role_permissions_permission
    FOREIGN KEY (permission_id) REFERENCES permissions (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS departments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(160) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_departments_name (name),
  UNIQUE KEY unique_departments_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  role_id INT UNSIGNED NULL,
  department_id INT UNSIGNED NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(40) NULL,
  profile_photo VARCHAR(255) NULL,
  password VARCHAR(255) NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  last_login DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_admin_users_email (email),
  KEY index_admin_users_role_id (role_id),
  KEY index_admin_users_department_id (department_id),
  KEY index_admin_users_status (status),
  CONSTRAINT fk_admin_users_role
    FOREIGN KEY (role_id) REFERENCES roles (id)
    ON DELETE SET NULL,
  CONSTRAINT fk_admin_users_department
    FOREIGN KEY (department_id) REFERENCES departments (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT UNSIGNED NULL,
  actor_name VARCHAR(120) NULL,
  actor_role_slug VARCHAR(100) NULL,
  event_type VARCHAR(100) NOT NULL,
  action VARCHAR(40) NOT NULL,
  resource_type VARCHAR(80) NULL,
  resource_id VARCHAR(100) NULL,
  message VARCHAR(255) NOT NULL,
  success TINYINT(1) NOT NULL DEFAULT 1,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(512) NULL,
  legacy_auth_event_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_admin_audit_legacy_auth_event (legacy_auth_event_id),
  KEY index_admin_audit_logs_actor_id (actor_user_id),
  KEY index_admin_audit_logs_type (event_type),
  KEY index_admin_audit_logs_action (action),
  KEY index_admin_audit_logs_resource (resource_type, resource_id),
  KEY index_admin_audit_logs_created_at (created_at),
  CONSTRAINT fk_admin_audit_logs_actor
    FOREIGN KEY (actor_user_id) REFERENCES admin_users (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE IF NOT EXISTS admin_two_factor_challenges (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_user_id INT UNSIGNED NOT NULL,
  challenge_token_hash CHAR(64) NOT NULL,
  otp_hash CHAR(64) NOT NULL,
  attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
  resend_count INT UNSIGNED NOT NULL DEFAULT 0,
  expires_at DATETIME NOT NULL,
  resend_available_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  locked_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_two_factor_challenge_token (challenge_token_hash),
  KEY index_two_factor_challenges_user_id (admin_user_id),
  KEY index_two_factor_challenges_expires_at (expires_at),
  CONSTRAINT fk_two_factor_challenges_user
    FOREIGN KEY (admin_user_id) REFERENCES admin_users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_two_factor_recovery_codes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_user_id INT UNSIGNED NOT NULL,
  code_hash CHAR(64) NOT NULL,
  generated_by_user_id INT UNSIGNED NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_recovery_code_hash (code_hash),
  KEY index_recovery_codes_user_id (admin_user_id),
  KEY index_recovery_codes_generated_by (generated_by_user_id),
  CONSTRAINT fk_recovery_codes_user
    FOREIGN KEY (admin_user_id) REFERENCES admin_users (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_recovery_codes_generated_by
    FOREIGN KEY (generated_by_user_id) REFERENCES admin_users (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS complaints (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  token_number VARCHAR(32) NULL,
  assigned_department_id INT UNSIGNED NULL,
  ticket_priority ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
  incident_date DATE NULL,
  status ENUM(
    'New',
    'Under Review',
    'In Progress',
    'Pending Information',
    'Resolved',
    'Closed',
    'Rejected',
    'Duplicate'
  ) NOT NULL DEFAULT 'New',
  due_at DATETIME NULL,
  resolved_at DATETIME NULL,
  closed_at DATETIME NULL,
  assistance VARCHAR(80) NULL,
  assistance_other VARCHAR(500) NULL,
  submission_type ENUM('named', 'anonymous') NOT NULL DEFAULT 'named',
  comp_name VARCHAR(160) NULL,
  comp_phone VARCHAR(40) NULL,
  comp_phone_digits VARCHAR(32) NULL,
  comp_address TEXT NULL,
  comp_email VARCHAR(190) NULL,
  contact_pref ENUM('phone', 'email', 'mail', 'in_person', 'whatsapp') NULL,
  on_behalf ENUM('yes', 'no') NULL,
  affected_name VARCHAR(160) NULL,
  relationship VARCHAR(160) NULL,
  permission ENUM('yes', 'no', 'not_applicable') NULL,
  issue_type JSON NULL,
  issue_other VARCHAR(255) NULL,
  channel JSON NULL,
  incident_location VARCHAR(255) NULL,
  description TEXT NULL,
  desired_outcome TEXT NULL,
  tried_resolve ENUM('yes', 'no') NULL,
  prev_attempts TEXT NULL,
  has_documents ENUM('yes', 'no') NULL,
  has_witnesses ENUM('yes', 'no') NULL,
  witness_name VARCHAR(160) NULL,
  witness_phone VARCHAR(40) NULL,
  accommodation JSON NULL,
  accommodation_other VARCHAR(500) NULL,
  declaration_confirm TINYINT(1) NOT NULL DEFAULT 0,
  signature VARCHAR(160) NULL,
  declaration_date DATE NULL,
  intake_source ENUM('public', 'walk_in') NOT NULL DEFAULT 'public',
  office_received_at DATETIME NULL,
  office_received_by VARCHAR(120) NULL,
  office_initial_classification ENUM('Level 1', 'Level 2', 'Level 3', 'Level 4') NULL,
  office_assigned_to VARCHAR(160) NULL,
  created_by_admin_user_id INT UNSIGNED NULL,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(512) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_complaints_token_number (token_number),
  KEY index_complaints_assigned_department (assigned_department_id),
  KEY index_complaints_status_created (status, created_at),
  KEY index_complaints_due_at (due_at),
  KEY index_complaints_resolved_at (resolved_at),
  KEY index_complaints_priority (ticket_priority),
  KEY index_complaints_submission_type (submission_type),
  KEY index_complaints_incident_date (incident_date),
  KEY index_complaints_declaration_date (declaration_date),
  KEY index_complaints_intake_source (intake_source),
  KEY index_complaints_created_by_admin (created_by_admin_user_id),
  KEY index_complaints_comp_phone_digits (comp_phone_digits),
  CONSTRAINT fk_complaints_assigned_department
    FOREIGN KEY (assigned_department_id) REFERENCES departments (id)
    ON DELETE SET NULL,
  CONSTRAINT fk_complaints_created_by_admin
    FOREIGN KEY (created_by_admin_user_id) REFERENCES admin_users (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS complaint_attachments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  complaint_id BIGINT UNSIGNED NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  file_size INT UNSIGNED NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY index_complaint_attachments_complaint_id (complaint_id),
  CONSTRAINT fk_complaint_attachments_complaint
    FOREIGN KEY (complaint_id) REFERENCES complaints (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS complaint_reference_sequences (
  period CHAR(7) PRIMARY KEY,
  last_number INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO roles (id, name, slug, is_active)
VALUES
  (1, 'Super Admin', 'super-admin', 1),
  (2, 'Admin', 'admin', 1),
  (3, 'Ministry User', 'ministry-user', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  slug = VALUES(slug),
  is_active = VALUES(is_active);

INSERT INTO departments (name, slug, is_active)
VALUES
  ('Ministry Headquarters', 'ministry-headquarters', 1),
  ('Family Support & Gender Affairs', 'family-support-gender-affairs', 1),
  ('Human Services', 'human-services', 1),
  ('Community Rehabilitation', 'community-rehabilitation', 1),
  ('Policy & Planning', 'policy-planning', 1),
  (
    'Inspector of Social Services Institutions',
    'inspector-social-services-institutions',
    1
  )
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  slug = VALUES(slug),
  is_active = VALUES(is_active);

INSERT INTO permissions (module, action, permission_key, description, is_active)
VALUES
  ('dashboard', 'view', 'dashboard.view', 'View admin dashboard', 1),
  (
    'dashboard_cards',
    'view_total',
    'dashboard.cards.total',
    'View Total Grievances card',
    1
  ),
  (
    'dashboard_cards',
    'view_new',
    'dashboard.cards.new',
    'View New Grievances card',
    1
  ),
  (
    'dashboard_cards',
    'view_under_review',
    'dashboard.cards.under_review',
    'View Under Review card',
    1
  ),
  (
    'dashboard_cards',
    'view_unassigned',
    'dashboard.cards.unassigned',
    'View Unassigned card',
    1
  ),
  (
    'dashboard_cards',
    'view_assigned',
    'dashboard.cards.assigned',
    'View Assigned card',
    1
  ),
  (
    'dashboard_cards',
    'view_in_progress',
    'dashboard.cards.in_progress',
    'View In Progress card',
    1
  ),
  (
    'dashboard_cards',
    'view_pending_information',
    'dashboard.cards.pending_information',
    'View Pending Information card',
    1
  ),
  (
    'dashboard_cards',
    'view_resolved',
    'dashboard.cards.resolved',
    'View Resolved card',
    1
  ),
  (
    'dashboard_cards',
    'view_closed',
    'dashboard.cards.closed',
    'View Closed card',
    1
  ),
  (
    'dashboard_cards',
    'view_overdue',
    'dashboard.cards.overdue',
    'View Overdue card',
    1
  ),
  (
    'dashboard_cards',
    'view_high_priority',
    'dashboard.cards.high_priority',
    'View High-Priority Grievances card',
    1
  ),
  (
    'dashboard_cards',
    'view_due_today',
    'dashboard.cards.due_today',
    'View Grievances Due Today card',
    1
  ),
  (
    'dashboard_charts',
    'view_by_status',
    'dashboard.charts.by_status',
    'View Grievances by status chart',
    1
  ),
  (
    'dashboard_charts',
    'view_by_department',
    'dashboard.charts.by_department',
    'View Grievances by department chart',
    1
  ),
  (
    'dashboard_charts',
    'view_monthly_trend',
    'dashboard.charts.monthly_trend',
    'View Monthly grievance trend chart',
    1
  ),
  (
    'dashboard_charts',
    'view_by_priority',
    'dashboard.charts.by_priority',
    'View Priority-wise grievance count chart',
    1
  ),
  (
    'dashboard_charts',
    'view_open_vs_resolved',
    'dashboard.charts.open_vs_resolved',
    'View Open vs resolved grievances chart',
    1
  ),
  (
    'dashboard_charts',
    'view_average_resolution_time',
    'dashboard.charts.average_resolution_time',
    'View Average resolution time chart',
    1
  ),
  (
    'dashboard_charts',
    'view_overdue_by_department',
    'dashboard.charts.overdue_by_department',
    'View Overdue grievances by department chart',
    1
  ),
  ('applications', 'view', 'applications.view', 'View program applications', 1),
  ('grievances', 'view_all', 'grievances.view_all', 'View all grievances', 1),
  (
    'grievances',
    'view_department',
    'grievances.view_department',
    'View grievances assigned to the user department',
    1
  ),
  (
    'grievances',
    'review_new',
    'grievances.review_new',
    'Review newly submitted grievances',
    1
  ),
  ('grievances', 'assign', 'grievances.assign', 'Assign grievances', 1),
  ('grievances', 'reassign', 'grievances.reassign', 'Reassign grievances', 1),
  (
    'grievances',
    'request_reassignment',
    'grievances.request_reassignment',
    'Request grievance reassignment',
    1
  ),
  (
    'grievances',
    'update_status',
    'grievances.update_status',
    'Update grievance status',
    1
  ),
  (
    'grievances',
    'add_notes',
    'grievances.add_notes',
    'Add grievance processing notes',
    1
  ),
  (
    'grievances',
    'submit_resolution',
    'grievances.submit_resolution',
    'Submit grievance resolution',
    1
  ),
  (
    'grievances',
    'approve_resolution',
    'grievances.approve_resolution',
    'Approve grievance resolution',
    1
  ),
  ('grievances', 'close', 'grievances.close', 'Close grievances', 1),
  ('contact_offices', 'view', 'contact_offices.view', 'View contact enquiries', 1),
  ('departments', 'view', 'departments.view', 'View departments', 1),
  (
    'departments',
    'manage',
    'departments.manage',
    'Manage all department configuration',
    1
  ),
  (
    'departments',
    'manage_limited',
    'departments.manage_limited',
    'Manage limited department configuration',
    1
  ),
  ('users', 'view', 'users.view', 'View administrator users', 1),
  ('users', 'create', 'users.create', 'Create administrator users', 1),
  ('users', 'update', 'users.update', 'Update administrator users', 1),
  ('users', 'delete', 'users.delete', 'Delete administrator users', 1),
  ('users', 'manage', 'users.manage', 'Manage all administrator users', 1),
  (
    'users',
    'manage_limited',
    'users.manage_limited',
    'Manage Ministry User accounts only',
    1
  ),
  ('roles', 'view', 'roles.view', 'View roles and permissions', 1),
  ('roles', 'create', 'roles.create', 'Create custom roles', 1),
  ('roles', 'update', 'roles.update', 'Update role permissions', 1),
  ('settings', 'view', 'settings.view', 'View website settings', 1),
  ('settings', 'update', 'settings.update', 'Change system settings', 1),
  ('settings_general', 'view', 'settings.general.view', 'View General Settings', 1),
  ('settings_general', 'update', 'settings.general.update', 'Update General Settings', 1),
  ('settings_general', 'reset', 'settings.general.reset', 'Restore default General Settings', 1),
  ('settings_general', 'history', 'settings.general.history', 'View General Settings change history', 1),
  ('reports', 'view_all', 'reports.view_all', 'View all reports', 1),
  (
    'reports',
    'view_operational',
    'reports.view_operational',
    'View operational reports',
    1
  ),
  (
    'reports',
    'view_department',
    'reports.view_department',
    'View reports for the assigned department',
    1
  ),
  (
    'audit_logs',
    'view_all',
    'audit_logs.view_all',
    'View all audit logs',
    1
  ),
  (
    'audit_logs',
    'view_limited',
    'audit_logs.view_limited',
    'View audit logs excluding Super Admin activity',
    1
  ),
  (
    'audit_logs',
    'view_own',
    'audit_logs.view_own',
    'View own audit activity',
    1
  ),
  ('audit_logs', 'export', 'audit_logs.export', 'Export audit logs', 1)
ON DUPLICATE KEY UPDATE
  module = VALUES(module),
  action = VALUES(action),
  description = VALUES(description),
  is_active = VALUES(is_active);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
CROSS JOIN permissions
WHERE roles.slug = 'super-admin'
  AND permissions.is_active = 1;

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
JOIN permissions ON permissions.permission_key = 'settings.general.view'
WHERE roles.slug = 'admin';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
JOIN permissions ON permissions.permission_key IN (
  'dashboard.view',
  'dashboard.cards.total',
  'dashboard.cards.new',
  'dashboard.cards.under_review',
  'dashboard.cards.unassigned',
  'dashboard.cards.assigned',
  'dashboard.cards.in_progress',
  'dashboard.cards.pending_information',
  'dashboard.cards.resolved',
  'dashboard.cards.closed',
  'dashboard.cards.overdue',
  'dashboard.cards.high_priority',
  'dashboard.cards.due_today',
  'dashboard.charts.by_status',
  'dashboard.charts.by_department',
  'dashboard.charts.monthly_trend',
  'dashboard.charts.by_priority',
  'dashboard.charts.open_vs_resolved',
  'dashboard.charts.average_resolution_time',
  'dashboard.charts.overdue_by_department',
  'grievances.view_all',
  'grievances.view_department',
  'grievances.review_new',
  'grievances.assign',
  'grievances.reassign',
  'grievances.update_status',
  'grievances.add_notes',
  'grievances.submit_resolution',
  'grievances.approve_resolution',
  'grievances.close',
  'departments.view',
  'departments.manage_limited',
  'users.view',
  'users.create',
  'users.update',
  'users.delete',
  'users.manage_limited',
  'reports.view_operational',
  'audit_logs.view_limited'
)
WHERE roles.slug = 'admin';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
JOIN permissions ON permissions.permission_key IN (
  'dashboard.view',
  'dashboard.cards.total',
  'dashboard.cards.new',
  'dashboard.cards.under_review',
  'dashboard.cards.unassigned',
  'dashboard.cards.assigned',
  'dashboard.cards.in_progress',
  'dashboard.cards.pending_information',
  'dashboard.cards.resolved',
  'dashboard.cards.closed',
  'dashboard.cards.overdue',
  'dashboard.cards.high_priority',
  'dashboard.cards.due_today',
  'dashboard.charts.by_status',
  'dashboard.charts.by_department',
  'dashboard.charts.monthly_trend',
  'dashboard.charts.by_priority',
  'dashboard.charts.open_vs_resolved',
  'dashboard.charts.average_resolution_time',
  'dashboard.charts.overdue_by_department',
  'grievances.view_department',
  'grievances.request_reassignment',
  'grievances.update_status',
  'grievances.add_notes',
  'grievances.submit_resolution',
  'reports.view_department',
  'audit_logs.view_own'
)
WHERE roles.slug = 'ministry-user';
