-- RBAC Migration Script
-- This script creates the necessary tables for Role-Based Access Control

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_roles_name (name),
    INDEX idx_roles_active (is_active)
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    module VARCHAR(50) NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_permissions_name (name),
    INDEX idx_permissions_module (module),
    INDEX idx_permissions_active (is_active)
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_role_permission (role_id, permission_id),
    INDEX idx_role_permissions_role (role_id),
    INDEX idx_role_permissions_permission (permission_id),
    INDEX idx_role_permissions_active (is_active)
);

-- Create user_roles table (replaces the role column in users table)
CREATE TABLE IF NOT EXISTS user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_role (user_id, role_id),
    INDEX idx_user_roles_user (user_id),
    INDEX idx_user_roles_role (role_id),
    INDEX idx_user_roles_active (is_active)
);

-- Insert default roles
INSERT IGNORE INTO roles (name, display_name, description) VALUES
('super_admin', 'Super Administrator', 'Full system access with all permissions'),
('admin', 'Administrator', 'Administrative access to most system features'),
('moderator', 'Moderator', 'Moderation access to content and users'),
('editor', 'Editor', 'Content editing and management permissions'),
('viewer', 'Viewer', 'Read-only access to system features'),
('user', 'Regular User', 'Basic user permissions');

-- Insert default permissions
INSERT IGNORE INTO permissions (name, display_name, description, module) VALUES
-- User Management
('admin.users.view', 'View Users', 'View user list and details', 'admin'),
('admin.users.create', 'Create Users', 'Create new users', 'admin'),
('admin.users.update', 'Update Users', 'Update user information', 'admin'),
('admin.users.delete', 'Delete Users', 'Delete users', 'admin'),
('admin.users.block', 'Block Users', 'Block/unblock users', 'admin'),

-- Media Management
('media.view', 'View Media', 'View media files', 'media'),
('media.create', 'Create Media', 'Upload new media files', 'media'),
('media.update', 'Update Media', 'Edit media information', 'media'),
('media.delete', 'Delete Media', 'Delete media files', 'media'),
('media.manage', 'Manage Media', 'Full media management', 'media'),

-- RBAC Management
('rbac.roles.view', 'View Roles', 'View roles and permissions', 'rbac'),
('rbac.roles.create', 'Create Roles', 'Create new roles', 'rbac'),
('rbac.roles.update', 'Update Roles', 'Update role information', 'rbac'),
('rbac.roles.delete', 'Delete Roles', 'Delete roles', 'rbac'),
('rbac.permissions.view', 'View Permissions', 'View permissions', 'rbac'),
('rbac.permissions.create', 'Create Permissions', 'Create new permissions', 'rbac'),
('rbac.permissions.update', 'Update Permissions', 'Update permission information', 'rbac'),
('rbac.permissions.delete', 'Delete Permissions', 'Delete permissions', 'rbac'),
('rbac.users.view', 'View User Roles', 'View user role assignments', 'rbac'),
('rbac.users.update', 'Update User Roles', 'Assign/remove user roles', 'rbac'),

-- System Management
('system.settings.view', 'View Settings', 'View system settings', 'system'),
('system.settings.update', 'Update Settings', 'Update system settings', 'system'),
('system.logs.view', 'View Logs', 'View system logs', 'system'),
('system.backup', 'System Backup', 'Create system backups', 'system');

-- Assign permissions to roles
-- Super Admin gets all permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'super_admin';

-- Admin gets most permissions except super admin specific ones
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' 
AND p.name NOT IN ('rbac.roles.delete', 'rbac.permissions.delete', 'system.backup');

-- Moderator gets user and media management permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'moderator' 
AND p.name IN (
    'admin.users.view', 'admin.users.block',
    'media.view', 'media.create', 'media.update', 'media.delete'
);

-- Editor gets media management permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'editor' 
AND p.name IN (
    'media.view', 'media.create', 'media.update'
);

-- Viewer gets read-only permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'viewer' 
AND p.name IN (
    'admin.users.view', 'media.view'
);

-- Regular user gets basic permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'user' 
AND p.name IN (
    'media.view'
);

-- Assign default roles to existing users
-- This assumes existing users have a 'role' column that we'll migrate
-- First, let's add a temporary column to track the migration
ALTER TABLE users ADD COLUMN IF NOT EXISTS temp_role VARCHAR(50);

-- Update temp_role based on existing role column (if it exists)
-- This will be handled in the application migration script

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_temp_role ON users(temp_role);

-- Add comments to tables
ALTER TABLE roles COMMENT = 'System roles for RBAC';
ALTER TABLE permissions COMMENT = 'System permissions for RBAC';
ALTER TABLE role_permissions COMMENT = 'Junction table linking roles to permissions';
ALTER TABLE user_roles COMMENT = 'User role assignments for RBAC';
