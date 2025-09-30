-- ArchivArt Database Migration - Fixed Version
-- This version includes proper cascade deletion logic

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS archivartv2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE archivartv2;

-- Drop existing tables in correct order to avoid foreign key constraints
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS module_actions;
DROP TABLE IF EXISTS modules;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS media;
DROP TABLE IF EXISTS api_usage;
DROP TABLE IF EXISTS blacklisted_tokens;
DROP TABLE IF EXISTS failed_login_attempts;

-- Create users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    mobile VARCHAR(20),
    profile_picture TEXT,
    auth_provider ENUM('local', 'google', 'facebook', 'github') DEFAULT 'local',
    provider_id VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    is_blocked BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    reset_token VARCHAR(255),
    reset_token_expires DATETIME,
    last_login DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_auth_provider (auth_provider)
);

-- Create roles table
CREATE TABLE roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_is_system_role (is_system_role)
);

-- Create user_roles junction table
CREATE TABLE user_roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_role (user_id, role_id),
    INDEX idx_user_id (user_id),
    INDEX idx_role_id (role_id)
);

-- Create modules table
CREATE TABLE modules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_order_index (order_index)
);

-- Create module_actions table
CREATE TABLE module_actions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    module_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    UNIQUE KEY unique_module_action (module_id, name),
    INDEX idx_module_id (module_id),
    INDEX idx_name (name)
);

-- Create permissions table
CREATE TABLE permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    module_id INT NOT NULL,
    action_id INT NOT NULL,
    name VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    FOREIGN KEY (action_id) REFERENCES module_actions(id) ON DELETE CASCADE,
    INDEX idx_module_id (module_id),
    INDEX idx_action_id (action_id),
    INDEX idx_name (name)
);

-- Create role_permissions junction table
CREATE TABLE role_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_role_permission (role_id, permission_id),
    INDEX idx_role_id (role_id),
    INDEX idx_permission_id (permission_id)
);

-- Create user_sessions table
CREATE TABLE user_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_session_token (session_token),
    INDEX idx_expires_at (expires_at)
);

-- Create media table
CREATE TABLE media (
    id INT PRIMARY KEY AUTO_INCREMENT,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by INT NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_uploaded_by (uploaded_by),
    INDEX idx_is_public (is_public)
);

-- Create api_usage table
CREATE TABLE api_usage (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INT NOT NULL,
    response_time INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_endpoint (endpoint),
    INDEX idx_created_at (created_at)
);

-- Create blacklisted_tokens table
CREATE TABLE blacklisted_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    token VARCHAR(500) NOT NULL,
    reason VARCHAR(255),
    expires_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_token (token),
    INDEX idx_expires_at (expires_at)
);

-- Create failed_login_attempts table
CREATE TABLE failed_login_attempts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_ip_address (ip_address),
    INDEX idx_attempted_at (attempted_at)
);

-- Insert initial data
INSERT INTO modules (name, display_name, description, order_index, is_active) VALUES
('rbac', 'RBAC Management', 'Role-Based Access Control management', 1, 1),
('media', 'Media Management', 'File upload and media management', 2, 1),
('users', 'User Management', 'User account management', 3, 1),
('settings', 'System Settings', 'System configuration and settings', 4, 1);

INSERT INTO module_actions (module_id, name, display_name, description, is_active) VALUES
-- RBAC actions
(1, 'view', 'View', 'View RBAC components', 1),
(1, 'create', 'Create', 'Create new RBAC components', 1),
(1, 'update', 'Update', 'Update existing RBAC components', 1),
(1, 'delete', 'Delete', 'Delete RBAC components', 1),
-- Media actions
(2, 'view', 'View', 'View media files', 1),
(2, 'upload', 'Upload', 'Upload new media files', 1),
(2, 'update', 'Update', 'Update media file information', 1),
(2, 'delete', 'Delete', 'Delete media files', 1),
-- User actions
(3, 'view', 'View', 'View user information', 1),
(3, 'create', 'Create', 'Create new users', 1),
(3, 'update', 'Update', 'Update user information', 1),
(3, 'delete', 'Delete', 'Delete user accounts', 1),
-- Settings actions
(4, 'view', 'View', 'View system settings', 1),
(4, 'update', 'Update', 'Update system settings', 1);

INSERT INTO permissions (module_id, action_id, name, display_name, description, is_active) VALUES
-- RBAC permissions
(1, 1, 'rbac.view', 'View RBAC', 'View RBAC components', 1),
(1, 2, 'rbac.create', 'Create RBAC', 'Create RBAC components', 1),
(1, 3, 'rbac.update', 'Update RBAC', 'Update RBAC components', 1),
(1, 4, 'rbac.delete', 'Delete RBAC', 'Delete RBAC components', 1),
-- Media permissions
(2, 5, 'media.view', 'View Media', 'View media files', 1),
(2, 6, 'media.upload', 'Upload Media', 'Upload media files', 1),
(2, 7, 'media.update', 'Update Media', 'Update media files', 1),
(2, 8, 'media.delete', 'Delete Media', 'Delete media files', 1),
-- User permissions
(3, 9, 'users.view', 'View Users', 'View user information', 1),
(3, 10, 'users.create', 'Create Users', 'Create new users', 1),
(3, 11, 'users.update', 'Update Users', 'Update user information', 1),
(3, 12, 'users.delete', 'Delete Users', 'Delete user accounts', 1),
-- Settings permissions
(4, 13, 'settings.view', 'View Settings', 'View system settings', 1),
(4, 14, 'settings.update', 'Update Settings', 'Update system settings', 1);

INSERT INTO roles (name, display_name, description, is_system_role, is_active) VALUES
('super_admin', 'Super Administrator', 'Full system access with all permissions', 1, 1),
('admin', 'Administrator', 'Administrative access with most permissions', 0, 1),
('moderator', 'Moderator', 'Moderation access for content management', 0, 1),
('user', 'Regular User', 'Basic user access', 0, 1),
('viewer', 'Viewer', 'Read-only access', 0, 1);

-- Insert admin user with hashed password (password: admin123)
INSERT INTO users (name, username, email, password, auth_provider, is_verified, is_active) VALUES
('Admin User', 'admin', 'admin@archivart.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'local', 1, 1);

-- Assign super_admin role to admin user
INSERT INTO user_roles (user_id, role_id, is_active) VALUES (1, 1, 1);

-- Assign all permissions to super_admin role
INSERT INTO role_permissions (role_id, permission_id, is_active) 
SELECT 1, id, 1 FROM permissions WHERE is_active = 1;

-- Assign most permissions to admin role (excluding some super_admin only ones)
INSERT INTO role_permissions (role_id, permission_id, is_active) 
SELECT 2, id, 1 FROM permissions WHERE is_active = 1 AND name NOT IN ('rbac.delete', 'settings.update');

-- Assign basic permissions to moderator role
INSERT INTO role_permissions (role_id, permission_id, is_active) 
SELECT 3, id, 1 FROM permissions WHERE is_active = 1 AND name IN ('media.view', 'media.upload', 'media.update', 'users.view');

-- Assign basic permissions to user role
INSERT INTO role_permissions (role_id, permission_id, is_active) 
SELECT 4, id, 1 FROM permissions WHERE is_active = 1 AND name IN ('media.view', 'media.upload');

-- Assign view-only permissions to viewer role
INSERT INTO role_permissions (role_id, permission_id, is_active) 
SELECT 5, id, 1 FROM permissions WHERE is_active = 1 AND name LIKE '%.view';

-- Create SAFE cascade deletion procedures
-- These procedures only delete data related to the specific entity being deleted

DELIMITER //

-- Procedure to delete a role and ONLY its related data
CREATE PROCEDURE DeleteRoleWithCascade(IN role_id INT)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- 1. Delete all user role assignments for THIS SPECIFIC ROLE ONLY
    DELETE FROM user_roles WHERE role_id = role_id;
    
    -- 2. Delete all role permissions for THIS SPECIFIC ROLE ONLY
    DELETE FROM role_permissions WHERE role_id = role_id;
    
    -- 3. Finally, delete the role itself (only if not system role)
    DELETE FROM roles WHERE id = role_id AND is_system_role = 0;
    
    COMMIT;
END //

-- Procedure to delete a module and its hierarchy (module → actions → permissions → role_permissions)
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

-- Procedure to delete an action and its hierarchy (action → permissions → role_permissions)
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

-- Procedure to delete a permission and ONLY its role assignments
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

-- Procedure to delete a user and all their related data
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
    
    -- 4. Delete all API usage records for this user
    DELETE FROM api_usage WHERE user_id = user_id;
    
    -- 5. Delete all blacklisted tokens for this user
    DELETE FROM blacklisted_tokens WHERE user_id = user_id;
    
    -- 6. Finally, delete the user itself
    DELETE FROM users WHERE id = user_id;
    
    COMMIT;
END //

DELIMITER ;

-- Create stored procedure to get user permissions
DELIMITER //
CREATE PROCEDURE GetUserPermissions(IN user_id INT)
BEGIN
    SELECT DISTINCT p.id, p.name, p.display_name, p.description, m.name as module_name, ma.name as action_name
    FROM permissions p
    INNER JOIN modules m ON p.module_id = m.id
    INNER JOIN module_actions ma ON p.action_id = ma.id
    INNER JOIN role_permissions rp ON p.id = rp.permission_id
    INNER JOIN user_roles ur ON rp.role_id = ur.role_id
    WHERE ur.user_id = user_id 
    AND ur.is_active = 1 
    AND rp.is_active = 1 
    AND p.is_active = 1
    AND m.is_active = 1
    AND ma.is_active = 1
    ORDER BY m.order_index, ma.name, p.name;
END //
DELIMITER ;

-- Create stored procedure to delete user data (for GDPR compliance)
DELIMITER //
CREATE PROCEDURE DeleteUserData(IN user_id INT)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Delete user sessions
    DELETE FROM user_sessions WHERE user_id = user_id;
    
    -- Delete user roles
    DELETE FROM user_roles WHERE user_id = user_id;
    
    -- Delete user media
    DELETE FROM media WHERE uploaded_by = user_id;
    
    -- Delete API usage records
    DELETE FROM api_usage WHERE user_id = user_id;
    
    -- Delete blacklisted tokens
    DELETE FROM blacklisted_tokens WHERE user_id = user_id;
    
    -- Delete user
    DELETE FROM users WHERE id = user_id;
    
    COMMIT;
END //
DELIMITER ;

-- Summary query for database overview
SELECT 
    'Database Setup Complete' as status,
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM roles) as total_roles,
    (SELECT COUNT(*) FROM modules) as total_modules,
    (SELECT COUNT(*) FROM module_actions) as total_actions,
    (SELECT COUNT(*) FROM permissions) as total_permissions,
    (SELECT COUNT(*) FROM user_roles) as total_user_roles,
    (SELECT COUNT(*) FROM role_permissions) as total_role_permissions;
