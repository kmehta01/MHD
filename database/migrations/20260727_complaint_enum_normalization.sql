-- Remove configurable ENUMs and introduce dynamic intake classifications.
CREATE TABLE IF NOT EXISTS complaint_intake_classifications (
  id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  classification_key VARCHAR(80) NOT NULL,
  name VARCHAR(120) NOT NULL,
  help_text VARCHAR(255) NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_intake_classification_key (classification_key),
  UNIQUE KEY unique_intake_classification_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO complaint_intake_classifications
  (id,classification_key,name,sort_order,is_active)
VALUES (1,'level_1','Level 1',10,1), (2,'level_2','Level 2',20,1),
       (3,'level_3','Level 3',30,1), (4,'level_4','Level 4',40,1)
ON DUPLICATE KEY UPDATE name=VALUES(name), sort_order=VALUES(sort_order), is_active=VALUES(is_active);

SET @grm_sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
    AND TABLE_NAME='complaints' AND COLUMN_NAME='office_initial_classification_id')=0,
  'ALTER TABLE complaints ADD COLUMN office_initial_classification_id SMALLINT UNSIGNED NULL AFTER office_initial_classification',
  'SELECT 1'
);
PREPARE grm_stmt FROM @grm_sql; EXECUTE grm_stmt; DEALLOCATE PREPARE grm_stmt;

UPDATE complaints c
JOIN complaint_intake_classifications i
  ON i.name=c.office_initial_classification OR i.classification_key=LOWER(REPLACE(c.office_initial_classification,' ','_'))
SET c.office_initial_classification_id=i.id
WHERE c.office_initial_classification_id IS NULL AND c.office_initial_classification IS NOT NULL;

ALTER TABLE complaints
  MODIFY COLUMN status VARCHAR(80) NULL,
  MODIFY COLUMN ticket_priority VARCHAR(80) NULL,
  MODIFY COLUMN contact_pref VARCHAR(80) NULL,
  MODIFY COLUMN submission_type VARCHAR(32) NOT NULL DEFAULT 'named',
  MODIFY COLUMN intake_source VARCHAR(32) NOT NULL DEFAULT 'public',
  MODIFY COLUMN office_initial_classification VARCHAR(80) NULL,
  MODIFY COLUMN on_behalf TINYINT(1) NULL;
