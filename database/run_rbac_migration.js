const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'archivart',
    multipleStatements: true
};

async function runMigration() {
    let connection;
    
    try {
        console.log('🔄 Starting RBAC migration...');
        
        // Connect to database
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to database');
        
        // Read migration file
        const migrationPath = path.join(__dirname, 'rbac_migration.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Execute migration
        console.log('🔄 Executing RBAC migration...');
        await connection.execute(migrationSQL);
        console.log('✅ RBAC tables created successfully');
        
        // Check if users table has a role column and migrate data
        console.log('🔄 Checking for existing role data...');
        
        // Check if role column exists
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'
        `, [dbConfig.database]);
        
        if (columns.length > 0) {
            console.log('🔄 Found existing role column, migrating data...');
            
            // Get all users with their current roles
            const [users] = await connection.execute(`
                SELECT id, role, temp_role 
                FROM users 
                WHERE role IS NOT NULL AND role != ''
            `);
            
            console.log(`📊 Found ${users.length} users with existing roles`);
            
            // Map old role names to new role IDs
            const roleMapping = {
                'admin': 'admin',
                'administrator': 'admin',
                'user': 'user',
                'regular': 'user',
                'moderator': 'moderator',
                'editor': 'editor',
                'viewer': 'viewer'
            };
            
            let migratedCount = 0;
            
            for (const user of users) {
                const newRoleName = roleMapping[user.role.toLowerCase()] || 'user';
                
                // Get role ID
                const [roles] = await connection.execute(
                    'SELECT id FROM roles WHERE name = ?',
                    [newRoleName]
                );
                
                if (roles.length > 0) {
                    const roleId = roles[0].id;
                    
                    // Assign role to user
                    await connection.execute(`
                        INSERT INTO user_roles (user_id, role_id, is_active, created_at, updated_at)
                        VALUES (?, ?, 1, NOW(), NOW())
                        ON DUPLICATE KEY UPDATE is_active = 1, updated_at = NOW()
                    `, [user.id, roleId]);
                    
                    migratedCount++;
                }
            }
            
            console.log(`✅ Migrated ${migratedCount} user roles`);
            
            // Remove the old role column
            console.log('🔄 Removing old role column...');
            await connection.execute('ALTER TABLE users DROP COLUMN role');
            console.log('✅ Old role column removed');
        } else {
            console.log('ℹ️  No existing role column found, skipping data migration');
        }
        
        // Remove temp_role column if it exists
        try {
            await connection.execute('ALTER TABLE users DROP COLUMN temp_role');
            console.log('✅ Temporary role column removed');
        } catch (error) {
            // Column might not exist, that's okay
        }
        
        // Verify migration
        console.log('🔄 Verifying migration...');
        
        const [roleCount] = await connection.execute('SELECT COUNT(*) as count FROM roles');
        const [permissionCount] = await connection.execute('SELECT COUNT(*) as count FROM permissions');
        const [rolePermissionCount] = await connection.execute('SELECT COUNT(*) as count FROM role_permissions');
        const [userRoleCount] = await connection.execute('SELECT COUNT(*) as count FROM user_roles');
        
        console.log('📊 Migration Summary:');
        console.log(`   - Roles: ${roleCount[0].count}`);
        console.log(`   - Permissions: ${permissionCount[0].count}`);
        console.log(`   - Role-Permission assignments: ${rolePermissionCount[0].count}`);
        console.log(`   - User-Role assignments: ${userRoleCount[0].count}`);
        
        console.log('🎉 RBAC migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run migration if this script is executed directly
if (require.main === module) {
    runMigration()
        .then(() => {
            console.log('✅ Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { runMigration };
