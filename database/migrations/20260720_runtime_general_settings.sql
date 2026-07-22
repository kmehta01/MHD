-- Bring the settings schema to the runtime contract. Defaults are seeded by the
-- application service after this structural migration is applied.
SET @grm_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
  AND TABLE_NAME='system_settings' AND COLUMN_NAME='setting_group')=0,
  'ALTER TABLE system_settings ADD COLUMN setting_group VARCHAR(100) NOT NULL DEFAULT ''general'' AFTER id','SELECT 1');
PREPARE grm_stmt FROM @grm_sql; EXECUTE grm_stmt; DEALLOCATE PREPARE grm_stmt;
SET @grm_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
  AND TABLE_NAME='system_settings' AND COLUMN_NAME='value_type')=0,
  'ALTER TABLE system_settings ADD COLUMN value_type ENUM(''string'',''number'',''boolean'',''json'',''file'',''email'',''url'') NOT NULL DEFAULT ''string'' AFTER setting_value','SELECT 1');
PREPARE grm_stmt FROM @grm_sql; EXECUTE grm_stmt; DEALLOCATE PREPARE grm_stmt;
SET @grm_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
  AND TABLE_NAME='system_settings' AND COLUMN_NAME='is_public')=0,
  'ALTER TABLE system_settings ADD COLUMN is_public TINYINT(1) NOT NULL DEFAULT 0 AFTER value_type','SELECT 1');
PREPARE grm_stmt FROM @grm_sql; EXECUTE grm_stmt; DEALLOCATE PREPARE grm_stmt;
SET @grm_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
  AND TABLE_NAME='system_settings' AND COLUMN_NAME='is_encrypted')=0,
  'ALTER TABLE system_settings ADD COLUMN is_encrypted TINYINT(1) NOT NULL DEFAULT 0 AFTER is_public','SELECT 1');
PREPARE grm_stmt FROM @grm_sql; EXECUTE grm_stmt; DEALLOCATE PREPARE grm_stmt;
SET @grm_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
  AND TABLE_NAME='system_settings' AND COLUMN_NAME='created_by')=0,
  'ALTER TABLE system_settings ADD COLUMN created_by INT UNSIGNED NULL AFTER is_encrypted','SELECT 1');
PREPARE grm_stmt FROM @grm_sql; EXECUTE grm_stmt; DEALLOCATE PREPARE grm_stmt;
SET @grm_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
  AND TABLE_NAME='system_settings' AND COLUMN_NAME='updated_by')=0,
  'ALTER TABLE system_settings ADD COLUMN updated_by INT UNSIGNED NULL AFTER created_by','SELECT 1');
PREPARE grm_stmt FROM @grm_sql; EXECUTE grm_stmt; DEALLOCATE PREPARE grm_stmt;
