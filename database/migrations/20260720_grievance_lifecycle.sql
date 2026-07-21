CREATE TABLE IF NOT EXISTS complaint_statuses (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  status_key VARCHAR(50) NOT NULL,
  name VARCHAR(80) NOT NULL,
  is_final TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY unique_complaint_status_key (status_key),
  UNIQUE KEY unique_complaint_status_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS complaint_priorities (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  priority_key VARCHAR(50) NOT NULL,
  name VARCHAR(80) NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY unique_complaint_priority_key (priority_key),
  UNIQUE KEY unique_complaint_priority_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS complaint_categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL,
  name VARCHAR(160) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_complaint_category_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS complaint_locations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL,
  name VARCHAR(160) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_complaint_location_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workflow_transitions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  from_status_id SMALLINT UNSIGNED NOT NULL,
  to_status_id SMALLINT UNSIGNED NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY unique_workflow_transition (from_status_id, to_status_id),
  CONSTRAINT fk_transition_from_status FOREIGN KEY (from_status_id) REFERENCES complaint_statuses(id),
  CONSTRAINT fk_transition_to_status FOREIGN KEY (to_status_id) REFERENCES complaint_statuses(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS assignment_routing_rules (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  match_type ENUM('category', 'department', 'location', 'fallback') NOT NULL,
  match_value VARCHAR(100) NULL,
  destination_department_id INT UNSIGNED NOT NULL,
  assigned_officer_id INT UNSIGNED NULL,
  rule_priority INT NOT NULL DEFAULT 100,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  KEY index_routing_rules_match (match_type, match_value, is_active, rule_priority),
  CONSTRAINT fk_routing_destination FOREIGN KEY (destination_department_id) REFERENCES departments(id),
  CONSTRAINT fk_routing_officer FOREIGN KEY (assigned_officer_id) REFERENCES admin_users(id) ON DELETE SET NULL,
  CONSTRAINT fk_routing_creator FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS status_id SMALLINT UNSIGNED NULL AFTER status,
  ADD COLUMN IF NOT EXISTS priority_id SMALLINT UNSIGNED NULL AFTER ticket_priority,
  ADD COLUMN IF NOT EXISTS category_id INT UNSIGNED NULL AFTER priority_id,
  ADD COLUMN IF NOT EXISTS location_id INT UNSIGNED NULL AFTER category_id,
  ADD COLUMN IF NOT EXISTS submitted_department_id INT UNSIGNED NULL AFTER assigned_department_id,
  ADD COLUMN IF NOT EXISTS assigned_officer_id INT UNSIGNED NULL AFTER submitted_department_id,
  ADD COLUMN IF NOT EXISTS is_escalated TINYINT(1) NOT NULL DEFAULT 0 AFTER due_at,
  ADD COLUMN IF NOT EXISTS overdue_at DATETIME NULL AFTER is_escalated,
  ADD COLUMN IF NOT EXISTS anonymized_at DATETIME NULL AFTER closed_at;

CREATE TABLE IF NOT EXISTS complaint_status_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  complaint_id BIGINT UNSIGNED NOT NULL,
  from_status_id SMALLINT UNSIGNED NULL,
  to_status_id SMALLINT UNSIGNED NOT NULL,
  comment TEXT NULL,
  changed_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY index_status_history_complaint (complaint_id, created_at),
  CONSTRAINT fk_status_history_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  CONSTRAINT fk_status_history_from FOREIGN KEY (from_status_id) REFERENCES complaint_statuses(id),
  CONSTRAINT fk_status_history_to FOREIGN KEY (to_status_id) REFERENCES complaint_statuses(id),
  CONSTRAINT fk_status_history_actor FOREIGN KEY (changed_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS complaint_assignment_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  complaint_id BIGINT UNSIGNED NOT NULL,
  from_department_id INT UNSIGNED NULL,
  to_department_id INT UNSIGNED NULL,
  assigned_officer_id INT UNSIGNED NULL,
  note TEXT NULL,
  assigned_by INT UNSIGNED NULL,
  assignment_source ENUM('manual', 'routing_rule', 'reassignment') NOT NULL DEFAULT 'manual',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY index_assignment_history_complaint (complaint_id, created_at),
  CONSTRAINT fk_assignment_history_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  CONSTRAINT fk_assignment_history_from FOREIGN KEY (from_department_id) REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT fk_assignment_history_to FOREIGN KEY (to_department_id) REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT fk_assignment_history_officer FOREIGN KEY (assigned_officer_id) REFERENCES admin_users(id) ON DELETE SET NULL,
  CONSTRAINT fk_assignment_history_actor FOREIGN KEY (assigned_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS complaint_reassignment_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  complaint_id BIGINT UNSIGNED NOT NULL,
  requested_department_id INT UNSIGNED NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  requested_by INT UNSIGNED NOT NULL,
  decided_by INT UNSIGNED NULL,
  decision_note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_at DATETIME NULL,
  CONSTRAINT fk_reassignment_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  CONSTRAINT fk_reassignment_department FOREIGN KEY (requested_department_id) REFERENCES departments(id),
  CONSTRAINT fk_reassignment_requester FOREIGN KEY (requested_by) REFERENCES admin_users(id),
  CONSTRAINT fk_reassignment_decider FOREIGN KEY (decided_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS due_date_extension_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  complaint_id BIGINT UNSIGNED NOT NULL,
  requested_due_at DATETIME NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  requested_by INT UNSIGNED NOT NULL,
  decided_by INT UNSIGNED NULL,
  decision_note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_at DATETIME NULL,
  CONSTRAINT fk_due_extension_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  CONSTRAINT fk_due_extension_requester FOREIGN KEY (requested_by) REFERENCES admin_users(id),
  CONSTRAINT fk_due_extension_decider FOREIGN KEY (decided_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS complaint_escalations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  complaint_id BIGINT UNSIGNED NOT NULL,
  escalation_key VARCHAR(120) NOT NULL,
  escalated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_complaint_escalation (complaint_id, escalation_key),
  CONSTRAINT fk_escalation_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS complaint_internal_comments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  complaint_id BIGINT UNSIGNED NOT NULL,
  comment TEXT NOT NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY index_internal_comments_complaint (complaint_id, created_at),
  CONSTRAINT fk_internal_comment_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  CONSTRAINT fk_internal_comment_actor FOREIGN KEY (created_by) REFERENCES admin_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS complaint_resolution_documents (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  complaint_id BIGINT UNSIGNED NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  uploaded_by INT UNSIGNED NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY index_resolution_documents_complaint (complaint_id, uploaded_at),
  CONSTRAINT fk_resolution_document_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  CONSTRAINT fk_resolution_document_actor FOREIGN KEY (uploaded_by) REFERENCES admin_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO complaint_statuses (status_key, name, is_final, sort_order) VALUES
  ('new', 'New', 0, 10), ('under_review', 'Under Review', 0, 20),
  ('in_progress', 'In Progress', 0, 30), ('pending_information', 'Pending Information', 0, 40),
  ('resolved', 'Resolved', 0, 50), ('closed', 'Closed', 1, 60),
  ('rejected', 'Rejected', 1, 70), ('duplicate', 'Duplicate', 1, 80),
  ('returned', 'Returned', 0, 45);

INSERT IGNORE INTO complaint_priorities (priority_key, name, sort_order) VALUES
  ('low', 'Low', 10), ('medium', 'Medium', 20), ('high', 'High', 30), ('critical', 'Critical', 40);

INSERT IGNORE INTO complaint_categories (code, name) VALUES
  ('SOCIAL_WELFARE', 'Social welfare or assistance'), ('CHILD_PROTECTION', 'Child protection services'),
  ('FAMILY_SUPPORT', 'Family support services'), ('GBV_RESPONSE', 'Gender-based violence response'),
  ('ELDERLY_SUPPORT', 'Elderly support services'), ('DISABILITY_SERVICES', 'Disability services'),
  ('STAFF_CONDUCT', 'Staff conduct or behaviour'), ('CORRUPTION', 'Corruption or unethical behaviour'),
  ('SERVICE_DELAYS', 'Service delays'), ('DISCRIMINATION', 'Discrimination'),
  ('POLICY', 'Policy implementation'), ('UNCATEGORIZED', 'Uncategorized');

INSERT IGNORE INTO complaint_locations (code, name) VALUES
  ('BELIZE', 'Belize'), ('CAYO', 'Cayo'), ('COROZAL', 'Corozal'),
  ('ORANGE_WALK', 'Orange Walk'), ('STANN_CREEK', 'Stann Creek'), ('TOLEDO', 'Toledo');

INSERT IGNORE INTO workflow_transitions (from_status_id, to_status_id)
SELECT f.id, t.id FROM complaint_statuses f JOIN complaint_statuses t
WHERE (f.status_key='new' AND t.status_key IN ('under_review','rejected','duplicate'))
   OR (f.status_key='under_review' AND t.status_key IN ('in_progress','rejected','duplicate','returned'))
   OR (f.status_key='in_progress' AND t.status_key IN ('pending_information','resolved','returned'))
   OR (f.status_key='pending_information' AND t.status_key IN ('in_progress','resolved'))
   OR (f.status_key='returned' AND t.status_key IN ('in_progress','resolved'))
   OR (f.status_key='resolved' AND t.status_key IN ('closed','in_progress','returned'))
   OR (f.status_key='closed' AND t.status_key='in_progress');

UPDATE complaints c JOIN complaint_statuses s ON s.name=c.status SET c.status_id=s.id WHERE c.status_id IS NULL;
UPDATE complaints c JOIN complaint_priorities p ON p.name=c.ticket_priority SET c.priority_id=p.id WHERE c.priority_id IS NULL;

INSERT INTO permissions (module, action, permission_key, description, is_active) VALUES
  ('configuration', 'manage_routing', 'configuration.routing.manage', 'Manage grievance routing rules', 1),
  ('configuration', 'manage_catalogs', 'configuration.catalogs.manage', 'Manage grievance catalogs and holidays', 1),
  ('grievances', 'extend_due_date', 'grievances.extend_due_date', 'Request or approve grievance due-date changes', 1),
  ('grievances', 'reopen', 'grievances.reopen', 'Reopen closed grievances', 1)
ON DUPLICATE KEY UPDATE description=VALUES(description), is_active=1;

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
  ON p.permission_key IN ('configuration.routing.manage','configuration.catalogs.manage','grievances.extend_due_date','grievances.reopen')
WHERE r.slug='super-admin';
