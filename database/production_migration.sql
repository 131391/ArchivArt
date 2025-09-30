-- =====================================================
-- ArchivArt Production Database Migration
-- =====================================================
-- This script creates a production-ready database with:
-- - Complete database schema
-- - RBAC system with modules and actions
-- - Single admin user with full access
-- - All system permissions and roles
-- Version: 1.0.0
-- Date: 2025-01-23
-- =====================================================

-- Create database (if not exists)
CREATE DATABASE IF NOT EXISTS archivartv2;

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users table (without legacy role column)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    username VARCHAR(50) UNIQUE,
    mobile VARCHAR(20),
    auth_provider ENUM('local', 'google', 'facebook') DEFAULT 'local',
    provider_id VARCHAR(255),
    provider_data JSON NULL COMMENT 'Additional provider data (profile picture, etc.)',
    profile_picture TEXT NULL COMMENT 'User profile picture URL',
    is_active BOOLEAN DEFAULT true,
    is_blocked BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMP NULL,
    last_login_at TIMESTAMP NULL,
    login_count INT DEFAULT 0,
    failed_login_count INT DEFAULT 0,
    last_failed_login_at TIMESTAMP NULL,
    last_activity_at TIMESTAMP NULL COMMENT 'Last user activity timestamp',
    timezone VARCHAR(50) DEFAULT 'UTC' COMMENT 'User timezone',
    language VARCHAR(10) DEFAULT 'en' COMMENT 'User preferred language',
    notifications_enabled BOOLEAN DEFAULT true COMMENT 'Email notifications preference',
    two_factor_enabled BOOLEAN DEFAULT false COMMENT 'Two-factor authentication status',
    two_factor_secret VARCHAR(255) NULL COMMENT '2FA secret key',
    password_changed_at TIMESTAMP NULL COMMENT 'Last password change timestamp',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_users_email (email),
    INDEX idx_users_username (username),
    INDEX idx_users_is_active (is_active),
    INDEX idx_users_is_blocked (is_blocked),
    INDEX idx_users_is_verified (is_verified),
    INDEX idx_users_auth_provider (auth_provider),
    INDEX idx_users_last_login (last_login_at),
    INDEX idx_users_last_activity (last_activity_at),
    INDEX idx_users_two_factor (two_factor_enabled),
    INDEX idx_users_notifications (notifications_enabled)
);

-- Media table
CREATE TABLE IF NOT EXISTS media (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scanning_image TEXT NOT NULL COMMENT 'Scanning image file path or S3 URL',
    image_hash VARCHAR(64) NULL COMMENT 'SHA-256 hash of the scanning image content for duplicate detection',
    perceptual_hash VARCHAR(128) NULL COMMENT 'Perceptual hash for similarity detection',
    descriptors JSON NULL COMMENT 'OpenCV feature descriptors for image matching',
    media_type ENUM('image', 'video', 'audio') NOT NULL,
    file_path TEXT NOT NULL COMMENT 'Media file path or S3 URL',
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
    INDEX idx_media_scanning_image (scanning_image(255)),
    INDEX idx_media_image_hash (image_hash),
    INDEX idx_media_perceptual_hash (perceptual_hash),
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
-- RBAC TABLES
-- =====================================================

-- Modules table
CREATE TABLE IF NOT EXISTS modules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(100) DEFAULT 'fas fa-cube',
    route VARCHAR(100),
    order_index INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_modules_name (name),
    INDEX idx_modules_active (is_active),
    INDEX idx_modules_order (order_index)
);

-- Module actions table
CREATE TABLE IF NOT EXISTS module_actions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    module_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    route VARCHAR(100),
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    UNIQUE KEY unique_module_action (module_id, name),
    INDEX idx_module_actions_module (module_id),
    INDEX idx_module_actions_name (name),
    INDEX idx_module_actions_active (is_active)
);

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system_role TINYINT(1) DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_roles_name (name),
    INDEX idx_roles_active (is_active),
    INDEX idx_roles_system (is_system_role)
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    module_id INT NOT NULL,
    action_id INT NOT NULL,
    resource VARCHAR(100),
    is_system_permission TINYINT(1) DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    FOREIGN KEY (action_id) REFERENCES module_actions(id) ON DELETE CASCADE,
    INDEX idx_permissions_name (name),
    INDEX idx_permissions_module (module_id),
    INDEX idx_permissions_action (action_id),
    INDEX idx_permissions_active (is_active),
    INDEX idx_permissions_system (is_system_permission)
);

-- Role permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_role_permission (role_id, permission_id),
    INDEX idx_role_permissions_role (role_id),
    INDEX idx_role_permissions_permission (permission_id),
    INDEX idx_role_permissions_active (is_active)
);

-- User roles table
CREATE TABLE IF NOT EXISTS user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_role (user_id, role_id),
    INDEX idx_user_roles_user (user_id),
    INDEX idx_user_roles_role (role_id),
    INDEX idx_user_roles_active (is_active)
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
-- INSERT SYSTEM DATA
-- =====================================================

-- Insert system modules
INSERT IGNORE INTO modules (name, display_name, description, icon, route, order_index) VALUES
('dashboard', 'Dashboard', 'Main dashboard and overview', 'fas fa-tachometer-alt', '/admin/dashboard', 1),
('users', 'User Management', 'Manage users and their accounts', 'fas fa-users', '/admin/users', 2),
('media', 'Media Management', 'Upload and manage media files', 'fas fa-images', '/admin/media', 3),
('rbac', 'Role & Permissions', 'Manage roles, permissions, and access control', 'fas fa-shield-alt', '/admin/rbac', 4),
('settings', 'System Settings', 'Configure system settings and preferences', 'fas fa-cog', '/admin/settings', 5);

-- Insert module actions
INSERT IGNORE INTO module_actions (module_id, name, display_name, description, route) VALUES
-- Dashboard actions
((SELECT id FROM modules WHERE name = 'dashboard'), 'view', 'View Dashboard', 'Access the main dashboard', '/admin/dashboard'),

-- User management actions
((SELECT id FROM modules WHERE name = 'users'), 'view', 'View Users', 'View user list and details', '/admin/users'),
((SELECT id FROM modules WHERE name = 'users'), 'create', 'Create Users', 'Create new user accounts', '/admin/users/create'),
((SELECT id FROM modules WHERE name = 'users'), 'update', 'Update Users', 'Edit user information', '/admin/users/edit'),
((SELECT id FROM modules WHERE name = 'users'), 'delete', 'Delete Users', 'Delete user accounts', '/admin/users/delete'),
((SELECT id FROM modules WHERE name = 'users'), 'block', 'Block Users', 'Block or unblock users', '/admin/users/block'),

-- Media management actions
((SELECT id FROM modules WHERE name = 'media'), 'view', 'View Media', 'View media files and gallery', '/admin/media'),
((SELECT id FROM modules WHERE name = 'media'), 'upload', 'Upload Media', 'Upload new media files', '/admin/media/upload'),
((SELECT id FROM modules WHERE name = 'media'), 'edit', 'Edit Media', 'Edit media information', '/admin/media/edit'),
((SELECT id FROM modules WHERE name = 'media'), 'delete', 'Delete Media', 'Delete media files', '/admin/media/delete'),
((SELECT id FROM modules WHERE name = 'media'), 'scan', 'Scan Media', 'Scan and process media files', '/admin/media/scan'),

-- RBAC actions (simplified)
((SELECT id FROM modules WHERE name = 'rbac'), 'view', 'View RBAC', 'View roles and permissions', '/admin/rbac'),
((SELECT id FROM modules WHERE name = 'rbac'), 'create', 'Create RBAC', 'Create new roles, permissions, modules, and actions', '/admin/rbac/create'),
((SELECT id FROM modules WHERE name = 'rbac'), 'update', 'Update RBAC', 'Edit roles, permissions, modules, and actions', '/admin/rbac/update'),
((SELECT id FROM modules WHERE name = 'rbac'), 'delete', 'Delete RBAC', 'Delete roles, permissions, modules, and actions', '/admin/rbac/delete'),
((SELECT id FROM modules WHERE name = 'rbac'), 'assign_roles', 'Assign Roles', 'Assign roles to users', '/admin/rbac/assign'),

-- Settings actions
((SELECT id FROM modules WHERE name = 'settings'), 'view', 'View Settings', 'View system settings', '/admin/settings'),
((SELECT id FROM modules WHERE name = 'settings'), 'update', 'Update Settings', 'Update system settings', '/admin/settings/update');

-- Insert system roles
INSERT IGNORE INTO roles (name, display_name, description, is_system_role) VALUES
('super_admin', 'Super Administrator', 'Full system access with all permissions', 1),
('admin', 'Administrator', 'Administrative access to most system features', 1),
('moderator', 'Moderator', 'Moderation access to content and users', 1),
('editor', 'Editor', 'Content editing and management permissions', 1),
('viewer', 'Viewer', 'Read-only access to system features', 1),
('user', 'Regular User', 'Basic user permissions', 1);

-- Insert all permissions
INSERT IGNORE INTO permissions (name, display_name, description, module_id, action_id, is_system_permission) VALUES
-- Dashboard permissions
('dashboard.view', 'View Dashboard', 'Access the main dashboard', 
 (SELECT id FROM modules WHERE name = 'dashboard'), 
 (SELECT id FROM module_actions WHERE name = 'view' AND module_id = (SELECT id FROM modules WHERE name = 'dashboard')), 1),

-- User management permissions
('users.view', 'View Users', 'View user list and details', 
 (SELECT id FROM modules WHERE name = 'users'), 
 (SELECT id FROM module_actions WHERE name = 'view' AND module_id = (SELECT id FROM modules WHERE name = 'users')), 1),
('users.create', 'Create Users', 'Create new user accounts', 
 (SELECT id FROM modules WHERE name = 'users'), 
 (SELECT id FROM module_actions WHERE name = 'create' AND module_id = (SELECT id FROM modules WHERE name = 'users')), 1),
('users.update', 'Update Users', 'Edit user information', 
 (SELECT id FROM modules WHERE name = 'users'), 
 (SELECT id FROM module_actions WHERE name = 'update' AND module_id = (SELECT id FROM modules WHERE name = 'users')), 1),
('users.delete', 'Delete Users', 'Delete user accounts', 
 (SELECT id FROM modules WHERE name = 'users'), 
 (SELECT id FROM module_actions WHERE name = 'delete' AND module_id = (SELECT id FROM modules WHERE name = 'users')), 1),
('users.block', 'Block Users', 'Block or unblock users', 
 (SELECT id FROM modules WHERE name = 'users'), 
 (SELECT id FROM module_actions WHERE name = 'block' AND module_id = (SELECT id FROM modules WHERE name = 'users')), 1),

-- Media management permissions
('media.view', 'View Media', 'View media files and gallery', 
 (SELECT id FROM modules WHERE name = 'media'), 
 (SELECT id FROM module_actions WHERE name = 'view' AND module_id = (SELECT id FROM modules WHERE name = 'media')), 1),
('media.upload', 'Upload Media', 'Upload new media files', 
 (SELECT id FROM modules WHERE name = 'media'), 
 (SELECT id FROM module_actions WHERE name = 'upload' AND module_id = (SELECT id FROM modules WHERE name = 'media')), 1),
('media.edit', 'Edit Media', 'Edit media information', 
 (SELECT id FROM modules WHERE name = 'media'), 
 (SELECT id FROM module_actions WHERE name = 'edit' AND module_id = (SELECT id FROM modules WHERE name = 'media')), 1),
('media.delete', 'Delete Media', 'Delete media files', 
 (SELECT id FROM modules WHERE name = 'media'), 
 (SELECT id FROM module_actions WHERE name = 'delete' AND module_id = (SELECT id FROM modules WHERE name = 'media')), 1),
('media.scan', 'Scan Media', 'Scan and process media files', 
 (SELECT id FROM modules WHERE name = 'media'), 
 (SELECT id FROM module_actions WHERE name = 'scan' AND module_id = (SELECT id FROM modules WHERE name = 'media')), 1),

-- RBAC permissions (simplified) 
('rbac.view', 'View RBAC', 'View roles and permissions', 
 (SELECT id FROM modules WHERE name = 'rbac'), 
 (SELECT id FROM module_actions WHERE name = 'view' AND module_id = (SELECT id FROM modules WHERE name = 'rbac')), 1),
('rbac.create', 'Create RBAC', 'Create new roles, permissions, modules, and actions', 
 (SELECT id FROM modules WHERE name = 'rbac'), 
 (SELECT id FROM module_actions WHERE name = 'create' AND module_id = (SELECT id FROM modules WHERE name = 'rbac')), 1),
('rbac.update', 'Update RBAC', 'Edit roles, permissions, modules, and actions', 
 (SELECT id FROM modules WHERE name = 'rbac'), 
 (SELECT id FROM module_actions WHERE name = 'update' AND module_id = (SELECT id FROM modules WHERE name = 'rbac')), 1),
('rbac.delete', 'Delete RBAC', 'Delete roles, permissions, modules, and actions', 
 (SELECT id FROM modules WHERE name = 'rbac'), 
 (SELECT id FROM module_actions WHERE name = 'delete' AND module_id = (SELECT id FROM modules WHERE name = 'rbac')), 1),
('rbac.assign_roles', 'Assign Roles', 'Assign roles to users', 
 (SELECT id FROM modules WHERE name = 'rbac'), 
 (SELECT id FROM module_actions WHERE name = 'assign_roles' AND module_id = (SELECT id FROM modules WHERE name = 'rbac')), 1),

-- Settings permissions
('settings.view', 'View Settings', 'View system settings', 
 (SELECT id FROM modules WHERE name = 'settings'), 
 (SELECT id FROM module_actions WHERE name = 'view' AND module_id = (SELECT id FROM modules WHERE name = 'settings')), 1),
('settings.update', 'Update Settings', 'Update system settings', 
 (SELECT id FROM modules WHERE name = 'settings'), 
 (SELECT id FROM module_actions WHERE name = 'update' AND module_id = (SELECT id FROM modules WHERE name = 'settings')), 1);

-- Assign ALL permissions to super_admin role
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'super_admin' AND p.is_active = 1;

-- Insert single admin user (password: admin123)
INSERT IGNORE INTO users (name, email, password, username, auth_provider, is_active, is_blocked, is_verified, timezone, language, notifications_enabled, two_factor_enabled) VALUES 
('Admin User', 'admin@archivart.com', '$2b$10$9PP1adwj1AZe3l7BGniAfOacoRkEBJ5E2Ka7XdgAGuzI/G11yKjoK', 'admin', 'local', true, false, true, 'UTC', 'en', true, false);

-- Assign super_admin role to the admin user
INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email = 'admin@archivart.com' AND r.name = 'super_admin';

-- Insert default settings
INSERT IGNORE INTO settings (site_name, site_tagline, primary_color, max_file_size, max_uploads_per_day, jwt_expiry, session_timeout) 
VALUES ('ArchivArt', 'Your Digital Archive Solution', '#4f46e5', 100, 50, 24, 24);

-- =====================================================
-- CASCADE DELETION STORED PROCEDURES
-- =====================================================

-- Procedure to delete a module and all its related data
DELIMITER //
CREATE PROCEDURE DeleteModuleWithCascade(IN target_module_id INT)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- 1. Delete all role permissions for this module's permissions
    DELETE rp FROM role_permissions rp 
    INNER JOIN permissions p ON rp.permission_id = p.id 
    WHERE p.module_id = target_module_id;
    
    -- 2. Delete all permissions for this module
    DELETE FROM permissions WHERE module_id = target_module_id;
    
    -- 3. Delete all module actions for this module
    DELETE FROM module_actions WHERE module_id = target_module_id;
    
    -- 4. Finally, delete the module itself
    DELETE FROM modules WHERE id = target_module_id;
    
    COMMIT;
END //
DELIMITER ;

-- Procedure to delete a module action and all its related data
DELIMITER //
CREATE PROCEDURE DeleteModuleActionWithCascade(IN action_id INT)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- 1. Delete all role permissions for this action's permissions
    DELETE rp FROM role_permissions rp 
    INNER JOIN permissions p ON rp.permission_id = p.id 
    WHERE p.action_id = action_id;
    
    -- 2. Delete all permissions for this action
    DELETE FROM permissions WHERE action_id = action_id;
    
    -- 3. Finally, delete the action itself
    DELETE FROM module_actions WHERE id = action_id;
    
    COMMIT;
END //
DELIMITER ;

-- Procedure to delete a permission and all its related data
DELIMITER //
CREATE PROCEDURE DeletePermissionWithCascade(IN permission_id INT)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- 1. Delete all role permissions for this permission
    DELETE FROM role_permissions WHERE permission_id = permission_id;
    
    -- 2. Finally, delete the permission itself
    DELETE FROM permissions WHERE id = permission_id;
    
    COMMIT;
END //
DELIMITER ;

-- Procedure to delete a role and all its related data
DELIMITER //
CREATE PROCEDURE DeleteRoleWithCascade(IN role_id INT)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- 1. Delete all user role assignments for this role
    DELETE FROM user_roles WHERE role_id = role_id;
    
    -- 2. Delete all role permissions for this role
    DELETE FROM role_permissions WHERE role_id = role_id;
    
    -- 3. Finally, delete the role itself (only if not system role)
    DELETE FROM roles WHERE id = role_id AND is_system_role = 0;
    
    COMMIT;
END //
DELIMITER ;

-- Procedure to delete a user and all their related data
DELIMITER //
CREATE PROCEDURE DeleteUserWithCascade(IN user_id INT)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- 1. Delete all user sessions
    DELETE FROM user_sessions WHERE user_id = user_id;
    
    -- 2. Delete all user roles
    DELETE FROM user_roles WHERE user_id = user_id;
    
    -- 3. Delete all media uploaded by this user
    DELETE FROM media WHERE uploaded_by = user_id;
    
    
    -- 5. Delete all API usage records for this user
    DELETE FROM api_usage WHERE user_id = user_id;
    
    -- 6. Delete all blacklisted tokens for this user
    DELETE FROM blacklisted_tokens WHERE user_id = user_id;
    
    -- 7. Finally, delete the user itself
    DELETE FROM users WHERE id = user_id;
    
    COMMIT;
END //
DELIMITER ;

-- =====================================================
-- FINAL SETUP
-- =====================================================

-- Commit all changes
COMMIT;

-- Show migration summary
SELECT '=====================================================' as info;
SELECT 'ArchivArt Production Migration Completed Successfully!' as status;
SELECT '=====================================================' as info;

-- Show table counts
SELECT 'USERS' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'MODULES' as table_name, COUNT(*) as record_count FROM modules
UNION ALL
SELECT 'MODULE_ACTIONS' as table_name, COUNT(*) as record_count FROM module_actions
UNION ALL
SELECT 'ROLES' as table_name, COUNT(*) as record_count FROM roles
UNION ALL
SELECT 'PERMISSIONS' as table_name, COUNT(*) as record_count FROM permissions
UNION ALL
SELECT 'ROLE_PERMISSIONS' as table_name, COUNT(*) as record_count FROM role_permissions
UNION ALL
SELECT 'USER_ROLES' as table_name, COUNT(*) as record_count FROM user_roles
UNION ALL
SELECT 'MEDIA' as table_name, COUNT(*) as record_count FROM media
UNION ALL
SELECT 'USER_SESSIONS' as table_name, COUNT(*) as record_count FROM user_sessions
UNION ALL
SELECT 'BLACKLISTED_TOKENS' as table_name, COUNT(*) as record_count FROM blacklisted_tokens
UNION ALL
SELECT 'FAILED_LOGIN_ATTEMPTS' as table_name, COUNT(*) as record_count FROM failed_login_attempts
UNION ALL
SELECT 'API_USAGE' as table_name, COUNT(*) as record_count FROM api_usage
UNION ALL
SELECT 'SETTINGS' as table_name, COUNT(*) as record_count FROM settings;

-- Show admin user details
SELECT '=====================================================' as info;
SELECT 'ADMIN USER DETAILS:' as info;
SELECT '=====================================================' as info;
SELECT 
    u.name as 'Full Name',
    u.email as 'Email',
    u.username as 'Username',
    r.display_name as 'Role',
    COUNT(rp.permission_id) as 'Total Permissions'
FROM users u
INNER JOIN user_roles ur ON u.id = ur.user_id
INNER JOIN roles r ON ur.role_id = r.id
LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_active = 1
WHERE u.email = 'admin@archivart.com'
GROUP BY u.id, u.name, u.email, u.username, r.display_name;

-- Show admin permissions by module
SELECT '=====================================================' as info;
SELECT 'ADMIN PERMISSIONS BY MODULE:' as info;
SELECT '=====================================================' as info;
SELECT 
    m.display_name as 'Module',
    COUNT(p.id) as 'Permissions'
FROM users u
INNER JOIN user_roles ur ON u.id = ur.user_id
INNER JOIN roles r ON ur.role_id = r.id
INNER JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_active = 1
INNER JOIN permissions p ON rp.permission_id = p.id AND p.is_active = 1
INNER JOIN modules m ON p.module_id = m.id
WHERE u.email = 'admin@archivart.com'
GROUP BY m.id, m.display_name
ORDER BY m.order_index;

-- Show admin credentials
SELECT '=====================================================' as info;
SELECT 'ADMIN LOGIN CREDENTIALS:' as info;
SELECT 'Email: admin@archivart.com' as credential;
SELECT 'Password: admin123' as credential;
SELECT '=====================================================' as info;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
