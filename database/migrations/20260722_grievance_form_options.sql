-- Stable, runtime-managed public grievance form choices.
CREATE TABLE IF NOT EXISTS grievance_form_options (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  option_group ENUM('assistance','submission_channel','accommodation','contact_preference') NOT NULL,
  option_key VARCHAR(80) NOT NULL,
  display_label VARCHAR(160) NOT NULL,
  help_text VARCHAR(255) NULL,
  contact_requirement ENUM('none','phone','email','address') NOT NULL DEFAULT 'none',
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_grievance_form_option (option_group, option_key),
  KEY index_grievance_form_options_active (option_group, is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO grievance_form_options
  (option_group,option_key,display_label,help_text,contact_requirement,sort_order,is_active)
VALUES
  ('assistance','spanish','Spanish',NULL,'none',10,1),
  ('assistance','maya','Maya','Version in preparation','none',20,1),
  ('assistance','garifuna','Garifuna','Version in preparation','none',30,1),
  ('assistance','assisted_completion','Assisted completion',NULL,'none',40,1),
  ('assistance', 'large_print', 'Large print', NULL, 'none', 50, 1),
  ('contact_preference','phone','Phone',NULL,'phone',10,1),
  ('contact_preference','email','Email',NULL,'email',20,1),
  ('contact_preference','mail','Mail',NULL,'address',30,1),
  ('contact_preference','in_person','In person',NULL,'none',40,1),
  ('contact_preference','whatsapp','WhatsApp',NULL,'phone',50,1),
  ('submission_channel','in_person','In person',NULL,'none',10,1),
  ('submission_channel','telephone','Telephone',NULL,'none',20,1),
  ('submission_channel','email','Email',NULL,'none',30,1),
  ('submission_channel','online_form','Online form',NULL,'none',40,1),
  ('submission_channel','mail','Mail',NULL,'none',50,1),
  ('submission_channel','whatsapp','WhatsApp',NULL,'none',60,1),
  ('submission_channel','social_media','Social media',NULL,'none',70,1),
  ('submission_channel','suggestion_box','Suggestion box',NULL,'none',80,1),
  ('accommodation','sign_language','Sign language interpreter',NULL,'none',10,1),
  ('accommodation','wheelchair','Wheelchair accessibility',NULL,'none',20,1),
  ('accommodation','home_visit','Home visit due to mobility',NULL,'none',30,1),
  ('accommodation','translation','Language translation',NULL,'none',40,1)
ON DUPLICATE KEY UPDATE display_label=VALUES(display_label), help_text=VALUES(help_text),
  contact_requirement=VALUES(contact_requirement), sort_order=VALUES(sort_order), is_active=VALUES(is_active);

UPDATE complaints
SET assistance = CASE
  WHEN assistance='Assisted completion' THEN 'assisted_completion'
  WHEN assistance='Large print' THEN 'large_print'
  ELSE assistance END;

ALTER TABLE complaints
  MODIFY COLUMN contact_pref VARCHAR(80) NULL,
  MODIFY COLUMN assistance VARCHAR(80) NULL;
