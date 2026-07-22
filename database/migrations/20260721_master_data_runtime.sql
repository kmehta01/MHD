-- Replace configurable grievance enums with stable master-data identifiers.
CREATE TABLE IF NOT EXISTS complaint_statuses (
  id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  status_key VARCHAR(80) NOT NULL,
  name VARCHAR(120) NOT NULL,
  reporting_group VARCHAR(40) NOT NULL DEFAULT 'open',
  notification_event VARCHAR(60) NULL,
  is_final TINYINT(1) NOT NULL DEFAULT 0,
  is_system TINYINT(1) NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_complaint_status_key (status_key),
  UNIQUE KEY unique_complaint_status_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS complaint_priorities (
  id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  priority_key VARCHAR(80) NOT NULL,
  name VARCHAR(120) NOT NULL,
  is_high_priority TINYINT(1) NOT NULL DEFAULT 0,
  is_system TINYINT(1) NOT NULL DEFAULT 1,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_complaint_priority_key (priority_key),
  UNIQUE KEY unique_complaint_priority_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS complaint_categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(160) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_complaint_category_code (code),
  UNIQUE KEY unique_complaint_category_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS complaint_locations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(160) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_complaint_location_code (code),
  UNIQUE KEY unique_complaint_location_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO complaint_statuses
  (id,status_key,name,reporting_group,notification_event,is_final,is_system,is_active,sort_order)
VALUES
  (1,'new','New','open','status_change',0,1,1,10),
  (2,'under_review','Under Review','open','status_change',0,1,1,20),
  (3,'in_progress','In Progress','open','status_change',0,1,1,30),
  (4,'pending_information','Pending Information','open','status_change',0,1,1,40),
  (5,'resolved','Resolved','resolved','resolution',0,1,1,50),
  (6,'closed','Closed','closed','closure',1,1,1,60),
  (7,'rejected','Rejected','rejected','status_change',1,1,1,70),
  (8,'duplicate','Duplicate','duplicate','status_change',1,1,1,80),
  (9,'returned','Returned','open','returned',0,1,1,45)
ON DUPLICATE KEY UPDATE name=VALUES(name), reporting_group=VALUES(reporting_group),
  notification_event=VALUES(notification_event), is_final=VALUES(is_final), is_active=VALUES(is_active),
  sort_order=VALUES(sort_order);

INSERT INTO complaint_priorities
  (id,priority_key,name,is_high_priority,is_system,sort_order,is_active)
VALUES
  (1,'low','Low',0,1,10,1), (2,'medium','Medium',0,1,20,1),
  (3,'high','High',1,1,30,1), (4,'critical','Critical',1,1,40,1)
ON DUPLICATE KEY UPDATE name=VALUES(name), is_high_priority=VALUES(is_high_priority),
  sort_order=VALUES(sort_order), is_active=VALUES(is_active);

INSERT INTO complaint_categories (id,code,name,is_active) VALUES
  (1,'SOCIAL_WELFARE','Social welfare or assistance',1),
  (2,'CHILD_PROTECTION','Child protection services',1),
  (3,'FAMILY_SUPPORT','Family support services',1),
  (4,'GBV_RESPONSE','Gender-based violence response',1),
  (5,'ELDERLY_SUPPORT','Elderly support services',1),
  (6,'DISABILITY_SERVICES','Disability services',1),
  (7,'STAFF_CONDUCT','Staff conduct or behaviour',1),
  (8,'CORRUPTION','Corruption or unethical behaviour',1),
  (9,'SERVICE_DELAYS','Service delays',1),
  (10,'DISCRIMINATION','Discrimination',1),
  (11,'POLICY','Policy implementation',1),
  (12,'UNCATEGORIZED','Uncategorized',1)
ON DUPLICATE KEY UPDATE name=VALUES(name), is_active=VALUES(is_active);

INSERT INTO complaint_locations (id,code,name,is_active) VALUES
  (1,'BELIZE','Belize',1), (2,'CAYO','Cayo',1), (3,'COROZAL','Corozal',1),
  (4,'ORANGE_WALK','Orange Walk',1), (5,'STANN_CREEK','Stann Creek',1), (6,'TOLEDO','Toledo',1)
ON DUPLICATE KEY UPDATE name=VALUES(name), is_active=VALUES(is_active);

SET @grm_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
  AND TABLE_NAME='complaints' AND COLUMN_NAME='submitted_department_id')=0,
  'ALTER TABLE complaints ADD COLUMN submitted_department_id INT UNSIGNED NULL AFTER assigned_department_id','SELECT 1');
PREPARE grm_stmt FROM @grm_sql; EXECUTE grm_stmt; DEALLOCATE PREPARE grm_stmt;
SET @grm_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
  AND TABLE_NAME='complaints' AND COLUMN_NAME='priority_id')=0,
  'ALTER TABLE complaints ADD COLUMN priority_id SMALLINT UNSIGNED NULL AFTER assigned_officer_id','SELECT 1');
PREPARE grm_stmt FROM @grm_sql; EXECUTE grm_stmt; DEALLOCATE PREPARE grm_stmt;
SET @grm_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
  AND TABLE_NAME='complaints' AND COLUMN_NAME='category_id')=0,
  'ALTER TABLE complaints ADD COLUMN category_id INT UNSIGNED NULL AFTER ticket_priority','SELECT 1');
PREPARE grm_stmt FROM @grm_sql; EXECUTE grm_stmt; DEALLOCATE PREPARE grm_stmt;
SET @grm_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
  AND TABLE_NAME='complaints' AND COLUMN_NAME='location_id')=0,
  'ALTER TABLE complaints ADD COLUMN location_id INT UNSIGNED NULL AFTER category_id','SELECT 1');
PREPARE grm_stmt FROM @grm_sql; EXECUTE grm_stmt; DEALLOCATE PREPARE grm_stmt;
SET @grm_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
  AND TABLE_NAME='complaints' AND COLUMN_NAME='status_id')=0,
  'ALTER TABLE complaints ADD COLUMN status_id SMALLINT UNSIGNED NULL AFTER incident_date','SELECT 1');
PREPARE grm_stmt FROM @grm_sql; EXECUTE grm_stmt; DEALLOCATE PREPARE grm_stmt;

UPDATE complaints c
JOIN complaint_statuses s ON s.status_key = CASE LOWER(REPLACE(COALESCE(c.status,'new'),' ','_'))
  WHEN 'in_review' THEN 'under_review' ELSE LOWER(REPLACE(COALESCE(c.status,'new'),' ','_')) END
SET c.status_id=s.id WHERE c.status_id IS NULL;

UPDATE complaints c
JOIN complaint_priorities p ON p.priority_key=LOWER(COALESCE(c.ticket_priority,'medium'))
SET c.priority_id=p.id WHERE c.priority_id IS NULL;

UPDATE complaints SET category_id=(SELECT id FROM complaint_categories WHERE code='UNCATEGORIZED' LIMIT 1)
WHERE category_id IS NULL;
