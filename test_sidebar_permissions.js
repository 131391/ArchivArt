#!/usr/bin/env node

/**
 * Test script to verify permission-based sidebar navigation
 */

const db = require('./src/config/database');

async function testSidebarPermissions() {
    console.log('🧪 Testing Permission-Based Sidebar Navigation...\n');
    
    try {
        // Test editor role permissions
        console.log('1️⃣ Testing Editor Role Permissions:');
        const [editorPermissions] = await db.execute(`
            SELECT p.name, p.module 
            FROM roles r 
            INNER JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_active = 1 
            INNER JOIN permissions p ON rp.permission_id = p.id 
            WHERE r.name = 'editor' 
            ORDER BY p.module, p.name
        `);
        
        console.log('   Editor has these permissions:');
        editorPermissions.forEach(perm => {
            console.log(`   - ${perm.module}: ${perm.name}`);
        });
        
        // Test sidebar menu visibility logic
        console.log('\n2️⃣ Sidebar Menu Visibility for Editor:');
        
        const menuItems = [
            { name: 'Dashboard', permission: 'dashboard.view', shouldShow: false },
            { name: 'Users', permission: 'users.view', shouldShow: false },
            { name: 'Media', permission: 'media.view', shouldShow: false },
            { name: 'Upload Media', permission: 'media.create', shouldShow: false },
            { name: 'RBAC', permission: 'rbac.view', shouldShow: false },
            { name: 'Module Management', permission: 'modules.view', shouldShow: false },
            { name: 'Settings', permission: 'settings.view', shouldShow: false }
        ];
        
        const editorPermissionNames = editorPermissions.map(p => p.name);
        
        menuItems.forEach(item => {
            const hasPermission = editorPermissionNames.some(perm => perm.startsWith(item.permission.split('.')[0] + '.'));
            const willShow = hasPermission;
            const status = willShow ? '✅ WILL SHOW' : '❌ WILL HIDE';
            console.log(`   ${item.name}: ${status} (needs ${item.permission})`);
        });
        
        // Test other roles
        console.log('\n3️⃣ Comparing with Other Roles:');
        const roles = ['admin', 'super_admin', 'viewer', 'moderator', 'user'];
        
        for (const roleName of roles) {
            const [rolePermissions] = await db.execute(`
                SELECT p.name, p.module 
                FROM roles r 
                INNER JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_active = 1 
                INNER JOIN permissions p ON rp.permission_id = p.id 
                WHERE r.name = ? 
                ORDER BY p.module, p.name
            `, [roleName]);
            
            const permissionNames = rolePermissions.map(p => p.name);
            const visibleMenus = menuItems.filter(item => 
                permissionNames.some(perm => perm.startsWith(item.permission.split('.')[0] + '.'))
            );
            
            console.log(`   ${roleName}: ${visibleMenus.length}/${menuItems.length} menus visible`);
            console.log(`     Visible: ${visibleMenus.map(m => m.name).join(', ') || 'None'}`);
        }
        
        console.log('\n✅ Sidebar Permission Test Completed!');
        console.log('\n📋 Expected Results for Editor:');
        console.log('   ✅ Dashboard - Always visible');
        console.log('   ❌ Users - No users.* permissions');
        console.log('   ✅ Media - Has media.view permission');
        console.log('   ✅ Upload Media - Has media.create permission');
        console.log('   ❌ RBAC - No rbac.* permissions');
        console.log('   ✅ Module Management - Has modules.view permission');
        console.log('   ❌ Settings - No settings.* permissions');
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

// Run test
testSidebarPermissions().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
