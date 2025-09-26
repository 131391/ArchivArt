#!/usr/bin/env node

/**
 * ArchivArt Cascade Deletion Utility
 * 
 * This utility provides functions to safely delete modules, actions, permissions, roles, and users
 * with proper cascade deletion to maintain referential integrity.
 * 
 * Usage:
 *   node database/cascade_delete_utility.js --help
 *   node database/cascade_delete_utility.js --delete-module 1
 *   node database/cascade_delete_utility.js --delete-action 5
 *   node database/cascade_delete_utility.js --delete-permission 10
 *   node database/cascade_delete_utility.js --delete-role 2
 *   node database/cascade_delete_utility.js --delete-user 3
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuration
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

function showHelp() {
    log('\nArchivArt Cascade Deletion Utility', 'bright');
    log('==================================', 'bright');
    log('\nThis utility provides safe cascade deletion for RBAC system components.');
    log('\nUsage:', 'bright');
    log('  node database/cascade_delete_utility.js --delete-module <id>     # Delete module and all related data');
    log('  node database/cascade_delete_utility.js --delete-action <id>     # Delete action and all related data');
    log('  node database/cascade_delete_utility.js --delete-permission <id> # Delete permission and all related data');
    log('  node database/cascade_delete_utility.js --delete-role <id>       # Delete role and all related data');
    log('  node database/cascade_delete_utility.js --delete-user <id>       # Delete user and all related data');
    log('  node database/cascade_delete_utility.js --list-modules           # List all modules');
    log('  node database/cascade_delete_utility.js --list-actions           # List all actions');
    log('  node database/cascade_delete_utility.js --list-permissions       # List all permissions');
    log('  node database/cascade_delete_utility.js --list-roles             # List all roles');
    log('  node database/cascade_delete_utility.js --list-users             # List all users');
    log('  node database/cascade_delete_utility.js --help                   # Show this help');
    log('\nExamples:', 'bright');
    log('  node database/cascade_delete_utility.js --delete-module 1        # Delete module with ID 1');
    log('  node database/cascade_delete_utility.js --list-modules           # Show all modules');
    log('\n⚠️  WARNING: These operations are irreversible!', 'red');
    log('\n');
}

async function getConnection() {
    try {
        const connection = await mysql.createConnection(config);
        return connection;
    } catch (error) {
        log(`✗ Database connection failed: ${error.message}`, 'red');
        throw error;
    }
}

async function listModules() {
    try {
        const connection = await getConnection();
        
        const [modules] = await connection.execute(`
            SELECT 
                m.id,
                m.name,
                m.display_name,
                m.description,
                COUNT(ma.id) as action_count,
                COUNT(p.id) as permission_count
            FROM modules m
            LEFT JOIN module_actions ma ON m.id = ma.module_id AND ma.is_active = 1
            LEFT JOIN permissions p ON m.id = p.module_id AND p.is_active = 1
            WHERE m.is_active = 1
            GROUP BY m.id
            ORDER BY m.order_index
        `);
        
        log('\nModules:', 'bright');
        log('========', 'bright');
        modules.forEach(module => {
            log(`ID: ${module.id} | ${module.display_name} (${module.name})`, 'cyan');
            log(`  Actions: ${module.action_count} | Permissions: ${module.permission_count}`, 'yellow');
            if (module.description) {
                log(`  Description: ${module.description}`, 'reset');
            }
            log('');
        });
        
        await connection.end();
    } catch (error) {
        log(`✗ Failed to list modules: ${error.message}`, 'red');
    }
}

async function listActions() {
    try {
        const connection = await getConnection();
        
        const [actions] = await connection.execute(`
            SELECT 
                ma.id,
                ma.name,
                ma.display_name,
                ma.description,
                m.display_name as module_name,
                COUNT(p.id) as permission_count
            FROM module_actions ma
            INNER JOIN modules m ON ma.module_id = m.id
            LEFT JOIN permissions p ON ma.id = p.action_id AND p.is_active = 1
            WHERE ma.is_active = 1 AND m.is_active = 1
            GROUP BY ma.id
            ORDER BY m.order_index, ma.name
        `);
        
        log('\nActions:', 'bright');
        log('========', 'bright');
        actions.forEach(action => {
            log(`ID: ${action.id} | ${action.display_name} (${action.name})`, 'cyan');
            log(`  Module: ${action.module_name} | Permissions: ${action.permission_count}`, 'yellow');
            if (action.description) {
                log(`  Description: ${action.description}`, 'reset');
            }
            log('');
        });
        
        await connection.end();
    } catch (error) {
        log(`✗ Failed to list actions: ${error.message}`, 'red');
    }
}

async function listPermissions() {
    try {
        const connection = await getConnection();
        
        const [permissions] = await connection.execute(`
            SELECT 
                p.id,
                p.name,
                p.display_name,
                p.description,
                m.display_name as module_name,
                ma.display_name as action_name,
                COUNT(rp.role_id) as role_count
            FROM permissions p
            INNER JOIN modules m ON p.module_id = m.id
            INNER JOIN module_actions ma ON p.action_id = ma.id
            LEFT JOIN role_permissions rp ON p.id = rp.permission_id AND rp.is_active = 1
            WHERE p.is_active = 1 AND m.is_active = 1 AND ma.is_active = 1
            GROUP BY p.id
            ORDER BY m.order_index, ma.name, p.name
        `);
        
        log('\nPermissions:', 'bright');
        log('============', 'bright');
        permissions.forEach(permission => {
            log(`ID: ${permission.id} | ${permission.display_name} (${permission.name})`, 'cyan');
            log(`  Module: ${permission.module_name} | Action: ${permission.action_name} | Roles: ${permission.role_count}`, 'yellow');
            if (permission.description) {
                log(`  Description: ${permission.description}`, 'reset');
            }
            log('');
        });
        
        await connection.end();
    } catch (error) {
        log(`✗ Failed to list permissions: ${error.message}`, 'red');
    }
}

async function listRoles() {
    try {
        const connection = await getConnection();
        
        const [roles] = await connection.execute(`
            SELECT 
                r.id,
                r.name,
                r.display_name,
                r.description,
                r.is_system_role,
                COUNT(ur.user_id) as user_count,
                COUNT(rp.permission_id) as permission_count
            FROM roles r
            LEFT JOIN user_roles ur ON r.id = ur.role_id AND ur.is_active = 1
            LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_active = 1
            WHERE r.is_active = 1
            GROUP BY r.id
            ORDER BY r.name
        `);
        
        log('\nRoles:', 'bright');
        log('======', 'bright');
        roles.forEach(role => {
            const systemRole = role.is_system_role ? ' (System Role)' : '';
            log(`ID: ${role.id} | ${role.display_name} (${role.name})${systemRole}`, 'cyan');
            log(`  Users: ${role.user_count} | Permissions: ${role.permission_count}`, 'yellow');
            if (role.description) {
                log(`  Description: ${role.description}`, 'reset');
            }
            log('');
        });
        
        await connection.end();
    } catch (error) {
        log(`✗ Failed to list roles: ${error.message}`, 'red');
    }
}

async function listUsers() {
    try {
        const connection = await getConnection();
        
        const [users] = await connection.execute(`
            SELECT 
                u.id,
                u.name,
                u.email,
                u.username,
                u.is_active,
                u.is_blocked,
                GROUP_CONCAT(r.display_name) as roles
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = 1
            LEFT JOIN roles r ON ur.role_id = r.id AND r.is_active = 1
            GROUP BY u.id
            ORDER BY u.name
        `);
        
        log('\nUsers:', 'bright');
        log('======', 'bright');
        users.forEach(user => {
            const status = user.is_active ? (user.is_blocked ? 'Blocked' : 'Active') : 'Inactive';
            log(`ID: ${user.id} | ${user.name} (${user.email})`, 'cyan');
            log(`  Username: ${user.username || 'N/A'} | Status: ${status}`, 'yellow');
            log(`  Roles: ${user.roles || 'None'}`, 'yellow');
            log('');
        });
        
        await connection.end();
    } catch (error) {
        log(`✗ Failed to list users: ${error.message}`, 'red');
    }
}

async function deleteModule(moduleId) {
    try {
        const connection = await getConnection();
        
        // First, get module details
        const [modules] = await connection.execute('SELECT * FROM modules WHERE id = ?', [moduleId]);
        if (modules.length === 0) {
            log(`✗ Module with ID ${moduleId} not found`, 'red');
            await connection.end();
            return;
        }
        
        const module = modules[0];
        log(`\nDeleting module: ${module.display_name} (${module.name})`, 'yellow');
        
        // Get related data counts
        const [actionCount] = await connection.execute('SELECT COUNT(*) as count FROM module_actions WHERE module_id = ?', [moduleId]);
        const [permissionCount] = await connection.execute('SELECT COUNT(*) as count FROM permissions WHERE module_id = ?', [moduleId]);
        const [rolePermissionCount] = await connection.execute(`
            SELECT COUNT(*) as count FROM role_permissions rp 
            INNER JOIN permissions p ON rp.permission_id = p.id 
            WHERE p.module_id = ?
        `, [moduleId]);
        
        log(`  Actions to delete: ${actionCount[0].count}`, 'yellow');
        log(`  Permissions to delete: ${permissionCount[0].count}`, 'yellow');
        log(`  Role permissions to delete: ${rolePermissionCount[0].count}`, 'yellow');
        
        // Execute cascade deletion
        await connection.execute('CALL DeleteModuleWithCascade(?)', [moduleId]);
        
        log(`✓ Module "${module.display_name}" and all related data deleted successfully`, 'green');
        
        await connection.end();
    } catch (error) {
        log(`✗ Failed to delete module: ${error.message}`, 'red');
    }
}

async function deleteAction(actionId) {
    try {
        const connection = await getConnection();
        
        // First, get action details
        const [actions] = await connection.execute(`
            SELECT ma.*, m.display_name as module_name 
            FROM module_actions ma 
            INNER JOIN modules m ON ma.module_id = m.id 
            WHERE ma.id = ?
        `, [actionId]);
        
        if (actions.length === 0) {
            log(`✗ Action with ID ${actionId} not found`, 'red');
            await connection.end();
            return;
        }
        
        const action = actions[0];
        log(`\nDeleting action: ${action.display_name} (${action.name}) from module: ${action.module_name}`, 'yellow');
        
        // Get related data counts
        const [permissionCount] = await connection.execute('SELECT COUNT(*) as count FROM permissions WHERE action_id = ?', [actionId]);
        const [rolePermissionCount] = await connection.execute(`
            SELECT COUNT(*) as count FROM role_permissions rp 
            INNER JOIN permissions p ON rp.permission_id = p.id 
            WHERE p.action_id = ?
        `, [actionId]);
        
        log(`  Permissions to delete: ${permissionCount[0].count}`, 'yellow');
        log(`  Role permissions to delete: ${rolePermissionCount[0].count}`, 'yellow');
        
        // Execute cascade deletion
        await connection.execute('CALL DeleteModuleActionWithCascade(?)', [actionId]);
        
        log(`✓ Action "${action.display_name}" and all related data deleted successfully`, 'green');
        
        await connection.end();
    } catch (error) {
        log(`✗ Failed to delete action: ${error.message}`, 'red');
    }
}

async function deletePermission(permissionId) {
    try {
        const connection = await getConnection();
        
        // First, get permission details
        const [permissions] = await connection.execute(`
            SELECT p.*, m.display_name as module_name, ma.display_name as action_name 
            FROM permissions p 
            INNER JOIN modules m ON p.module_id = m.id 
            INNER JOIN module_actions ma ON p.action_id = ma.id 
            WHERE p.id = ?
        `, [permissionId]);
        
        if (permissions.length === 0) {
            log(`✗ Permission with ID ${permissionId} not found`, 'red');
            await connection.end();
            return;
        }
        
        const permission = permissions[0];
        log(`\nDeleting permission: ${permission.display_name} (${permission.name})`, 'yellow');
        log(`  Module: ${permission.module_name} | Action: ${permission.action_name}`, 'yellow');
        
        // Get related data counts
        const [rolePermissionCount] = await connection.execute('SELECT COUNT(*) as count FROM role_permissions WHERE permission_id = ?', [permissionId]);
        
        log(`  Role permissions to delete: ${rolePermissionCount[0].count}`, 'yellow');
        
        // Execute cascade deletion
        await connection.execute('CALL DeletePermissionWithCascade(?)', [permissionId]);
        
        log(`✓ Permission "${permission.display_name}" and all related data deleted successfully`, 'green');
        
        await connection.end();
    } catch (error) {
        log(`✗ Failed to delete permission: ${error.message}`, 'red');
    }
}

async function deleteRole(roleId) {
    try {
        const connection = await getConnection();
        
        // First, get role details
        const [roles] = await connection.execute('SELECT * FROM roles WHERE id = ?', [roleId]);
        if (roles.length === 0) {
            log(`✗ Role with ID ${roleId} not found`, 'red');
            await connection.end();
            return;
        }
        
        const role = roles[0];
        
        if (role.is_system_role) {
            log(`✗ Cannot delete system role: ${role.display_name}`, 'red');
            await connection.end();
            return;
        }
        
        log(`\nDeleting role: ${role.display_name} (${role.name})`, 'yellow');
        
        // Get related data counts
        const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM user_roles WHERE role_id = ?', [roleId]);
        const [permissionCount] = await connection.execute('SELECT COUNT(*) as count FROM role_permissions WHERE role_id = ?', [roleId]);
        
        log(`  Users to unassign: ${userCount[0].count}`, 'yellow');
        log(`  Role permissions to delete: ${permissionCount[0].count}`, 'yellow');
        
        // Execute cascade deletion
        await connection.execute('CALL DeleteRoleWithCascade(?)', [roleId]);
        
        log(`✓ Role "${role.display_name}" and all related data deleted successfully`, 'green');
        
        await connection.end();
    } catch (error) {
        log(`✗ Failed to delete role: ${error.message}`, 'red');
    }
}

async function deleteUser(userId) {
    try {
        const connection = await getConnection();
        
        // First, get user details
        const [users] = await connection.execute('SELECT * FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            log(`✗ User with ID ${userId} not found`, 'red');
            await connection.end();
            return;
        }
        
        const user = users[0];
        log(`\nDeleting user: ${user.name} (${user.email})`, 'yellow');
        
        // Get related data counts
        const [sessionCount] = await connection.execute('SELECT COUNT(*) as count FROM user_sessions WHERE user_id = ?', [userId]);
        const [roleCount] = await connection.execute('SELECT COUNT(*) as count FROM user_roles WHERE user_id = ?', [userId]);
        const [mediaCount] = await connection.execute('SELECT COUNT(*) as count FROM media WHERE uploaded_by = ?', [userId]);
        const [securityEventCount] = await connection.execute('SELECT COUNT(*) as count FROM security_events WHERE user_id = ?', [userId]);
        const [apiUsageCount] = await connection.execute('SELECT COUNT(*) as count FROM api_usage WHERE user_id = ?', [userId]);
        const [tokenCount] = await connection.execute('SELECT COUNT(*) as count FROM blacklisted_tokens WHERE user_id = ?', [userId]);
        
        log(`  Sessions to delete: ${sessionCount[0].count}`, 'yellow');
        log(`  Roles to unassign: ${roleCount[0].count}`, 'yellow');
        log(`  Media files to delete: ${mediaCount[0].count}`, 'yellow');
        log(`  Security events to delete: ${securityEventCount[0].count}`, 'yellow');
        log(`  API usage records to delete: ${apiUsageCount[0].count}`, 'yellow');
        log(`  Blacklisted tokens to delete: ${tokenCount[0].count}`, 'yellow');
        
        // Execute cascade deletion
        await connection.execute('CALL DeleteUserWithCascade(?)', [userId]);
        
        log(`✓ User "${user.name}" and all related data deleted successfully`, 'green');
        
        await connection.end();
    } catch (error) {
        log(`✗ Failed to delete user: ${error.message}`, 'red');
    }
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        showHelp();
        return;
    }
    
    log('ArchivArt Cascade Deletion Utility', 'bright');
    log('==================================', 'bright');
    log('');
    
    // Parse arguments
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        switch (arg) {
            case '--list-modules':
                await listModules();
                break;
                
            case '--list-actions':
                await listActions();
                break;
                
            case '--list-permissions':
                await listPermissions();
                break;
                
            case '--list-roles':
                await listRoles();
                break;
                
            case '--list-users':
                await listUsers();
                break;
                
            case '--delete-module':
                const moduleId = parseInt(args[++i]);
                if (isNaN(moduleId)) {
                    log('✗ Invalid module ID', 'red');
                    return;
                }
                await deleteModule(moduleId);
                break;
                
            case '--delete-action':
                const actionId = parseInt(args[++i]);
                if (isNaN(actionId)) {
                    log('✗ Invalid action ID', 'red');
                    return;
                }
                await deleteAction(actionId);
                break;
                
            case '--delete-permission':
                const permissionId = parseInt(args[++i]);
                if (isNaN(permissionId)) {
                    log('✗ Invalid permission ID', 'red');
                    return;
                }
                await deletePermission(permissionId);
                break;
                
            case '--delete-role':
                const roleId = parseInt(args[++i]);
                if (isNaN(roleId)) {
                    log('✗ Invalid role ID', 'red');
                    return;
                }
                await deleteRole(roleId);
                break;
                
            case '--delete-user':
                const userId = parseInt(args[++i]);
                if (isNaN(userId)) {
                    log('✗ Invalid user ID', 'red');
                    return;
                }
                await deleteUser(userId);
                break;
                
            default:
                log(`✗ Unknown argument: ${arg}`, 'red');
                showHelp();
                return;
        }
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

// Run the utility
main().catch((error) => {
    log(`\nFatal Error: ${error.message}`, 'red');
    process.exit(1);
});
