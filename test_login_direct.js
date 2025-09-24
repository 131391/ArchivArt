#!/usr/bin/env node

/**
 * Test direct login functionality
 */

const bcrypt = require('bcryptjs');
const db = require('./src/config/database');

async function testDirectLogin() {
    console.log('🧪 Testing Direct Login for test@example.com...\n');
    
    try {
        const email = 'test@example.com';
        const password = 'admin123';
        
        // Simulate the exact webLogin logic
        console.log('1️⃣ Finding user with RBAC role information:');
        const [users] = await db.execute(
            `SELECT u.id, u.name, u.email, u.password, u.profile_picture, u.is_active, u.is_blocked,
                    r.id as role_id, r.name as role, r.display_name as role_display_name
             FROM users u
             LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = 1
             LEFT JOIN roles r ON ur.role_id = r.id
             WHERE u.email = ?`,
            [email]
        );
        
        if (users.length === 0) {
            console.log('❌ User not found');
            return;
        }
        
        const user = users[0];
        console.log('✅ User found:', user.name, `(${user.role})`);
        
        // Check if account is active
        console.log('\n2️⃣ Checking account status:');
        if (!user.is_active || user.is_blocked) {
            console.log('❌ Account is inactive or blocked');
            console.log(`   is_active: ${user.is_active}`);
            console.log(`   is_blocked: ${user.is_blocked}`);
            return;
        }
        console.log('✅ Account is active');
        
        // Verify password
        console.log('\n3️⃣ Verifying password:');
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            console.log('❌ Invalid password');
            return;
        }
        console.log('✅ Password is valid');
        
        // Check role access (this is the key part)
        console.log('\n4️⃣ Checking role access:');
        console.log(`   User role: "${user.role}"`);
        console.log(`   Role check: user.role !== 'user'`);
        console.log(`   Result: ${user.role} !== 'user' = ${user.role !== 'user'}`);
        
        if (!user.role || user.role === 'user') {
            console.log('❌ Access denied. Admin panel access required.');
            return;
        }
        
        console.log('✅ Role access granted!');
        
        // Show what would be set in session
        console.log('\n5️⃣ Session data that would be set:');
        const sessionData = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            profile_picture: user.profile_picture,
            is_active: user.is_active,
            is_blocked: user.is_blocked
        };
        console.log(JSON.stringify(sessionData, null, 2));
        
        console.log('\n✅ LOGIN SHOULD SUCCEED!');
        console.log('   If login is still failing, the issue might be:');
        console.log('   1. Browser cache - try hard refresh (Ctrl+F5)');
        console.log('   2. Session cookies - clear browser cookies');
        console.log('   3. Server not restarted - but we just restarted it');
        console.log('   4. Different server instance running');
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
        console.error(error.stack);
    }
}

// Run test
testDirectLogin().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
