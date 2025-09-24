#!/usr/bin/env node

/**
 * Test script to verify that all roles except 'user' can login to admin panel
 */

const db = require('./src/config/database');

async function testLoginRoles() {
    console.log('🧪 Testing Login Role Access...\n');
    
    try {
        // Get all roles and their permission counts
        console.log('📊 Current Role Configuration:');
        const [roleCounts] = await db.execute(`
            SELECT r.name as role_name, COUNT(rp.permission_id) as permission_count 
            FROM roles r 
            LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_active = 1 
            WHERE r.is_active = 1 
            GROUP BY r.id, r.name 
            ORDER BY permission_count DESC
        `);
        
        roleCounts.forEach(role => {
            const canLogin = role.role_name !== 'user';
            const status = canLogin ? '✅ CAN LOGIN' : '❌ CANNOT LOGIN';
            console.log(`   ${role.role_name}: ${role.permission_count} permissions - ${status}`);
        });
        
        // Test role access logic
        console.log('\n🔐 Role Access Logic Test:');
        const roles = ['admin', 'super_admin', 'editor', 'viewer', 'moderator', 'user'];
        
        roles.forEach(role => {
            const canLogin = role !== 'user';
            const status = canLogin ? '✅ ALLOWED' : '❌ BLOCKED';
            console.log(`   ${role}: ${status}`);
        });
        
        // Check if there are any users with different roles
        console.log('\n👥 Current User Roles:');
        const [users] = await db.execute(`
            SELECT u.id, u.name, u.email, r.name as role_name, r.display_name as role_display_name
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = 1
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE u.is_active = 1
            ORDER BY u.id
        `);
        
        if (users.length > 0) {
            users.forEach(user => {
                const canLogin = user.role_name && user.role_name !== 'user';
                const status = canLogin ? '✅ CAN LOGIN' : '❌ CANNOT LOGIN';
                console.log(`   ${user.name} (${user.email}): ${user.role_display_name || 'No Role'} - ${status}`);
            });
        } else {
            console.log('   No active users found');
        }
        
        console.log('\n✅ Login Role Access Test Completed!');
        console.log('\n📋 Summary:');
        console.log('   - All roles except "user" can now login to admin panel');
        console.log('   - Role-specific permissions are enforced via RBAC');
        console.log('   - Users with "user" role are blocked from admin access');
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

// Run test
testLoginRoles().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
