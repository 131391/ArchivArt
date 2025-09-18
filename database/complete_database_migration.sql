-- =====================================================
-- ArchivArt Complete Database Migration
-- =====================================================
-- This script creates the entire database schema from scratch
-- Includes: Core tables, Security tables, Settings, Sample data
-- Version: 1.0.0
-- Date: 2025-09-18
-- =====================================================

-- Create database (if not exists)
CREATE DATABASE IF NOT EXISTS archivart;
USE archivart;

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    username VARCHAR(50) UNIQUE,
    mobile VARCHAR(20),
    auth_provider ENUM('local', 'google', 'facebook') DEFAULT 'local',
    provider_id VARCHAR(255),
    role ENUM('admin', 'user') DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    is_blocked BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMP NULL,
    last_login_at TIMESTAMP NULL,
    login_count INT DEFAULT 0,
    failed_login_count INT DEFAULT 0,
    last_failed_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_users_email (email),
    INDEX idx_users_username (username),
    INDEX idx_users_role (role),
    INDEX idx_users_is_active (is_active),
    INDEX idx_users_is_blocked (is_blocked),
    INDEX idx_users_is_verified (is_verified),
    INDEX idx_users_auth_provider (auth_provider),
    INDEX idx_users_last_login (last_login_at)
);

-- Media table
CREATE TABLE IF NOT EXISTS media (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scanning_image VARCHAR(255) UNIQUE NOT NULL,
    image_hash VARCHAR(64) NULL COMMENT 'SHA-256 hash of the scanning image content for duplicate detection',
    descriptors JSON NULL COMMENT 'OpenCV feature descriptors for image matching',
    media_type ENUM('image', 'video', 'audio') NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    uploaded_by INT,
    is_active BOOLEAN DEFAULT true,
    view_count INT DEFAULT 0,
    last_viewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Indexes
    INDEX idx_media_scanning_image (scanning_image),
    INDEX idx_media_image_hash (image_hash),
    INDEX idx_media_type (media_type),
    INDEX idx_media_uploaded_by (uploaded_by),
    INDEX idx_media_is_active (is_active),
    INDEX idx_media_created_at (created_at),
    INDEX idx_media_view_count (view_count)
);

-- User sessions table (Enhanced for JWT token management)
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(255) NOT NULL,
    refresh_token VARCHAR(255) NULL,
    token_hash VARCHAR(255) NULL COMMENT 'Legacy field for backward compatibility',
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP NOT NULL,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_sessions_user (user_id),
    INDEX idx_sessions_token (session_token),
    INDEX idx_sessions_refresh_token (refresh_token),
    INDEX idx_sessions_is_active (is_active),
    INDEX idx_sessions_expires (expires_at),
    INDEX idx_sessions_last_activity (last_activity_at),
    INDEX idx_sessions_ip (ip_address)
);

-- =====================================================
-- SECURITY TABLES
-- =====================================================

-- Blacklisted tokens table for token revocation
CREATE TABLE IF NOT EXISTS blacklisted_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    user_id INT,
    reason ENUM('logout', 'password_change', 'admin_revoke', 'security_breach') DEFAULT 'logout',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    
    -- Foreign Keys
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_token_hash (token_hash),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at),
    INDEX idx_reason (reason)
);

-- Security events log table
CREATE TABLE IF NOT EXISTS security_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    user_id INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    event_data JSON,
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Indexes
    INDEX idx_event_type (event_type),
    INDEX idx_user_id (user_id),
    INDEX idx_ip_address (ip_address),
    INDEX idx_created_at (created_at),
    INDEX idx_severity (severity)
);

-- Failed login attempts table
CREATE TABLE IF NOT EXISTS failed_login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    attempt_count INT DEFAULT 1,
    first_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_blocked BOOLEAN DEFAULT FALSE,
    blocked_until TIMESTAMP NULL,
    
    -- Indexes
    INDEX idx_email (email),
    INDEX idx_ip_address (ip_address),
    INDEX idx_is_blocked (is_blocked),
    INDEX idx_blocked_until (blocked_until),
    INDEX idx_last_attempt (last_attempt)
);

-- API usage tracking table
CREATE TABLE IF NOT EXISTS api_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    response_status INT,
    response_time_ms INT,
    request_size_bytes INT,
    response_size_bytes INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Indexes
    INDEX idx_user_id (user_id),
    INDEX idx_endpoint (endpoint),
    INDEX idx_method (method),
    INDEX idx_ip_address (ip_address),
    INDEX idx_created_at (created_at),
    INDEX idx_response_status (response_status)
);

-- =====================================================
-- SETTINGS TABLE
-- =====================================================

-- Settings table for ArchivArt application
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    site_name VARCHAR(255) DEFAULT 'ArchivArt',
    site_tagline VARCHAR(500) DEFAULT NULL,
    primary_color VARCHAR(7) DEFAULT '#4f46e5',
    logo_path VARCHAR(500) DEFAULT NULL,
    max_file_size INT DEFAULT 100,
    max_uploads_per_day INT DEFAULT 50,
    aws_bucket VARCHAR(255) DEFAULT 'archivart-media',
    aws_region VARCHAR(50) DEFAULT 'us-east-1',
    jwt_expiry INT DEFAULT 24,
    session_timeout INT DEFAULT 24,
    smtp_host VARCHAR(255) DEFAULT NULL,
    smtp_port INT DEFAULT NULL,
    smtp_user VARCHAR(255) DEFAULT NULL,
    smtp_password VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_settings_site_name (site_name)
);

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Insert admin user (password: password)
INSERT INTO users (name, email, password, role, auth_provider, is_active, is_verified) VALUES 
('Admin User', 'admin@archivart.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'local', true, true)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Insert dummy users (password for all: password)
INSERT INTO users (name, email, password, role, auth_provider, is_active, is_blocked, is_verified) VALUES 
('John Smith', 'john.smith@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'local', true, false, true),
('Sarah Johnson', 'sarah.johnson@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'local', true, false, true),
('Michael Brown', 'michael.brown@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'local', true, false, true),
('Emily Davis', 'emily.davis@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'local', true, false, true),
('David Wilson', 'david.wilson@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'local', true, false, true),
('Lisa Anderson', 'lisa.anderson@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'local', true, false, true),
('Robert Taylor', 'robert.taylor@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'local', true, false, true),
('Jennifer Martinez', 'jennifer.martinez@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'local', true, false, true),
('Christopher Garcia', 'christopher.garcia@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'local', true, false, true),
('Amanda Rodriguez', 'amanda.rodriguez@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'local', true, false, true),
('James Lee', 'james.lee@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'local', true, false, true),
('Michelle White', 'michelle.white@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'local', true, false, true),
('Daniel Harris', 'daniel.harris@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'local', false, false, true),
('Jessica Thompson', 'jessica.thompson@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'local', true, true, true)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Insert sample media entries (with actual file paths that exist)
INSERT INTO media (title, description, scanning_image, image_hash, media_type, file_path, file_size, mime_type, uploaded_by, is_active) VALUES 
('Welcome Video', 'Welcome message for new users', '02aeb942-4741-466b-b000-5921dc5003e1_scan.jpg', 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6', 'audio', '02aeb942-4741-466b-b000-5921dc5003e1.mp3', 733645, 'audio/mpeg', 1, true),
('Product Demo', 'Interactive product demonstration', '69c345f8-193d-489f-98f8-13c9a20c173e_scan.jpg', 'b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1', 'image', '69c345f8-193d-489f-98f8-13c9a20c173e.jpeg', 8366, 'image/jpeg', 1, true),
('Background Music', 'Ambient background music', '7fd8e240-be90-448c-a089-bb0c59717566_scan.jpg', 'c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2', 'image', '7fd8e240-be90-448c-a089-bb0c59717566.png', 287303, 'image/png', 1, true),
('Tutorial Guide', 'Step-by-step tutorial video', 'e9a6674f-a1fc-40e5-8715-39844bfd4866_scan.jpg', 'd4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2c3', 'video', 'e9a6674f-a1fc-40e5-8715-39844bfd4866.mp4', 825185, 'video/mp4', 2, true)
ON DUPLICATE KEY UPDATE title = VALUES(title);

-- Insert default settings
INSERT INTO settings (site_name, site_tagline, primary_color, max_file_size, max_uploads_per_day, jwt_expiry, session_timeout) 
VALUES ('ArchivArt', 'Your Digital Archive Solution', '#4f46e5', 100, 50, 24, 24)
ON DUPLICATE KEY UPDATE site_name = VALUES(site_name);

-- =====================================================
-- FINAL SETUP
-- =====================================================

-- Commit all changes
COMMIT;

-- Show migration summary
SELECT '=====================================================' as info;
SELECT 'ArchivArt Database Migration Completed Successfully!' as status;
SELECT '=====================================================' as info;

-- Show table counts
SELECT 'USERS' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'MEDIA' as table_name, COUNT(*) as record_count FROM media
UNION ALL
SELECT 'USER_SESSIONS' as table_name, COUNT(*) as record_count FROM user_sessions
UNION ALL
SELECT 'BLACKLISTED_TOKENS' as table_name, COUNT(*) as record_count FROM blacklisted_tokens
UNION ALL
SELECT 'SECURITY_EVENTS' as table_name, COUNT(*) as record_count FROM security_events
UNION ALL
SELECT 'FAILED_LOGIN_ATTEMPTS' as table_name, COUNT(*) as record_count FROM failed_login_attempts
UNION ALL
SELECT 'API_USAGE' as table_name, COUNT(*) as record_count FROM api_usage
UNION ALL
SELECT 'SETTINGS' as table_name, COUNT(*) as record_count FROM settings;

-- Show user role distribution
SELECT 'User Role Distribution:' as info;
SELECT role, COUNT(*) as count FROM users GROUP BY role;

-- Show media type distribution
SELECT 'Media Type Distribution:' as info;
SELECT media_type, COUNT(*) as count FROM media GROUP BY media_type;

-- Show admin credentials
SELECT '=====================================================' as info;
SELECT 'ADMIN LOGIN CREDENTIALS:' as info;
SELECT 'Email: admin@archivart.com' as credential;
SELECT 'Password: password' as credential;
SELECT '=====================================================' as info;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
