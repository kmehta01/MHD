-- Forward-only repair for databases whose historical migration records predate
-- the final complaint runtime contract. Existing grievance data is preserved.
SET @grm_sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='complaints' AND COLUMN_NAME='resolution_summary')=0,
  'ALTER TABLE complaints ADD COLUMN resolution_summary TEXT NULL AFTER desired_outcome',
  'SELECT 1'
);
PREPARE grm_stmt FROM @grm_sql; EXECUTE grm_stmt; DEALLOCATE PREPARE grm_stmt;

CREATE TABLE IF NOT EXISTS schema_migrations (
  migration_key VARCHAR(190) NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (migration_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
