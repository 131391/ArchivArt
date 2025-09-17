-- Security Tables Migration
-- This script creates additional security-related tables

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

-- Add additional columns to users table for enhanced security
ALTER TABLE users 
ADD COLUMN failed_login_count INT DEFAULT 0,
ADD COLUMN last_failed_login TIMESTAMP NULL,
ADD COLUMN password_changed_at TIMESTAMP NULL,
ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN two_factor_secret VARCHAR(255) NULL,
ADD COLUMN login_count INT DEFAULT 0,
ADD COLUMN last_login_at TIMESTAMP NULL,
ADD COLUMN last_activity_at TIMESTAMP NULL,
ADD COLUMN is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN verification_token VARCHAR(255) NULL,
ADD COLUMN verification_token_expires TIMESTAMP NULL,
ADD COLUMN reset_password_token VARCHAR(255) NULL,
ADD COLUMN reset_password_expires TIMESTAMP NULL;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_users_failed_login_count ON users(failed_login_count);
CREATE INDEX IF NOT EXISTS idx_users_last_failed_login ON users(last_failed_login);
CREATE INDEX IF NOT EXISTS idx_users_password_changed_at ON users(password_changed_at);
CREATE INDEX IF NOT EXISTS idx_users_two_factor_enabled ON users(two_factor_enabled);
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
CREATE INDEX IF NOT EXISTS idx_users_reset_password_token ON users(reset_password_token);

-- Add additional columns to user_sessions table
ALTER TABLE user_sessions 
ADD COLUMN ip_address VARCHAR(45),
ADD COLUMN user_agent TEXT,
ADD COLUMN is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_user_sessions_ip_address ON user_sessions(ip_address);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity_at);

-- Create a view for active sessions
CREATE OR REPLACE VIEW active_sessions AS
SELECT 
    us.id,
    us.user_id,
    u.name,
    u.email,
    us.ip_address,
    us.user_agent,
    us.created_at,
    us.last_activity_at,
    us.expires_at
FROM user_sessions us
JOIN users u ON us.user_id = u.id
WHERE us.is_active = TRUE 
AND us.expires_at > NOW()
AND u.is_active = TRUE 
AND u.is_blocked = FALSE;

-- Create a view for security dashboard
CREATE OR REPLACE VIEW security_dashboard AS
SELECT 
    'failed_logins' as metric_type,
    COUNT(*) as count,
    DATE(created_at) as date
FROM failed_login_attempts 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(created_at)

UNION ALL

SELECT 
    'security_events' as metric_type,
    COUNT(*) as count,
    DATE(created_at) as date
FROM security_events 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(created_at)

UNION ALL

SELECT 
    'api_requests' as metric_type,
    COUNT(*) as count,
    DATE(created_at) as date
FROM api_usage 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(created_at);

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

-- Create stored procedure to clean up expired tokens
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS CleanupExpiredTokens()
BEGIN
    -- Clean up expired blacklisted tokens
    DELETE FROM blacklisted_tokens WHERE expires_at < NOW();
    
    -- Clean up expired user sessions
    UPDATE user_sessions SET is_active = FALSE WHERE expires_at < NOW();
    
    -- Clean up old security events (older than 90 days)
    DELETE FROM security_events WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
    
    -- Clean up old API usage logs (older than 30 days)
    DELETE FROM api_usage WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
    
    -- Clean up old failed login attempts (older than 7 days)
    DELETE FROM failed_login_attempts WHERE last_attempt < DATE_SUB(NOW(), INTERVAL 7 DAY);
END //
DELIMITER ;

-- Create event scheduler to run cleanup procedure daily
SET GLOBAL event_scheduler = ON;

CREATE EVENT IF NOT EXISTS daily_security_cleanup
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
  CALL CleanupExpiredTokens();

-- Create function to check if IP is blocked
DELIMITER //
CREATE FUNCTION IF NOT EXISTS IsIPBlocked(ip VARCHAR(45))
RETURNS BOOLEAN
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE blocked_count INT DEFAULT 0;
    
    SELECT COUNT(*) INTO blocked_count
    FROM failed_login_attempts 
    WHERE ip_address = ip 
    AND is_blocked = TRUE 
    AND blocked_until > NOW();
    
    RETURN blocked_count > 0;
END //
DELIMITER ;

-- Create function to check if email is blocked
DELIMITER //
CREATE FUNCTION IF NOT EXISTS IsEmailBlocked(email VARCHAR(255))
RETURNS BOOLEAN
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE blocked_count INT DEFAULT 0;
    
    SELECT COUNT(*) INTO blocked_count
    FROM failed_login_attempts 
    WHERE email = email 
    AND is_blocked = TRUE 
    AND blocked_until > NOW();
    
    RETURN blocked_count > 0;
END //
DELIMITER ;

-- Create trigger to log password changes
DELIMITER //
CREATE TRIGGER IF NOT EXISTS log_password_change
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    IF OLD.password != NEW.password THEN
        INSERT INTO security_events (event_type, user_id, event_data, severity)
        VALUES ('password_changed', NEW.id, JSON_OBJECT('old_password_hash', OLD.password, 'new_password_hash', NEW.password), 'medium');
        
        UPDATE users SET password_changed_at = NOW() WHERE id = NEW.id;
    END IF;
END //
DELIMITER ;

-- Create trigger to log user status changes
DELIMITER //
CREATE TRIGGER IF NOT EXISTS log_user_status_change
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    IF OLD.is_active != NEW.is_active OR OLD.is_blocked != NEW.is_blocked THEN
        INSERT INTO security_events (event_type, user_id, event_data, severity)
        VALUES ('user_status_changed', NEW.id, JSON_OBJECT(
            'old_is_active', OLD.is_active,
            'new_is_active', NEW.is_active,
            'old_is_blocked', OLD.is_blocked,
            'new_is_blocked', NEW.is_blocked
        ), 'high');
    END IF;
END //
DELIMITER ;

-- Create trigger to log failed login attempts
DELIMITER //
CREATE TRIGGER IF NOT EXISTS log_failed_login
AFTER INSERT ON failed_login_attempts
FOR EACH ROW
BEGIN
    INSERT INTO security_events (event_type, event_data, severity)
    VALUES ('failed_login_attempt', JSON_OBJECT(
        'email', NEW.email,
        'ip_address', NEW.ip_address,
        'attempt_count', NEW.attempt_count
    ), 'medium');
END //
DELIMITER ;

COMMIT;
