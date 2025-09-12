-- ArchivArt Database Migration Script
-- Migrates existing database to enhanced schema with Google auth, username, and mobile support
-- Run this script to update your existing database

USE archivart;

-- Start transaction for safe migration
START TRANSACTION;

-- Step 1: Add new columns to users table
ALTER TABLE users 
ADD COLUMN username VARCHAR(50) UNIQUE NULL COMMENT 'Unique username for user identification' AFTER name,
ADD COLUMN mobile VARCHAR(20) NULL COMMENT 'Mobile number with country code (e.g., +1234567890)' AFTER email,
ADD COLUMN provider_data JSON NULL COMMENT 'Additional provider data (profile picture, etc.)' AFTER provider_id,
ADD COLUMN is_verified BOOLEAN DEFAULT false COMMENT 'Email verification status' AFTER is_blocked,
ADD COLUMN is_mobile_verified BOOLEAN DEFAULT false COMMENT 'Mobile verification status' AFTER is_verified,
ADD COLUMN profile_picture VARCHAR(500) NULL COMMENT 'URL to profile picture' AFTER is_mobile_verified,
ADD COLUMN date_of_birth DATE NULL AFTER profile_picture,
ADD COLUMN gender ENUM('male', 'female', 'other', 'prefer_not_to_say') NULL AFTER date_of_birth,
ADD COLUMN country VARCHAR(100) NULL AFTER gender,
ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC' AFTER country,
ADD COLUMN last_login_at TIMESTAMP NULL AFTER timezone,
ADD COLUMN login_count INT DEFAULT 0 AFTER last_login_at,
ADD COLUMN failed_login_attempts INT DEFAULT 0 AFTER login_count,
ADD COLUMN locked_until TIMESTAMP NULL COMMENT 'Account lockout until this timestamp' AFTER failed_login_attempts;

-- Step 2: Add constraints for data validation (after columns are added)
-- Note: MySQL doesn't support adding multiple constraints in one statement, so we'll add them one by one

-- Step 3: Create user verification tokens table
CREATE TABLE IF NOT EXISTS user_verification_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_type ENUM('email', 'mobile', 'password_reset') NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_verification_token (token),
    INDEX idx_verification_user (user_id),
    INDEX idx_verification_expires (expires_at)
);

-- Step 4: Create user preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    preference_key VARCHAR(100) NOT NULL,
    preference_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_preference (user_id, preference_key),
    INDEX idx_preferences_user (user_id)
);

-- Step 5: Enhance user sessions table
ALTER TABLE user_sessions 
ADD COLUMN refresh_token VARCHAR(255) NULL AFTER session_token,
ADD COLUMN device_info JSON NULL COMMENT 'Device information (browser, OS, etc.)' AFTER refresh_token,
ADD COLUMN ip_address VARCHAR(45) NULL COMMENT 'IPv4 or IPv6 address' AFTER device_info,
ADD COLUMN user_agent TEXT NULL AFTER ip_address,
ADD COLUMN is_active BOOLEAN DEFAULT true AFTER user_agent,
ADD COLUMN last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER is_active;

-- Rename token_hash to session_token for consistency
ALTER TABLE user_sessions CHANGE token_hash session_token VARCHAR(255) NOT NULL;

-- Step 6: Create user activity log table
CREATE TABLE IF NOT EXISTS user_activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    activity_type ENUM('login', 'logout', 'profile_update', 'password_change', 'media_upload', 'media_view') NOT NULL,
    activity_description TEXT,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    metadata JSON NULL COMMENT 'Additional activity metadata',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_activity_user (user_id),
    INDEX idx_activity_type (activity_type),
    INDEX idx_activity_created (created_at)
);

-- Step 7: Add constraints for data validation
ALTER TABLE users ADD CONSTRAINT chk_username_format CHECK (username IS NULL OR (username REGEXP '^[a-zA-Z0-9_]{3,50}$'));

ALTER TABLE users ADD CONSTRAINT chk_mobile_format CHECK (mobile IS NULL OR (mobile REGEXP '^\\+[1-9]\\d{1,14}$'));

ALTER TABLE users ADD CONSTRAINT chk_auth_provider CHECK (
    (auth_provider = 'local' AND password IS NOT NULL) OR 
    (auth_provider IN ('google', 'facebook') AND provider_id IS NOT NULL)
);

-- Step 8: Create new indexes for better performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_mobile ON users(mobile);
CREATE INDEX idx_users_auth_provider ON users(auth_provider);
CREATE INDEX idx_users_provider_id ON users(provider_id);
CREATE INDEX idx_users_is_verified ON users(is_verified);
CREATE INDEX idx_users_last_login ON users(last_login_at);

-- Step 9: Update existing admin user with username
UPDATE users 
SET username = 'admin', is_verified = true 
WHERE email = 'admin@archivart.com' AND role = 'admin';

-- Step 10: Generate usernames for existing users (if they don't have one)
UPDATE users 
SET username = CONCAT('user', id) 
WHERE username IS NULL AND role = 'user';

-- Step 11: Set existing users as verified (since they were created before verification system)
UPDATE users 
SET is_verified = true 
WHERE is_verified = false;

-- Commit the transaction
COMMIT;

-- Show migration summary
SELECT 'Migration completed successfully!' as status;
SELECT 'New features added:' as features;
SELECT '- Username field for all users' as feature1;
SELECT '- Mobile number support' as feature2;
SELECT '- Enhanced Google authentication' as feature3;
SELECT '- User verification system' as feature4;
SELECT '- User preferences system' as feature5;
SELECT '- Activity logging' as feature6;
SELECT '- Enhanced session management' as feature7;

-- Show user statistics
SELECT COUNT(*) as total_users FROM users;
SELECT role, COUNT(*) as count FROM users GROUP BY role;
SELECT auth_provider, COUNT(*) as count FROM users GROUP BY auth_provider;
SELECT 
    COUNT(*) as users_with_username,
    (SELECT COUNT(*) FROM users WHERE username IS NOT NULL) as total_with_username
FROM users;
