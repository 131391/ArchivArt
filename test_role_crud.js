const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const ADMIN_CREDENTIALS = {
  email: 'admin@archivart.com', // Admin email
  password: 'admin123' // Admin password
};

let sessionCookie = '';
let testRoleId = null;

// Helper function to make authenticated requests
async function makeAuthenticatedRequest(method, url, data = null) {
  const config = {
    method,
    url: `${BASE_URL}${url}`,
    headers: {
      'Cookie': sessionCookie,
      'Content-Type': 'application/json'
    },
    validateStatus: () => true, // Accept all status codes
    timeout: 10000
  };
  
  if (data) {
    config.data = data;
  }
  
  return await axios(config);
}

// Test 1: Login as admin
async function testLogin() {
  console.log('🔐 Testing Admin Login...');
  
  try {
    const response = await axios.post(`${BASE_URL}/admin/login`, {
      email: ADMIN_CREDENTIALS.email,
      password: ADMIN_CREDENTIALS.password
    }, {
      validateStatus: () => true,
      timeout: 10000
    });
    
    if (response.status === 200 || response.status === 302) {
      // Extract session cookie
      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader) {
        sessionCookie = setCookieHeader.map(cookie => cookie.split(';')[0]).join('; ');
        console.log('✅ Login successful');
        console.log('🍪 Session cookie:', sessionCookie);
        return true;
      } else {
        console.log('❌ No session cookie found in response');
        console.log('Response headers:', response.headers);
      }
    }
    
    console.log(`❌ Login failed - Status: ${response.status}`);
    return false;
  } catch (error) {
    console.log(`❌ Login error: ${error.message}`);
    return false;
  }
}

// Test 2: Get all roles
async function testGetRoles() {
  console.log('\n📋 Testing Get All Roles...');
  
  try {
    const response = await makeAuthenticatedRequest('GET', '/admin/api/rbac/roles');
    
    if (response.status === 200) {
      const data = response.data;
      if (data.success && Array.isArray(data.data)) {
        console.log(`✅ Retrieved ${data.data.length} roles`);
        console.log('📊 Roles:', data.data.map(role => `${role.name} (${role.display_name})`).join(', '));
        return true;
      } else {
        console.log('❌ Invalid response format');
        return false;
      }
    } else {
      console.log(`❌ Get roles failed - Status: ${response.status}`);
      console.log('Response:', response.data);
      return false;
    }
  } catch (error) {
    console.log(`❌ Get roles error: ${error.message}`);
    return false;
  }
}

// Test 3: Create a new role
async function testCreateRole() {
  console.log('\n➕ Testing Create Role...');
  
  const newRole = {
    name: 'test_role_' + Date.now(),
    display_name: 'Test Role',
    description: 'A test role for CRUD operations'
  };
  
  try {
    const response = await makeAuthenticatedRequest('POST', '/admin/api/rbac/roles', newRole);
    
    if (response.status === 201 || response.status === 200) {
      const data = response.data;
      if (data.success && data.data && data.data.id) {
        testRoleId = data.data.id;
        console.log(`✅ Role created successfully - ID: ${testRoleId}`);
        console.log('📊 Created role:', data.data);
        return true;
      } else {
        console.log('❌ Invalid response format');
        console.log('Response:', data);
        return false;
      }
    } else {
      console.log(`❌ Create role failed - Status: ${response.status}`);
      console.log('Response:', response.data);
      return false;
    }
  } catch (error) {
    console.log(`❌ Create role error: ${error.message}`);
    return false;
  }
}

// Test 4: Get role by ID
async function testGetRoleById() {
  if (!testRoleId) {
    console.log('\n❌ No test role ID available for Get Role by ID test');
    return false;
  }
  
  console.log('\n🔍 Testing Get Role by ID...');
  
  try {
    const response = await makeAuthenticatedRequest('GET', `/admin/api/rbac/roles/${testRoleId}`);
    
    if (response.status === 200) {
      const data = response.data;
      if (data.success && data.data) {
        console.log(`✅ Retrieved role by ID: ${testRoleId}`);
        console.log('📊 Role details:', data.data);
        return true;
      } else {
        console.log('❌ Invalid response format');
        return false;
      }
    } else {
      console.log(`❌ Get role by ID failed - Status: ${response.status}`);
      console.log('Response:', response.data);
      return false;
    }
  } catch (error) {
    console.log(`❌ Get role by ID error: ${error.message}`);
    return false;
  }
}

// Test 5: Update role
async function testUpdateRole() {
  if (!testRoleId) {
    console.log('\n❌ No test role ID available for Update Role test');
    return false;
  }
  
  console.log('\n✏️ Testing Update Role...');
  
  const updateData = {
    name: 'updated_test_role',
    display_name: 'Updated Test Role',
    description: 'An updated test role for CRUD operations'
  };
  
  try {
    const response = await makeAuthenticatedRequest('PUT', `/admin/api/rbac/roles/${testRoleId}`, updateData);
    
    if (response.status === 200) {
      const data = response.data;
      if (data.success) {
        console.log(`✅ Role updated successfully - ID: ${testRoleId}`);
        console.log('📊 Updated role:', data.data);
        return true;
      } else {
        console.log('❌ Invalid response format');
        console.log('Response:', data);
        return false;
      }
    } else {
      console.log(`❌ Update role failed - Status: ${response.status}`);
      console.log('Response:', response.data);
      return false;
    }
  } catch (error) {
    console.log(`❌ Update role error: ${error.message}`);
    return false;
  }
}

// Test 6: Get all permissions
async function testGetPermissions() {
  console.log('\n🔑 Testing Get All Permissions...');
  
  try {
    const response = await makeAuthenticatedRequest('GET', '/admin/api/rbac/permissions');
    
    if (response.status === 200) {
      const data = response.data;
      if (data.success && Array.isArray(data.data)) {
        console.log(`✅ Retrieved ${data.data.length} permissions`);
        console.log('📊 Permissions:', data.data.map(perm => `${perm.name} (${perm.display_name})`).join(', '));
        return data.data;
      } else {
        console.log('❌ Invalid response format');
        return false;
      }
    } else {
      console.log(`❌ Get permissions failed - Status: ${response.status}`);
      console.log('Response:', response.data);
      return false;
    }
  } catch (error) {
    console.log(`❌ Get permissions error: ${error.message}`);
    return false;
  }
}

// Test 7: Update role permissions
async function testUpdateRolePermissions() {
  if (!testRoleId) {
    console.log('\n❌ No test role ID available for Update Role Permissions test');
    return false;
  }
  
  console.log('\n🔗 Testing Update Role Permissions...');
  
  // First get some permissions
  const permissions = await testGetPermissions();
  if (!permissions || permissions.length === 0) {
    console.log('❌ No permissions available for testing');
    return false;
  }
  
  // Take first 3 permissions
  const permissionIds = permissions.slice(0, 3).map(p => p.id);
  
  try {
    const response = await makeAuthenticatedRequest('PUT', `/admin/api/rbac/roles/${testRoleId}/permissions`, {
      permission_ids: permissionIds
    });
    
    if (response.status === 200) {
      const data = response.data;
      if (data.success) {
        console.log(`✅ Role permissions updated successfully - ID: ${testRoleId}`);
        console.log(`📊 Assigned ${permissionIds.length} permissions:`, permissionIds);
        return true;
      } else {
        console.log('❌ Invalid response format');
        console.log('Response:', data);
        return false;
      }
    } else {
      console.log(`❌ Update role permissions failed - Status: ${response.status}`);
      console.log('Response:', response.data);
      return false;
    }
  } catch (error) {
    console.log(`❌ Update role permissions error: ${error.message}`);
    return false;
  }
}

// Test 8: Delete role
async function testDeleteRole() {
  if (!testRoleId) {
    console.log('\n❌ No test role ID available for Delete Role test');
    return false;
  }
  
  console.log('\n🗑️ Testing Delete Role...');
  
  try {
    const response = await makeAuthenticatedRequest('DELETE', `/admin/api/rbac/roles/${testRoleId}`);
    
    if (response.status === 200) {
      const data = response.data;
      if (data.success) {
        console.log(`✅ Role deleted successfully - ID: ${testRoleId}`);
        testRoleId = null; // Clear the test role ID
        return true;
      } else {
        console.log('❌ Invalid response format');
        console.log('Response:', data);
        return false;
      }
    } else {
      console.log(`❌ Delete role failed - Status: ${response.status}`);
      console.log('Response:', response.data);
      return false;
    }
  } catch (error) {
    console.log(`❌ Delete role error: ${error.message}`);
    return false;
  }
}

// Test 9: Test role web pages
async function testRoleWebPages() {
  console.log('\n🌐 Testing Role Web Pages...');
  
  const pages = [
    { path: '/admin/rbac/roles', name: 'Roles List Page' },
    { path: '/admin/rbac/permissions', name: 'Permissions List Page' },
    { path: '/admin/rbac', name: 'RBAC Dashboard' }
  ];
  
  let passed = 0;
  for (const page of pages) {
    try {
      const response = await makeAuthenticatedRequest('GET', page.path);
      
      if (response.status === 200) {
        console.log(`✅ ${page.name} - Status: 200`);
        passed++;
      } else {
        console.log(`❌ ${page.name} - Status: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${page.name} - Error: ${error.message}`);
    }
  }
  
  console.log(`📊 Web Pages: ${passed}/${pages.length} passed`);
  return passed === pages.length;
}

// Main test function
async function runAllTests() {
  console.log('🧪 Starting Role CRUD Tests...\n');
  
  const tests = [
    { name: 'Login', fn: testLogin },
    { name: 'Get Roles', fn: testGetRoles },
    { name: 'Create Role', fn: testCreateRole },
    { name: 'Get Role by ID', fn: testGetRoleById },
    { name: 'Update Role', fn: testUpdateRole },
    { name: 'Get Permissions', fn: testGetPermissions },
    { name: 'Update Role Permissions', fn: testUpdateRolePermissions },
    { name: 'Delete Role', fn: testDeleteRole },
    { name: 'Role Web Pages', fn: testRoleWebPages }
  ];
  
  let passed = 0;
  const results = [];
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      results.push({ name: test.name, passed: result });
      if (result) passed++;
    } catch (error) {
      console.log(`❌ ${test.name} - Unexpected error: ${error.message}`);
      results.push({ name: test.name, passed: false });
    }
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('=' .repeat(50));
  console.log(`Total Tests: ${tests.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${tests.length - passed}`);
  console.log(`Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
  
  console.log('\n🔍 Detailed Results');
  console.log('=' .repeat(50));
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
  });
  
  return {
    total: tests.length,
    passed,
    failed: tests.length - passed,
    successRate: (passed / tests.length) * 100
  };
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Tests interrupted by user');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error.message);
  process.exit(1);
});

// Run the tests
runAllTests()
  .then(results => {
    if (results.failed > 0) {
      console.log('\n❌ Some tests failed. Please check the role CRUD implementation.');
      process.exit(1);
    } else {
      console.log('\n✅ All role CRUD tests passed!');
      process.exit(0);
    }
  })
  .catch(error => {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  });
