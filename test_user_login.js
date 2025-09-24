#!/usr/bin/env node

/**
 * Test script to debug login issues for test@example.com user
 */

const bcrypt = require('bcryptjs');
const db = require('./src/config/database');

async function testUserLogin() {
    console.log('🧪 Testing Login for test@example.com...\n');
    
    try {
        const email = 'test@example.com';
        
        // Step 1: Check if user exists and get their details
        console.log('1️⃣ Checking user existence and details:');
        const [users] = await db.execute(
            `SELECT u.id, u.name, u.email, u.password, u.profile_picture, u.is_active, u.is_blocked, u.is_verified,
                    r.id as role_id, r.name as role, r.display_name as role_display_name
             FROM users u
             LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = 1
             LEFT JOIN roles r ON ur.role_id = r.id
             WHERE u.email = ?`,
            [email]
        );
        
        if (users.length === 0) {
            console.log('❌ User not found in database');
            return;
        }
        
        const user = users[0];
        console.log('✅ User found:');
        console.log(`   ID: ${user.id}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role} (${user.role_display_name})`);
        console.log(`   Is Active: ${user.is_active}`);
        console.log(`   Is Blocked: ${user.is_blocked}`);
        console.log(`   Is Verified: ${user.is_verified}`);
        
        // Step 2: Check role access logic
        console.log('\n2️⃣ Checking role access logic:');
        const canLogin = user.role && user.role !== 'user';
        console.log(`   Role check: ${user.role} !== 'user' = ${canLogin}`);
        
        // Step 3: Check account status
        console.log('\n3️⃣ Checking account status:');
        const accountActive = user.is_active && !user.is_blocked;
        console.log(`   Account active: ${accountActive}`);
        console.log(`   - is_active: ${user.is_active}`);
        console.log(`   - is_blocked: ${user.is_blocked}`);
        
        // Step 4: Test password verification (we'll use a test password)
        console.log('\n4️⃣ Testing password verification:');
        const testPasswords = ['password', 'test123', 'admin123', 'password123'];
        
        for (const testPassword of testPasswords) {
            try {
                const isValid = await bcrypt.compare(testPassword, user.password);
                if (isValid) {
                    console.log(`   ✅ Password "${testPassword}" is correct`);
                    break;
                } else {
                    console.log(`   ❌ Password "${testPassword}" is incorrect`);
                }
            } catch (error) {
                console.log(`   ❌ Error checking password "${testPassword}": ${error.message}`);
            }
        }
        
        // Step 5: Check user_roles table
        console.log('\n5️⃣ Checking user_roles assignment:');
        const [userRoles] = await db.execute(
            'SELECT ur.*, r.name as role_name, r.display_name as role_display_name FROM user_roles ur INNER JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = ?',
            [user.id]
        );
        
        console.log(`   Found ${userRoles.length} role assignment(s):`);
        userRoles.forEach((ur, index) => {
            console.log(`   ${index + 1}. Role: ${ur.role_name} (${ur.role_display_name})`);
            console.log(`      - is_active: ${ur.is_active}`);
            console.log(`      - assigned_at: ${ur.assigned_at}`);
            console.log(`      - expires_at: ${ur.expires_at || 'Never'}`);
        });
        
        // Step 6: Check if role has permissions
        console.log('\n6️⃣ Checking role permissions:');
        if (user.role_id) {
            const [permissions] = await db.execute(
                'SELECT p.name, p.display_name FROM role_permissions rp INNER JOIN permissions p ON rp.permission_id = p.id WHERE rp.role_id = ? AND rp.is_active = 1',
                [user.role_id]
            );
            
            console.log(`   Role "${user.role}" has ${permissions.length} permissions:`);
            permissions.forEach((perm, index) => {
                console.log(`   ${index + 1}. ${perm.name} - ${perm.display_name}`);
            });
        }
        
        // Step 7: Summary
        console.log('\n📋 Login Analysis Summary:');
        console.log(`   User exists: ✅`);
        console.log(`   Role allows login: ${canLogin ? '✅' : '❌'}`);
        console.log(`   Account active: ${accountActive ? '✅' : '❌'}`);
        console.log(`   Has role assignment: ${userRoles.length > 0 ? '✅' : '❌'}`);
        console.log(`   Role has permissions: ${user.role_id ? '✅' : '❌'}`);
        
        if (canLogin && accountActive && userRoles.length > 0) {
            console.log('\n✅ User should be able to login!');
            console.log('   If login is still failing, check:');
            console.log('   1. Password being used');
            console.log('   2. Browser session/cookies');
            console.log('   3. Server logs for specific error messages');
        } else {
            console.log('\n❌ User cannot login due to:');
            if (!canLogin) console.log('   - Role does not allow admin access');
            if (!accountActive) console.log('   - Account is inactive or blocked');
            if (userRoles.length === 0) console.log('   - No role assignment found');
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

// Run test
testUserLogin().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
