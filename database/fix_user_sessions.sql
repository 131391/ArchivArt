-- Fix user_sessions table to include all required columns
-- This script adds the missing columns to the existing user_sessions table

USE archivart;

-- Add missing columns to user_sessions table
-- Note: We'll add columns one by one to handle cases where they might already exist

-- Add session_token column
ALTER TABLE user_sessions ADD COLUMN session_token VARCHAR(255) NOT NULL DEFAULT '';

-- Add refresh_token column  
ALTER TABLE user_sessions ADD COLUMN refresh_token VARCHAR(255) NULL;

-- Add is_active column
ALTER TABLE user_sessions ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Add last_activity_at column
ALTER TABLE user_sessions ADD COLUMN last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Add ip_address column
ALTER TABLE user_sessions ADD COLUMN ip_address VARCHAR(45) NULL;

-- Add user_agent column
ALTER TABLE user_sessions ADD COLUMN user_agent TEXT NULL;

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON user_sessions(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_sessions_ip ON user_sessions(ip_address);

-- Update existing records to have default values for new columns
UPDATE user_sessions 
SET session_token = token_hash,
    is_active = true,
    last_activity_at = created_at
WHERE session_token = '';

-- Show the updated table structure
DESCRIBE user_sessions;

SELECT 'user_sessions table updated successfully!' as status;
