-- ArchivArt Updated Database Schema
-- Enhanced for Google Authentication with Username and Mobile Support
-- This schema supports both local and Google authentication

-- Create database (if not exists)
CREATE DATABASE IF NOT EXISTS archivart;
USE archivart;

-- Users table with enhanced fields for Google auth, username, and mobile
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Basic user information
    name VARCHAR(255) NOT NULL,
    username VARCHAR(50) UNIQUE NULL COMMENT 'Unique username for user identification',
    email VARCHAR(255) UNIQUE NOT NULL,
    mobile VARCHAR(20) NULL COMMENT 'Mobile number with country code (e.g., +1234567890)',
    
    -- Authentication fields
    password VARCHAR(255) NULL COMMENT 'Hashed password for local auth (NULL for social auth)',
    auth_provider ENUM('local', 'google', 'facebook') DEFAULT 'local',
    provider_id VARCHAR(255) NULL COMMENT 'Social provider user ID (e.g., Google sub)',
    provider_data JSON NULL COMMENT 'Additional provider data (profile picture, etc.)',
    
    -- User status and permissions
    role ENUM('admin', 'user') DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    is_blocked BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false COMMENT 'Email verification status',
    is_mobile_verified BOOLEAN DEFAULT false COMMENT 'Mobile verification status',
    
    -- Profile information
    profile_picture VARCHAR(500) NULL COMMENT 'URL to profile picture',
    date_of_birth DATE NULL,
    gender ENUM('male', 'female', 'other', 'prefer_not_to_say') NULL,
    country VARCHAR(100) NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Security and tracking
    last_login_at TIMESTAMP NULL,
    login_count INT DEFAULT 0,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL COMMENT 'Account lockout until this timestamp',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_username_format CHECK (username IS NULL OR (username REGEXP '^[a-zA-Z0-9_]{3,50}$')),
    CONSTRAINT chk_mobile_format CHECK (mobile IS NULL OR (mobile REGEXP '^\\+[1-9]\\d{1,14}$')),
    CONSTRAINT chk_auth_provider CHECK (
        (auth_provider = 'local' AND password IS NOT NULL) OR 
        (auth_provider IN ('google', 'facebook') AND provider_id IS NOT NULL)
    )
);

-- User verification tokens table
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

-- User preferences table
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

-- Media table (unchanged from original)
CREATE TABLE IF NOT EXISTS media (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scanning_image VARCHAR(255) UNIQUE NOT NULL,
    image_hash VARCHAR(64) NULL COMMENT 'SHA-256 hash of the scanning image content for duplicate detection',
    media_type ENUM('image', 'video', 'audio') NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    uploaded_by INT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_media_image_hash (image_hash)
);

-- User sessions table (enhanced for better session management)
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(255) NOT NULL,
    refresh_token VARCHAR(255) NULL,
    device_info JSON NULL COMMENT 'Device information (browser, OS, etc.)',
    ip_address VARCHAR(45) NULL COMMENT 'IPv4 or IPv6 address',
    user_agent TEXT NULL,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP NOT NULL,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_session_token (session_token),
    INDEX idx_sessions_user (user_id),
    INDEX idx_sessions_expires (expires_at),
    INDEX idx_sessions_active (is_active)
);

-- User activity log table
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

-- Insert default admin user (password: admin123)
INSERT INTO users (name, username, email, password, role, auth_provider, is_verified) VALUES 
('Admin User', 'admin', 'admin@archivart.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'local', true)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_mobile ON users(mobile);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_auth_provider ON users(auth_provider);
CREATE INDEX idx_users_provider_id ON users(provider_id);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_is_blocked ON users(is_blocked);
CREATE INDEX idx_users_is_verified ON users(is_verified);
CREATE INDEX idx_users_last_login ON users(last_login_at);

CREATE INDEX idx_media_scanning_image ON media(scanning_image);
CREATE INDEX idx_media_type ON media(media_type);
CREATE INDEX idx_media_uploaded_by ON media(uploaded_by);
CREATE INDEX idx_media_is_active ON media(is_active);

-- Show summary
SELECT 'Updated schema created successfully!' as status;
SELECT 'Enhanced features:' as features;
SELECT '- Google Authentication support' as feature1;
SELECT '- Username field for user identification' as feature2;
SELECT '- Mobile number with verification' as feature3;
SELECT '- Enhanced security and activity tracking' as feature4;
SELECT '- User preferences system' as feature5;
