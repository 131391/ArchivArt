-- Essential Security Tables Migration
-- This script creates the most important security-related tables

USE archivart;

-- Blacklisted tokens table for token revocation
CREATE TABLE IF NOT EXISTS blacklisted_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    user_id INT,
    reason ENUM('logout', 'password_change', 'admin_revoke', 'security_breach') DEFAULT 'logout',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    INDEX idx_token_hash (token_hash),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
    INDEX idx_event_type (event_type),
    INDEX idx_user_id (user_id),
    INDEX idx_ip_address (ip_address),
    INDEX idx_created_at (created_at),
    INDEX idx_severity (severity),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
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
    INDEX idx_email (email),
    INDEX idx_ip_address (ip_address),
    INDEX idx_is_blocked (is_blocked),
    INDEX idx_blocked_until (blocked_until)
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
    INDEX idx_user_id (user_id),
    INDEX idx_endpoint (endpoint),
    INDEX idx_method (method),
    INDEX idx_ip_address (ip_address),
    INDEX idx_created_at (created_at),
    INDEX idx_response_status (response_status),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert initial security settings
INSERT IGNORE INTO settings (setting_key, setting_value, description) VALUES
('max_failed_login_attempts', '5', 'Maximum failed login attempts before account lockout'),
('account_lockout_duration', '30', 'Account lockout duration in minutes'),
('session_timeout', '1440', 'Session timeout in minutes (24 hours)'),
('password_min_length', '8', 'Minimum password length'),
('password_require_uppercase', 'true', 'Password must contain uppercase letter'),
('password_require_lowercase', 'true', 'Password must contain lowercase letter'),
('password_require_number', 'true', 'Password must contain number'),
('password_require_special', 'true', 'Password must contain special character'),
('rate_limit_enabled', 'true', 'Enable rate limiting'),
('rate_limit_window', '900', 'Rate limit window in seconds (15 minutes)'),
('rate_limit_max_requests', '100', 'Maximum requests per window'),
('security_logging_enabled', 'true', 'Enable security event logging'),
('two_factor_enabled', 'false', 'Enable two-factor authentication'),
('ip_whitelist_enabled', 'false', 'Enable IP whitelist for admin access');

COMMIT;
