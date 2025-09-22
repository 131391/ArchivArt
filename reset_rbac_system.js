const mysql = require('mysql2');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'archivart',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
};

const pool = mysql.createPool(dbConfig);
const promisePool = pool.promise();

async function resetRBACSystem() {
  let connection;
  
  try {
    console.log('🔄 Resetting RBAC system...');
    connection = await promisePool.getConnection();
    
    // Start transaction
    await connection.beginTransaction();
    
    // 1. Clear all existing role permissions
    console.log('🗑️ Clearing existing role permissions...');
    await connection.execute('DELETE FROM role_permissions');
    console.log('✅ Role permissions cleared');
    
    // 2. Clear all existing permissions
    console.log('🗑️ Clearing existing permissions...');
    await connection.execute('DELETE FROM permissions');
    console.log('✅ Permissions cleared');
    
    // 3. Clear all existing module actions
    console.log('🗑️ Clearing existing module actions...');
    await connection.execute('DELETE FROM module_actions');
    console.log('✅ Module actions cleared');
    
    // 4. Clear all existing modules
    console.log('🗑️ Clearing existing modules...');
    await connection.execute('DELETE FROM modules');
    console.log('✅ Modules cleared');
    
    // 5. Recreate modules
    console.log('📝 Creating modules...');
    const modules = [
      ['dashboard', 'Dashboard', 'Main dashboard overview', 'fas fa-tachometer-alt', '/admin/dashboard', 1],
      ['users', 'User Management', 'Manage users and their accounts', 'fas fa-users', '/admin/users', 2],
      ['media', 'Media Management', 'Manage media files and content', 'fas fa-images', '/admin/media', 3],
      ['rbac', 'RBAC Management', 'Manage roles, permissions and access control', 'fas fa-shield-alt', '/admin/rbac', 4],
      ['settings', 'App Settings', 'Configure application settings', 'fas fa-cog', '/admin/settings', 5]
    ];
    
    const moduleIds = {};
    for (const [name, display_name, description, icon, route, order_index] of modules) {
      const [result] = await connection.execute(`
        INSERT INTO modules (name, display_name, description, icon, route, order_index) 
        VALUES (?, ?, ?, ?, ?, ?)
      `, [name, display_name, description, icon, route, order_index]);
      moduleIds[name] = result.insertId;
      console.log(`✅ Created module: ${display_name} (ID: ${result.insertId})`);
    }
    
    // 6. Create module actions
    console.log('📝 Creating module actions...');
    const actions = [
      // Dashboard actions
      ['dashboard', 'view', 'View Dashboard', 'Access to view the dashboard', '/admin/dashboard'],
      
      // User management actions
      ['users', 'view', 'View Users', 'View user list and details', '/admin/users'],
      ['users', 'create', 'Create Users', 'Create new user accounts', '/admin/users/create'],
      ['users', 'update', 'Update Users', 'Edit user information', '/admin/users/edit'],
      ['users', 'delete', 'Delete Users', 'Delete user accounts', '/admin/users/delete'],
      ['users', 'block', 'Block Users', 'Block/unblock user accounts', '/admin/users/block'],
      
      // Media management actions
      ['media', 'view', 'View Media', 'View media files', '/admin/media'],
      ['media', 'create', 'Upload Media', 'Upload new media files', '/admin/media/upload'],
      ['media', 'update', 'Edit Media', 'Edit media information', '/admin/media/edit'],
      ['media', 'delete', 'Delete Media', 'Delete media files', '/admin/media/delete'],
      ['media', 'manage', 'Manage Media', 'Full media management', '/admin/media/manage'],
      
      // RBAC management actions
      ['rbac', 'view', 'View RBAC', 'View roles and permissions', '/admin/rbac'],
      ['rbac', 'create', 'Create RBAC', 'Create roles and permissions', '/admin/rbac/create'],
      ['rbac', 'update', 'Update RBAC', 'Edit roles and permissions', '/admin/rbac/edit'],
      ['rbac', 'delete', 'Delete RBAC', 'Delete roles and permissions', '/admin/rbac/delete'],
      
      // Settings actions
      ['settings', 'view', 'View Settings', 'View application settings', '/admin/settings'],
      ['settings', 'update', 'Update Settings', 'Update application settings', '/admin/settings/update']
    ];
    
    const actionIds = {};
    for (const [moduleName, actionName, display_name, description, route] of actions) {
      const [result] = await connection.execute(`
        INSERT INTO module_actions (module_id, name, display_name, description, route) 
        VALUES (?, ?, ?, ?, ?)
      `, [moduleIds[moduleName], actionName, display_name, description, route]);
      actionIds[`${moduleName}.${actionName}`] = result.insertId;
      console.log(`✅ Created action: ${moduleName}.${actionName} (ID: ${result.insertId})`);
    }
    
    // 7. Create permissions
    console.log('📝 Creating permissions...');
    const permissions = [
      // Dashboard permissions
      ['dashboard.view', 'Dashboard View', 'Permission to view the dashboard', 'dashboard', 'view', 'dashboard'],
      
      // User management permissions
      ['users.view', 'Users View', 'Permission to view users', 'users', 'view', 'users'],
      ['users.create', 'Users Create', 'Permission to create users', 'users', 'create', 'users'],
      ['users.update', 'Users Update', 'Permission to update users', 'users', 'update', 'users'],
      ['users.delete', 'Users Delete', 'Permission to delete users', 'users', 'delete', 'users'],
      ['users.block', 'Users Block', 'Permission to block/unblock users', 'users', 'block', 'users'],
      
      // Media management permissions
      ['media.view', 'Media View', 'Permission to view media', 'media', 'view', 'media'],
      ['media.create', 'Media Create', 'Permission to create/upload media', 'media', 'create', 'media'],
      ['media.update', 'Media Update', 'Permission to update media', 'media', 'update', 'media'],
      ['media.delete', 'Media Delete', 'Permission to delete media', 'media', 'delete', 'media'],
      ['media.manage', 'Media Manage', 'Permission to manage media', 'media', 'manage', 'media'],
      
      // RBAC management permissions
      ['rbac.view', 'RBAC View', 'Permission to view RBAC', 'rbac', 'view', 'rbac'],
      ['rbac.create', 'RBAC Create', 'Permission to create RBAC', 'rbac', 'create', 'rbac'],
      ['rbac.update', 'RBAC Update', 'Permission to update RBAC', 'rbac', 'update', 'rbac'],
      ['rbac.delete', 'RBAC Delete', 'Permission to delete RBAC', 'rbac', 'delete', 'rbac'],
      
      // Settings permissions
      ['settings.view', 'Settings View', 'Permission to view settings', 'settings', 'view', 'settings'],
      ['settings.update', 'Settings Update', 'Permission to update settings', 'settings', 'update', 'settings']
    ];
    
    const permissionIds = {};
    for (const [name, display_name, description, module, action, resource] of permissions) {
      const [result] = await connection.execute(`
        INSERT INTO permissions (name, display_name, description, module, action, resource, module_id, action_id, is_system_permission, is_active) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        name, 
        display_name, 
        description, 
        module, 
        action, 
        resource, 
        moduleIds[module], 
        actionIds[`${module}.${action}`], 
        0, 
        1
      ]);
      permissionIds[name] = result.insertId;
      console.log(`✅ Created permission: ${name} (ID: ${result.insertId})`);
    }
    
    // 8. Get admin role ID
    console.log('📝 Getting admin role...');
    const [adminRoleRows] = await connection.execute('SELECT id FROM roles WHERE name = ?', ['admin']);
    if (adminRoleRows.length === 0) {
      throw new Error('Admin role not found. Please create admin role first.');
    }
    const adminRoleId = adminRoleRows[0].id;
    console.log(`✅ Found admin role (ID: ${adminRoleId})`);
    
    // 9. Assign all permissions to admin role
    console.log('📝 Assigning all permissions to admin role...');
    const allPermissionIds = Object.values(permissionIds);
    
    for (const permissionId of allPermissionIds) {
      await connection.execute(`
        INSERT INTO role_permissions (role_id, permission_id, is_active, granted_at) 
        VALUES (?, ?, ?, ?)
      `, [adminRoleId, permissionId, 1, new Date()]);
    }
    console.log(`✅ Assigned ${allPermissionIds.length} permissions to admin role`);
    
    // 10. Create super_admin role if it doesn't exist
    console.log('📝 Checking for super_admin role...');
    const [superAdminRows] = await connection.execute('SELECT id FROM roles WHERE name = ?', ['super_admin']);
    let superAdminRoleId = null;
    
    if (superAdminRows.length === 0) {
      console.log('📝 Creating super_admin role...');
      const [result] = await connection.execute(`
        INSERT INTO roles (name, display_name, description, is_active) 
        VALUES (?, ?, ?, ?)
      `, ['super_admin', 'Super Administrator', 'Full system access with all permissions', 1]);
      superAdminRoleId = result.insertId;
      console.log(`✅ Created super_admin role (ID: ${superAdminRoleId})`);
    } else {
      superAdminRoleId = superAdminRows[0].id;
      console.log(`✅ Found super_admin role (ID: ${superAdminRoleId})`);
    }
    
    // 11. Assign all permissions to super_admin role
    console.log('📝 Assigning all permissions to super_admin role...');
    for (const permissionId of allPermissionIds) {
      await connection.execute(`
        INSERT INTO role_permissions (role_id, permission_id, is_active, granted_at) 
        VALUES (?, ?, ?, ?)
      `, [superAdminRoleId, permissionId, 1, new Date()]);
    }
    console.log(`✅ Assigned ${allPermissionIds.length} permissions to super_admin role`);
    
    // Commit transaction
    await connection.commit();
    
    console.log('🎉 RBAC system reset and recreated successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Modules: ${Object.keys(moduleIds).length}`);
    console.log(`   - Actions: ${Object.keys(actionIds).length}`);
    console.log(`   - Permissions: ${Object.keys(permissionIds).length}`);
    console.log(`   - Admin role permissions: ${allPermissionIds.length}`);
    console.log(`   - Super admin role permissions: ${allPermissionIds.length}`);
    
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ Error resetting RBAC system:', error.message);
    throw error;
  } finally {
    if (connection) {
      connection.release();
      console.log('🔌 Database connection released');
    }
  }
}

// Run the reset
resetRBACSystem()
  .then(() => {
    console.log('✅ RBAC system reset completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ RBAC system reset failed:', error);
    process.exit(1);
  });
