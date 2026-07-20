SET @profile_photo_column_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'admin_users'
    AND COLUMN_NAME = 'profile_photo'
);

SET @profile_photo_migration := IF(
  @profile_photo_column_exists = 0,
  'ALTER TABLE admin_users ADD COLUMN profile_photo VARCHAR(255) NULL AFTER phone',
  'SELECT 1'
);

PREPARE profile_photo_statement FROM @profile_photo_migration;
EXECUTE profile_photo_statement;
DEALLOCATE PREPARE profile_photo_statement;
