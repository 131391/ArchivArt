#!/usr/bin/env node

/**
 * ArchivArt Production Migration Runner
 * 
 * This script runs the production database migration that creates:
 * - Complete database schema with RBAC system
 * - Single admin user with full access to all modules and actions
 * - All system permissions and roles
 * 
 * Usage:
 *   node database/run_production_migration.js
 *   node database/run_production_migration.js --drop-db
 *   node database/run_production_migration.js --help
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuration
const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'archivartv2',
    port: process.env.DB_PORT || 3306,
    multipleStatements: true,
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
    log('\nArchivArt Production Migration Runner', 'bright');
    log('=====================================', 'bright');
    log('\nThis script creates a production-ready database with:');
    log('• Complete database schema with RBAC system');
    log('• Single admin user with full access to all modules and actions');
    log('• All system permissions and roles');
    log('\nUsage:', 'bright');
    log('  node database/run_production_migration.js           # Run migration');
    log('  node database/run_production_migration.js --drop-db # Drop and recreate database');
    log('  node database/run_production_migration.js --help    # Show this help');
    log('\nEnvironment Variables:', 'bright');
    log('  DB_HOST     - Database host (default: localhost)');
    log('  DB_USER     - Database user (default: root)');
    log('  DB_PASSWORD - Database password (default: empty)');
    log('  DB_NAME     - Database name (default: archivartv1)');
    log('  DB_PORT     - Database port (default: 3306)');
    log('\nDefault Admin Credentials:', 'bright');
    log('  Email:    admin@archivart.com');
    log('  Password: admin123');
    log('\n');
}

async function testConnection() {
    try {
        log('Testing database connection...', 'yellow');
        const connection = await mysql.createConnection(config);
        await connection.ping();
        await connection.end();
        log('✓ Database connection successful', 'green');
        return true;
    } catch (error) {
        log(`✗ Database connection failed: ${error.message}`, 'red');
        return false;
    }
}

async function dropDatabase() {
    try {
        log('Dropping existing database...', 'yellow');
        const connection = await mysql.createConnection({
            ...config,
            database: undefined
        });
        
        await connection.execute(`DROP DATABASE IF EXISTS ${config.database}`);
        log('✓ Database dropped successfully', 'green');
        await connection.end();
        return true;
    } catch (error) {
        log(`✗ Failed to drop database: ${error.message}`, 'red');
        return false;
    }
}

async function runMigration() {
    try {
        log('Reading migration file...', 'yellow');
        const migrationPath = path.join(__dirname, 'production_migration.sql');
        
        if (!fs.existsSync(migrationPath)) {
            throw new Error('Migration file not found: production_migration.sql');
        }
        
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        log('✓ Migration file loaded', 'green');
        
        log('Connecting to database...', 'yellow');
        const connection = await mysql.createConnection(config);
        log('✓ Connected to database', 'green');
        
        log('Running production migration...', 'yellow');
        log('This may take a few moments...', 'cyan');
        
        const startTime = Date.now();
        await connection.execute(migrationSQL);
        const endTime = Date.now();
        
        log('✓ Production migration completed successfully!', 'green');
        log(`Migration took ${((endTime - startTime) / 1000).toFixed(2)} seconds`, 'cyan');
        
        // Get migration results
        log('\nFetching migration results...', 'yellow');
        
        // Get table counts
        const [tableCounts] = await connection.execute(`
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
            SELECT 'SETTINGS' as table_name, COUNT(*) as record_count FROM settings
        `);
        
        log('\nDatabase Summary:', 'bright');
        log('================', 'bright');
        tableCounts.forEach(row => {
            log(`${row.table_name.padEnd(20)} ${row.record_count.toString().padStart(5)} records`, 'cyan');
        });
        
        // Get admin user details
        const [adminDetails] = await connection.execute(`
            SELECT 
                u.name as full_name,
                u.email as email,
                u.username as username,
                r.display_name as role,
                COUNT(rp.permission_id) as total_permissions
            FROM users u
            INNER JOIN user_roles ur ON u.id = ur.user_id
            INNER JOIN roles r ON ur.role_id = r.id
            LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_active = 1
            WHERE u.email = 'admin@archivart.com'
            GROUP BY u.id, u.name, u.email, u.username, r.display_name
        `);
        
        if (adminDetails.length > 0) {
            const admin = adminDetails[0];
            log('\nAdmin User Details:', 'bright');
            log('==================', 'bright');
            log(`Full Name:     ${admin.full_name}`, 'green');
            log(`Email:         ${admin.email}`, 'green');
            log(`Username:      ${admin.username}`, 'green');
            log(`Role:          ${admin.role}`, 'green');
            log(`Permissions:   ${admin.total_permissions}`, 'green');
        }
        
        // Get permissions by module
        const [permissionsByModule] = await connection.execute(`
            SELECT 
                m.display_name as module,
                COUNT(p.id) as permissions
            FROM users u
            INNER JOIN user_roles ur ON u.id = ur.user_id
            INNER JOIN roles r ON ur.role_id = r.id
            INNER JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_active = 1
            INNER JOIN permissions p ON rp.permission_id = p.id AND p.is_active = 1
            INNER JOIN modules m ON p.module_id = m.id
            WHERE u.email = 'admin@archivart.com'
            GROUP BY m.id, m.display_name
            ORDER BY m.order_index
        `);
        
        log('\nAdmin Permissions by Module:', 'bright');
        log('============================', 'bright');
        permissionsByModule.forEach(row => {
            log(`${row.module.padEnd(20)} ${row.permissions.toString().padStart(3)} permissions`, 'cyan');
        });
        
        await connection.end();
        
        log('\n🎉 Production migration completed successfully!', 'green');
        log('\nNext Steps:', 'bright');
        log('1. Start your ArchivArt application');
        log('2. Login with admin credentials:');
        log('   Email:    admin@archivart.com', 'yellow');
        log('   Password: admin123', 'yellow');
        log('3. Change the admin password immediately');
        log('4. Configure your application settings');
        log('\n');
        
        return true;
    } catch (error) {
        log(`✗ Migration failed: ${error.message}`, 'red');
        if (error.code) {
            log(`Error Code: ${error.code}`, 'red');
        }
        if (error.errno) {
            log(`Error Number: ${error.errno}`, 'red');
        }
        return false;
    }
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
        return;
    }
    
    log('ArchivArt Production Migration Runner', 'bright');
    log('=====================================', 'bright');
    log('');
    
    // Test connection first
    if (!(await testConnection())) {
        log('\nPlease check your database configuration and try again.', 'red');
        process.exit(1);
    }
    
    // Drop database if requested
    if (args.includes('--drop-db')) {
        if (!(await dropDatabase())) {
            log('\nFailed to drop database. Aborting migration.', 'red');
            process.exit(1);
        }
    }
    
    // Run migration
    const success = await runMigration();
    
    if (success) {
        log('Migration completed successfully! 🎉', 'green');
        process.exit(0);
    } else {
        log('Migration failed! ❌', 'red');
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

// Run the migration
main().catch((error) => {
    log(`\nFatal Error: ${error.message}`, 'red');
    process.exit(1);
});
