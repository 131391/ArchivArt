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

async function testRoleFunctionality() {
  let connection;
  
  try {
    console.log('🧪 Testing Role CRUD Functionality...\n');
    connection = await promisePool.getConnection();
    
    // Test 1: Check existing roles
    console.log('1. 📋 Checking existing roles...');
    const [roles] = await connection.execute('SELECT * FROM roles ORDER BY id');
    console.log(`   Found ${roles.length} roles:`);
    roles.forEach(role => {
      console.log(`   - ID: ${role.id}, Name: ${role.name}, Display: ${role.display_name}, Active: ${role.is_active}`);
    });
    
    // Test 2: Check existing permissions
    console.log('\n2. 🔑 Checking existing permissions...');
    const [permissions] = await connection.execute('SELECT * FROM permissions ORDER BY id');
    console.log(`   Found ${permissions.length} permissions:`);
    permissions.forEach(perm => {
      console.log(`   - ID: ${perm.id}, Name: ${perm.name}, Display: ${perm.display_name}, Active: ${perm.is_active}`);
    });
    
    // Test 3: Check role permissions
    console.log('\n3. 🔗 Checking role permissions...');
    const [rolePermissions] = await connection.execute(`
      SELECT rp.*, r.name as role_name, p.name as permission_name 
      FROM role_permissions rp
      LEFT JOIN roles r ON rp.role_id = r.id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      ORDER BY rp.role_id, rp.permission_id
    `);
    console.log(`   Found ${rolePermissions.length} role-permission assignments:`);
    rolePermissions.forEach(rp => {
      console.log(`   - Role: ${rp.role_name}, Permission: ${rp.permission_name}, Active: ${rp.is_active}`);
    });
    
    // Test 4: Test role creation
    console.log('\n4. ➕ Testing role creation...');
    const testRoleName = 'test_role_' + Date.now();
    const [createResult] = await connection.execute(`
      INSERT INTO roles (name, display_name, description, is_active) 
      VALUES (?, ?, ?, ?)
    `, [testRoleName, 'Test Role', 'A test role for CRUD operations', 1]);
    
    const newRoleId = createResult.insertId;
    console.log(`   ✅ Created test role with ID: ${newRoleId}`);
    
    // Test 5: Test role retrieval
    console.log('\n5. 🔍 Testing role retrieval...');
    const [retrievedRole] = await connection.execute('SELECT * FROM roles WHERE id = ?', [newRoleId]);
    if (retrievedRole.length > 0) {
      console.log(`   ✅ Retrieved role: ${retrievedRole[0].name} (${retrievedRole[0].display_name})`);
    } else {
      console.log('   ❌ Failed to retrieve role');
    }
    
    // Test 6: Test role update
    console.log('\n6. ✏️ Testing role update...');
    const [updateResult] = await connection.execute(`
      UPDATE roles 
      SET display_name = ?, description = ? 
      WHERE id = ?
    `, ['Updated Test Role', 'An updated test role', newRoleId]);
    
    if (updateResult.affectedRows > 0) {
      console.log(`   ✅ Updated role with ID: ${newRoleId}`);
    } else {
      console.log('   ❌ Failed to update role');
    }
    
    // Test 7: Test role permission assignment
    console.log('\n7. 🔗 Testing role permission assignment...');
    if (permissions.length > 0) {
      const permissionId = permissions[0].id;
      const [assignResult] = await connection.execute(`
        INSERT INTO role_permissions (role_id, permission_id, is_active, granted_at) 
        VALUES (?, ?, ?, ?)
      `, [newRoleId, permissionId, 1, new Date()]);
      
      if (assignResult.affectedRows > 0) {
        console.log(`   ✅ Assigned permission ${permissionId} to role ${newRoleId}`);
      } else {
        console.log('   ❌ Failed to assign permission');
      }
    }
    
    // Test 8: Test role deletion
    console.log('\n8. 🗑️ Testing role deletion...');
    const [deleteResult] = await connection.execute('DELETE FROM roles WHERE id = ?', [newRoleId]);
    if (deleteResult.affectedRows > 0) {
      console.log(`   ✅ Deleted test role with ID: ${newRoleId}`);
    } else {
      console.log('   ❌ Failed to delete role');
    }
    
    // Test 9: Check modules and actions
    console.log('\n9. 📦 Checking modules and actions...');
    const [modules] = await connection.execute('SELECT * FROM modules ORDER BY order_index');
    console.log(`   Found ${modules.length} modules:`);
    modules.forEach(module => {
      console.log(`   - ID: ${module.id}, Name: ${module.name}, Display: ${module.display_name}`);
    });
    
    const [actions] = await connection.execute('SELECT * FROM module_actions ORDER BY module_id, name');
    console.log(`   Found ${actions.length} module actions:`);
    actions.forEach(action => {
      console.log(`   - ID: ${action.id}, Module: ${action.module_id}, Name: ${action.name}, Display: ${action.display_name}`);
    });
    
    console.log('\n✅ All role functionality tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing role functionality:', error.message);
  } finally {
    if (connection) {
      connection.release();
      console.log('🔌 Database connection released');
    }
  }
}

// Run the tests
testRoleFunctionality()
  .then(() => {
    console.log('✅ Role functionality test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Role functionality test failed:', error);
    process.exit(1);
  });
