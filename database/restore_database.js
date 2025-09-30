#!/usr/bin/env node

/**
 * ArchivArt Database Restore Utility
 * 
 * This utility restores the database with all modules, actions, permissions, roles, and admin user.
 * It's designed to work when the production migration has issues or needs to be run manually.
 * 
 * Usage:
 *   node database/restore_database.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'archivartv2',
    port: process.env.DB_PORT || 3306,
    charset: 'utf8mb4'
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function restoreDatabase() {
    try {
        const connection = await mysql.createConnection(config);
        log('✅ Connected to database', 'green');
        
        log('\n=== Restoring Database ===', 'bright');
        
        // Clear existing data
        log('Clearing existing data...', 'yellow');
        await connection.execute('DELETE FROM role_permissions');
        await connection.execute('DELETE FROM user_roles');
        await connection.execute('DELETE FROM permissions');
        await connection.execute('DELETE FROM module_actions');
        await connection.execute('DELETE FROM modules');
        await connection.execute('DELETE FROM roles');
        await connection.execute('DELETE FROM users');
        log('✅ Existing data cleared', 'green');
        
        // Create modules
        log('\nCreating modules...', 'yellow');
        const modules = [
            { name: 'dashboard', display_name: 'Dashboard', description: 'Main dashboard module', order_index: 1 },
            { name: 'users', display_name: 'User Management', description: 'User management module', order_index: 2 },
            { name: 'media', display_name: 'Media Management', description: 'Media management module', order_index: 3 },
            { name: 'rbac', display_name: 'Role & Permissions', description: 'RBAC management module', order_index: 4 },
            { name: 'settings', display_name: 'System Settings', description: 'System settings module', order_index: 5 }
        ];
        
        const moduleIds = {};
        for (const module of modules) {
            const [result] = await connection.execute(`
                INSERT INTO modules (name, display_name, description, order_index, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, 1, NOW(), NOW())
            `, [module.name, module.display_name, module.description, module.order_index]);
            moduleIds[module.name] = result.insertId;
            log(`✅ Created module: ${module.name}`, 'green');
        }
        
        // Create roles
        log('\nCreating roles...', 'yellow');
        const roles = [
            { name: 'super_admin', display_name: 'Super Administrator', description: 'Full system access', is_system_role: 1 },
            { name: 'admin', display_name: 'Administrator', description: 'Administrative access', is_system_role: 0 },
            { name: 'editor', display_name: 'Editor', description: 'Content editing access', is_system_role: 0 },
            { name: 'moderator', display_name: 'Moderator', description: 'Moderation access', is_system_role: 0 },
            { name: 'user', display_name: 'Regular User', description: 'Basic user access', is_system_role: 0 },
            { name: 'viewer', display_name: 'Viewer', description: 'Read-only access', is_system_role: 0 }
        ];
        
        const roleIds = {};
        for (const role of roles) {
            const [result] = await connection.execute(`
                INSERT INTO roles (name, display_name, description, is_system_role, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, 1, NOW(), NOW())
            `, [role.name, role.display_name, role.description, role.is_system_role]);
            roleIds[role.name] = result.insertId;
            log(`✅ Created role: ${role.name}`, 'green');
        }
        
        // Create module actions and permissions
        log('\nCreating module actions and permissions...', 'yellow');
        const actions = [
            // Dashboard
            { module: 'dashboard', action: 'view', display_name: 'View Dashboard', description: 'Access to view the admin dashboard' },
            
            // Users
            { module: 'users', action: 'view', display_name: 'View Users', description: 'View user management' },
            { module: 'users', action: 'create', display_name: 'Create Users', description: 'Create new users' },
            { module: 'users', action: 'update', display_name: 'Update Users', description: 'Update user information' },
            { module: 'users', action: 'delete', display_name: 'Delete Users', description: 'Delete users' },
            { module: 'users', action: 'block', display_name: 'Block Users', description: 'Block/unblock users' },
            
            // Media
            { module: 'media', action: 'view', display_name: 'View Media', description: 'View media management' },
            { module: 'media', action: 'upload', display_name: 'Upload Media', description: 'Upload new media files' },
            { module: 'media', action: 'edit', display_name: 'Edit Media', description: 'Edit media information' },
            { module: 'media', action: 'delete', display_name: 'Delete Media', description: 'Delete media files' },
            { module: 'media', action: 'scan', display_name: 'Scan Media', description: 'Scan media for AR triggers' },
            
            // RBAC
            { module: 'rbac', action: 'view', display_name: 'View RBAC', description: 'Access to view RBAC management' },
            { module: 'rbac', action: 'create', display_name: 'Create RBAC', description: 'Create RBAC components' },
            { module: 'rbac', action: 'update', display_name: 'Update RBAC', description: 'Update RBAC components' },
            { module: 'rbac', action: 'delete', display_name: 'Delete RBAC', description: 'Delete RBAC components' },
            { module: 'rbac', action: 'assign_roles', display_name: 'Assign Roles', description: 'Assign roles to users' },
            
            // Settings
            { module: 'settings', action: 'view', display_name: 'View Settings', description: 'View system settings' },
            { module: 'settings', action: 'update', display_name: 'Update Settings', description: 'Update system settings' }
        ];
        
        const permissionIds = {};
        for (const action of actions) {
            const moduleId = moduleIds[action.module];
            
            // Create action
            const [actionResult] = await connection.execute(`
                INSERT INTO module_actions (module_id, name, display_name, description, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, 1, NOW(), NOW())
            `, [moduleId, action.action, action.display_name, action.description]);
            
            const actionId = actionResult.insertId;
            
            // Create permission
            const [permissionResult] = await connection.execute(`
                INSERT INTO permissions (name, display_name, description, module_id, action_id, resource, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, NULL, NOW(), NOW())
            `, [
                `${action.module}.${action.action}`,
                `${modules.find(m => m.name === action.module).display_name} ${action.display_name}`,
                action.description,
                moduleId,
                actionId
            ]);
            
            permissionIds[`${action.module}.${action.action}`] = permissionResult.insertId;
            log(`✅ Created: ${action.module}.${action.action}`, 'green');
        }
        
        // Create admin user
        log('\nCreating admin user...', 'yellow');
        const [userResult] = await connection.execute(`
            INSERT INTO users (name, email, username, password, is_active, is_blocked, created_at, updated_at)
            VALUES (?, ?, ?, ?, 1, 0, NOW(), NOW())
        `, ['Admin User', 'admin@archivart.com', 'admin', '$2b$10$9PP1adwj1AZe3l7BGniAfOacoRkEBJ5E2Ka7XdgAGuzI/G11yKjoK']);
        
        const adminUserId = userResult.insertId;
        log('✅ Created admin user', 'green');
        
        // Assign super_admin role to admin user
        await connection.execute(`
            INSERT INTO user_roles (user_id, role_id, is_active, created_at, updated_at)
            VALUES (?, ?, 1, NOW(), NOW())
        `, [adminUserId, roleIds.super_admin]);
        log('✅ Assigned super_admin role to admin user', 'green');
        
        // Assign all permissions to super_admin role
        log('\nAssigning permissions to super_admin role...', 'yellow');
        for (const permissionId of Object.values(permissionIds)) {
            await connection.execute(`
                INSERT INTO role_permissions (role_id, permission_id, is_active, created_at, updated_at)
                VALUES (?, ?, 1, NOW(), NOW())
            `, [roleIds.super_admin, permissionId]);
        }
        log(`✅ Assigned ${Object.keys(permissionIds).length} permissions to super_admin role`, 'green');
        
        // Create settings
        log('\nCreating settings...', 'yellow');
        await connection.execute(`
            INSERT INTO settings (site_name, site_tagline, primary_color, max_file_size, max_uploads_per_day, aws_bucket, aws_region, jwt_expiry, session_timeout, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, ['ArchivArt', 'Digital Archive Management System', '#4f46e5', 100, 50, 'archivart-media', 'us-east-1', 24, 24]);
        log('✅ Created settings', 'green');
        
        // Get final counts
        const [counts] = await connection.execute(`
            SELECT 
                'modules' as table_name, COUNT(*) as count FROM modules
            UNION ALL
            SELECT 'module_actions', COUNT(*) FROM module_actions
            UNION ALL
            SELECT 'permissions', COUNT(*) FROM permissions
            UNION ALL
            SELECT 'roles', COUNT(*) FROM roles
            UNION ALL
            SELECT 'role_permissions', COUNT(*) FROM role_permissions
            UNION ALL
            SELECT 'users', COUNT(*) FROM users
            UNION ALL
            SELECT 'user_roles', COUNT(*) FROM user_roles
            UNION ALL
            SELECT 'settings', COUNT(*) FROM settings
        `);
        
        log('\n=== Database Restored Successfully ===', 'bright');
        counts.forEach(row => {
            log(`${row.table_name.padEnd(20)}: ${row.count} records`, 'cyan');
        });
        
        log('\n✅ Admin credentials:', 'bright');
        log('Email: admin@archivart.com', 'cyan');
        log('Password: admin123', 'cyan');
        
        await connection.end();
    } catch (error) {
        log(`❌ Error: ${error.message}`, 'red');
        process.exit(1);
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    log(`\nUncaught Exception: ${error.message}`, 'red');
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    log(`\nUnhandled Rejection at: ${promise}, reason: ${reason}`, 'red');
    process.exit(1);
});

// Run the restore
restoreDatabase().catch((error) => {
    log(`\nFatal Error: ${error.message}`, 'red');
    process.exit(1);
});
