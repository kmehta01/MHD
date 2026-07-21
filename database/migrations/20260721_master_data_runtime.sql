ALTER TABLE complaint_statuses
  ADD COLUMN IF NOT EXISTS reporting_group ENUM('open','resolved','closed','rejected','duplicate','other') NOT NULL DEFAULT 'open' AFTER name,
  ADD COLUMN IF NOT EXISTS notification_event ENUM('status_change','resolution','closure','returned') NOT NULL DEFAULT 'status_change' AFTER reporting_group,
  ADD COLUMN IF NOT EXISTS is_system TINYINT(1) NOT NULL DEFAULT 0 AFTER is_final,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE complaint_priorities
  ADD COLUMN IF NOT EXISTS is_high_priority TINYINT(1) NOT NULL DEFAULT 0 AFTER name,
  ADD COLUMN IF NOT EXISTS is_system TINYINT(1) NOT NULL DEFAULT 0 AFTER is_high_priority,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS code VARCHAR(40) NULL AFTER id;

UPDATE departments SET code='MHQ' WHERE (code IS NULL OR code='') AND name='Ministry Headquarters';
UPDATE departments SET code='FSAGA' WHERE (code IS NULL OR code='') AND name='Families and Social Assistance and Gender Affairs';
UPDATE departments SET code='FSAGA' WHERE (code IS NULL OR code='') AND name='Family Support & Gender Affairs';
UPDATE departments SET code='HS' WHERE (code IS NULL OR code='') AND name='Human Services';
UPDATE departments SET code='CR' WHERE (code IS NULL OR code='') AND name='Community Rehabilitation';
UPDATE departments SET code='PP' WHERE (code IS NULL OR code='') AND name='Policy and Planning';
UPDATE departments SET code='PP' WHERE (code IS NULL OR code='') AND name='Policy & Planning';
UPDATE departments SET code='ISSI' WHERE (code IS NULL OR code='') AND name='Information Systems, Statistics and Innovation';
UPDATE departments SET code='ISSI' WHERE (code IS NULL OR code='') AND name='Inspector of Social Services Institutions';

ALTER TABLE departments ADD UNIQUE INDEX IF NOT EXISTS unique_department_code (code);

UPDATE complaint_statuses SET reporting_group='open', notification_event='status_change', is_system=1
 WHERE status_key IN ('new','under_review','in_progress','pending_information') AND is_system=0;
UPDATE complaint_statuses SET reporting_group='open', notification_event='returned', is_system=1 WHERE status_key='returned' AND is_system=0;
UPDATE complaint_statuses SET reporting_group='resolved', notification_event='resolution', is_system=1 WHERE status_key='resolved' AND is_system=0;
UPDATE complaint_statuses SET reporting_group='closed', notification_event='closure', is_system=1 WHERE status_key='closed' AND is_system=0;
UPDATE complaint_statuses SET reporting_group='rejected', notification_event='status_change', is_system=1 WHERE status_key='rejected' AND is_system=0;
UPDATE complaint_statuses SET reporting_group='duplicate', notification_event='status_change', is_system=1 WHERE status_key='duplicate' AND is_system=0;

UPDATE complaint_priorities SET is_system=1, is_high_priority=(priority_key IN ('high','critical'))
 WHERE priority_key IN ('low','medium','high','critical') AND is_system=0;

CREATE TABLE IF NOT EXISTS department_category_mappings (
  department_id INT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (department_id, category_id),
  KEY index_department_category_category (category_id, is_active),
  CONSTRAINT fk_department_category_department FOREIGN KEY (department_id) REFERENCES departments(id),
  CONSTRAINT fk_department_category_category FOREIGN KEY (category_id) REFERENCES complaint_categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO department_category_mappings (department_id, category_id, is_active)
SELECT d.id, c.id, 1 FROM departments d CROSS JOIN complaint_categories c
WHERE d.is_active=1 AND c.is_active=1;

UPDATE complaints c
JOIN complaint_categories cc ON cc.code='UNCATEGORIZED'
SET c.category_id=cc.id
WHERE c.category_id IS NULL;

ALTER TABLE complaints
  MODIFY COLUMN status VARCHAR(80) NULL,
  MODIFY COLUMN ticket_priority VARCHAR(80) NULL,
  ADD INDEX IF NOT EXISTS index_complaints_status_id (status_id),
  ADD INDEX IF NOT EXISTS index_complaints_priority_id (priority_id),
  ADD INDEX IF NOT EXISTS index_complaints_category_id (category_id),
  ADD INDEX IF NOT EXISTS index_complaints_location_id (location_id),
  ADD INDEX IF NOT EXISTS index_complaints_submitted_department_id (submitted_department_id),
  ADD INDEX IF NOT EXISTS index_complaints_assigned_department_id (assigned_department_id);

UPDATE system_settings SET setting_value=CASE LOWER(setting_value)
    WHEN 'submitted' THEN 'new'
    WHEN 'under review' THEN 'under_review'
    WHEN 'in progress' THEN 'in_progress'
    WHEN 'pending information' THEN 'pending_information'
    ELSE LOWER(setting_value)
  END
 WHERE setting_group='workflow' AND setting_key='workflow.defaultNewGrievanceStatus'
   AND LOWER(setting_value) IN ('new','submitted','under review','in progress','pending information','resolved','closed','rejected','duplicate','returned');
UPDATE system_settings SET setting_value=LOWER(setting_value)
 WHERE setting_group='assignment' AND setting_key='assignment.defaultAssignmentPriority'
   AND LOWER(setting_value) IN ('low','medium','high','critical');

INSERT INTO permissions (module, action, permission_key, description, is_active) VALUES
  ('configuration', 'manage_workflow', 'configuration.workflow.manage', 'Manage grievance statuses, priorities and transitions', 1),
  ('configuration', 'manage_departments', 'configuration.departments.manage', 'Manage grievance departments and category mappings', 1)
ON DUPLICATE KEY UPDATE description=VALUES(description), is_active=1;

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
  ON p.permission_key IN ('configuration.workflow.manage','configuration.departments.manage')
WHERE r.slug='super-admin';
