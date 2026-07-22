-- Add optional administrator profile photos without replacing existing values.
SET @grm_sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='admin_users' AND COLUMN_NAME='profile_photo')=0,
  'ALTER TABLE admin_users ADD COLUMN profile_photo VARCHAR(255) NULL AFTER phone',
  'SELECT 1'
);
PREPARE grm_stmt FROM @grm_sql; EXECUTE grm_stmt; DEALLOCATE PREPARE grm_stmt;
