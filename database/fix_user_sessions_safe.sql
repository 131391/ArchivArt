-- Safe migration to fix user_sessions table
-- This script safely adds missing columns to the existing user_sessions table

USE archivart;

-- Check and add session_token column
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'archivart' 
     AND TABLE_NAME = 'user_sessions' 
     AND COLUMN_NAME = 'session_token') = 0,
    'ALTER TABLE user_sessions ADD COLUMN session_token VARCHAR(255) NOT NULL DEFAULT ''''',
    'SELECT "session_token column already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add refresh_token column
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'archivart' 
     AND TABLE_NAME = 'user_sessions' 
     AND COLUMN_NAME = 'refresh_token') = 0,
    'ALTER TABLE user_sessions ADD COLUMN refresh_token VARCHAR(255) NULL',
    'SELECT "refresh_token column already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add is_active column
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'archivart' 
     AND TABLE_NAME = 'user_sessions' 
     AND COLUMN_NAME = 'is_active') = 0,
    'ALTER TABLE user_sessions ADD COLUMN is_active BOOLEAN DEFAULT true',
    'SELECT "is_active column already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add last_activity_at column
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'archivart' 
     AND TABLE_NAME = 'user_sessions' 
     AND COLUMN_NAME = 'last_activity_at') = 0,
    'ALTER TABLE user_sessions ADD COLUMN last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    'SELECT "last_activity_at column already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add ip_address column
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'archivart' 
     AND TABLE_NAME = 'user_sessions' 
     AND COLUMN_NAME = 'ip_address') = 0,
    'ALTER TABLE user_sessions ADD COLUMN ip_address VARCHAR(45) NULL',
    'SELECT "ip_address column already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add user_agent column
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'archivart' 
     AND TABLE_NAME = 'user_sessions' 
     AND COLUMN_NAME = 'user_agent') = 0,
    'ALTER TABLE user_sessions ADD COLUMN user_agent TEXT NULL',
    'SELECT "user_agent column already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update existing records to have default values for new columns
UPDATE user_sessions 
SET session_token = token_hash,
    is_active = true,
    last_activity_at = created_at
WHERE session_token = '' OR session_token IS NULL;

-- Show the updated table structure
DESCRIBE user_sessions;

SELECT 'user_sessions table updated successfully!' as status;
