-- Assignment, lifecycle, resolution, escalation, and due-date workflow tables.
SET @grm_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
  AND TABLE_NAME='complaints' AND COLUMN_NAME='assigned_officer_id')=0,
  'ALTER TABLE complaints ADD COLUMN assigned_officer_id INT NULL AFTER submitted_department_id','SELECT 1');
PREPARE grm_stmt FROM @grm_sql; EXECUTE grm_stmt; DEALLOCATE PREPARE grm_stmt;
SET @grm_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
  AND TABLE_NAME='complaints' AND COLUMN_NAME='is_escalated')=0,
  'ALTER TABLE complaints ADD COLUMN is_escalated TINYINT(1) NOT NULL DEFAULT 0 AFTER due_at','SELECT 1');
PREPARE grm_stmt FROM @grm_sql; EXECUTE grm_stmt; DEALLOCATE PREPARE grm_stmt;
SET @grm_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
  AND TABLE_NAME='complaints' AND COLUMN_NAME='overdue_at')=0,
  'ALTER TABLE complaints ADD COLUMN overdue_at DATETIME NULL AFTER is_escalated','SELECT 1');
PREPARE grm_stmt FROM @grm_sql; EXECUTE grm_stmt; DEALLOCATE PREPARE grm_stmt;
SET @grm_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
  AND TABLE_NAME='complaints' AND COLUMN_NAME='anonymized_at')=0,
  'ALTER TABLE complaints ADD COLUMN anonymized_at DATETIME NULL AFTER closed_at','SELECT 1');
PREPARE grm_stmt FROM @grm_sql; EXECUTE grm_stmt; DEALLOCATE PREPARE grm_stmt;
SET @grm_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
  AND TABLE_NAME='complaints' AND COLUMN_NAME='resolution_summary')=0,
  'ALTER TABLE complaints ADD COLUMN resolution_summary TEXT NULL AFTER description','SELECT 1');
PREPARE grm_stmt FROM @grm_sql; EXECUTE grm_stmt; DEALLOCATE PREPARE grm_stmt;

CREATE TABLE IF NOT EXISTS department_category_mappings (
  department_id INT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (department_id, category_id),
  KEY index_department_category_category (category_id, is_active),
  CONSTRAINT fk_department_category_department FOREIGN KEY (department_id) REFERENCES departments (id),
  CONSTRAINT fk_department_category_category FOREIGN KEY (category_id) REFERENCES complaint_categories (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workflow_transitions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  from_status_id SMALLINT UNSIGNED NOT NULL,
  to_status_id SMALLINT UNSIGNED NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY unique_workflow_transition (from_status_id, to_status_id),
  KEY fk_transition_to_status (to_status_id),
  CONSTRAINT fk_transition_from_status FOREIGN KEY (from_status_id) REFERENCES complaint_statuses (id),
  CONSTRAINT fk_transition_to_status FOREIGN KEY (to_status_id) REFERENCES complaint_statuses (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS complaint_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  complaint_id BIGINT UNSIGNED NOT NULL,
  from_status_id SMALLINT UNSIGNED NULL,
  to_status_id SMALLINT UNSIGNED NOT NULL,
  comment TEXT NULL,
  changed_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY index_status_history_complaint (complaint_id, created_at),
  KEY fk_status_history_from (from_status_id),
  KEY fk_status_history_to (to_status_id),
  KEY fk_status_history_actor (changed_by),
  CONSTRAINT fk_status_history_complaint FOREIGN KEY (complaint_id) REFERENCES complaints (id) ON DELETE CASCADE,
  CONSTRAINT fk_status_history_from FOREIGN KEY (from_status_id) REFERENCES complaint_statuses (id),
  CONSTRAINT fk_status_history_to FOREIGN KEY (to_status_id) REFERENCES complaint_statuses (id),
  CONSTRAINT fk_status_history_actor FOREIGN KEY (changed_by) REFERENCES admin_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS complaint_assignment_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  complaint_id BIGINT UNSIGNED NOT NULL,
  from_department_id INT UNSIGNED NULL,
  to_department_id INT UNSIGNED NULL,
  assigned_officer_id INT NULL,
  note TEXT NULL,
  assigned_by INT NULL,
  assignment_source ENUM('manual','routing_rule','reassignment') NOT NULL DEFAULT 'manual',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY index_assignment_history_complaint (complaint_id, created_at),
  CONSTRAINT fk_assignment_history_complaint FOREIGN KEY (complaint_id) REFERENCES complaints (id) ON DELETE CASCADE,
  CONSTRAINT fk_assignment_history_from FOREIGN KEY (from_department_id) REFERENCES departments (id) ON DELETE SET NULL,
  CONSTRAINT fk_assignment_history_to FOREIGN KEY (to_department_id) REFERENCES departments (id) ON DELETE SET NULL,
  CONSTRAINT fk_assignment_history_officer FOREIGN KEY (assigned_officer_id) REFERENCES admin_users (id) ON DELETE SET NULL,
  CONSTRAINT fk_assignment_history_actor FOREIGN KEY (assigned_by) REFERENCES admin_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS assignment_routing_rules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  match_type ENUM('category','department','location','fallback') NOT NULL,
  match_value VARCHAR(100) NULL,
  destination_department_id INT UNSIGNED NOT NULL,
  assigned_officer_id INT NULL,
  rule_priority INT NOT NULL DEFAULT 100,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY index_routing_rules_match (match_type, match_value, is_active, rule_priority),
  CONSTRAINT fk_routing_destination FOREIGN KEY (destination_department_id) REFERENCES departments (id),
  CONSTRAINT fk_routing_officer FOREIGN KEY (assigned_officer_id) REFERENCES admin_users (id) ON DELETE SET NULL,
  CONSTRAINT fk_routing_creator FOREIGN KEY (created_by) REFERENCES admin_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS complaint_reassignment_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  complaint_id BIGINT UNSIGNED NOT NULL,
  requested_department_id INT UNSIGNED NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  requested_by INT NOT NULL,
  decided_by INT NULL,
  decision_note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_at DATETIME NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_reassignment_complaint FOREIGN KEY (complaint_id) REFERENCES complaints (id) ON DELETE CASCADE,
  CONSTRAINT fk_reassignment_department FOREIGN KEY (requested_department_id) REFERENCES departments (id),
  CONSTRAINT fk_reassignment_requester FOREIGN KEY (requested_by) REFERENCES admin_users (id),
  CONSTRAINT fk_reassignment_decider FOREIGN KEY (decided_by) REFERENCES admin_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS due_date_extension_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  complaint_id BIGINT UNSIGNED NOT NULL,
  requested_due_at DATETIME NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  requested_by INT NOT NULL,
  decided_by INT NULL,
  decision_note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_at DATETIME NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_due_extension_complaint FOREIGN KEY (complaint_id) REFERENCES complaints (id) ON DELETE CASCADE,
  CONSTRAINT fk_due_extension_requester FOREIGN KEY (requested_by) REFERENCES admin_users (id),
  CONSTRAINT fk_due_extension_decider FOREIGN KEY (decided_by) REFERENCES admin_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS complaint_internal_comments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  complaint_id BIGINT UNSIGNED NOT NULL,
  comment TEXT NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY index_internal_comments_complaint (complaint_id, created_at),
  CONSTRAINT fk_internal_comment_complaint FOREIGN KEY (complaint_id) REFERENCES complaints (id) ON DELETE CASCADE,
  CONSTRAINT fk_internal_comment_actor FOREIGN KEY (created_by) REFERENCES admin_users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS complaint_resolution_documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  complaint_id BIGINT UNSIGNED NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  uploaded_by INT NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY index_resolution_documents_complaint (complaint_id, uploaded_at),
  CONSTRAINT fk_resolution_document_complaint FOREIGN KEY (complaint_id) REFERENCES complaints (id) ON DELETE CASCADE,
  CONSTRAINT fk_resolution_document_actor FOREIGN KEY (uploaded_by) REFERENCES admin_users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS complaint_escalations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  complaint_id BIGINT UNSIGNED NOT NULL,
  escalation_key VARCHAR(120) NOT NULL,
  escalated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_complaint_escalation (complaint_id, escalation_key),
  CONSTRAINT fk_escalation_complaint FOREIGN KEY (complaint_id) REFERENCES complaints (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO workflow_transitions (from_status_id,to_status_id,is_active) VALUES
  (5,6,1),(1,8,1),(2,8,1),(6,3,1),(4,3,1),(5,3,1),(9,3,1),(2,3,1),(3,4,1),
  (1,7,1),(2,7,1),(3,5,1),(4,5,1),(9,5,1),(3,9,1),(5,9,1),(2,9,1),(1,2,1)
ON DUPLICATE KEY UPDATE is_active=VALUES(is_active);
