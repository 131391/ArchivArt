const axios = require('axios');
const { spawn } = require('child_process');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_ROUTES = [
  // Dashboard routes
  { path: '/admin/dashboard', method: 'GET', expectedStatus: 302, description: 'Dashboard page' },
  
  // User management routes
  { path: '/admin/users', method: 'GET', expectedStatus: 302, description: 'Users page' },
  { path: '/admin/users/data', method: 'GET', expectedStatus: 302, description: 'Users data API' },
  
  // Media management routes
  { path: '/admin/media', method: 'GET', expectedStatus: 302, description: 'Media page' },
  { path: '/admin/media/data', method: 'GET', expectedStatus: 302, description: 'Media data API' },
  { path: '/admin/media/upload', method: 'GET', expectedStatus: 302, description: 'Media upload page' },
  
  // RBAC management routes
  { path: '/admin/rbac', method: 'GET', expectedStatus: 302, description: 'RBAC dashboard' },
  { path: '/admin/rbac/roles', method: 'GET', expectedStatus: 302, description: 'RBAC roles page' },
  { path: '/admin/rbac/permissions', method: 'GET', expectedStatus: 302, description: 'RBAC permissions page' },
  
  // Settings routes
  { path: '/admin/settings', method: 'GET', expectedStatus: 302, description: 'Settings page' },
  
  // RBAC API routes
  { path: '/admin/api/rbac/dashboard', method: 'GET', expectedStatus: 401, description: 'RBAC dashboard API' },
  { path: '/admin/api/rbac/roles', method: 'GET', expectedStatus: 401, description: 'RBAC roles API' },
  { path: '/admin/api/rbac/permissions', method: 'GET', expectedStatus: 401, description: 'RBAC permissions API' },
  
  // Media API routes
  { path: '/admin/media/view/1', method: 'GET', expectedStatus: 302, description: 'Media view page' },
  { path: '/admin/media/edit/1', method: 'GET', expectedStatus: 302, description: 'Media edit page' },
];

// Test with invalid session
const TEST_INVALID_SESSION_ROUTES = [
  { path: '/admin/api/rbac/dashboard', method: 'GET', expectedStatus: 401, description: 'RBAC dashboard API (invalid session)' },
  { path: '/admin/api/rbac/roles', method: 'GET', expectedStatus: 401, description: 'RBAC roles API (invalid session)' },
  { path: '/admin/api/rbac/permissions', method: 'GET', expectedStatus: 401, description: 'RBAC permissions API (invalid session)' },
];

async function testRoute(route, cookies = null) {
  try {
    const config = {
      method: route.method,
      url: `${BASE_URL}${route.path}`,
      maxRedirects: 0, // Don't follow redirects
      validateStatus: () => true, // Accept all status codes
      timeout: 5000
    };
    
    if (cookies) {
      config.headers = { Cookie: cookies };
    }
    
    const response = await axios(config);
    
    return {
      path: route.path,
      method: route.method,
      description: route.description,
      expectedStatus: route.expectedStatus,
      actualStatus: response.status,
      success: response.status === route.expectedStatus,
      location: response.headers.location || null,
      isRedirect: response.status >= 300 && response.status < 400
    };
  } catch (error) {
    return {
      path: route.path,
      method: route.method,
      description: route.description,
      expectedStatus: route.expectedStatus,
      actualStatus: 'ERROR',
      success: false,
      error: error.message,
      isRedirect: false
    };
  }
}

async function testAllRoutes() {
  console.log('🧪 Testing Route Authentication...\n');
  
  // Test 1: No authentication (should redirect to login)
  console.log('📋 Test 1: No Authentication (should redirect to login)');
  console.log('=' .repeat(60));
  
  const results1 = [];
  for (const route of TEST_ROUTES) {
    const result = await testRoute(route);
    results1.push(result);
    
    const status = result.success ? '✅' : '❌';
    const redirectInfo = result.isRedirect ? ` → ${result.location}` : '';
    console.log(`${status} ${route.method} ${route.path} - Expected: ${route.expectedStatus}, Got: ${result.actualStatus}${redirectInfo}`);
  }
  
  // Test 2: Invalid session (API routes should return 401)
  console.log('\n📋 Test 2: Invalid Session (API routes should return 401)');
  console.log('=' .repeat(60));
  
  const results2 = [];
  for (const route of TEST_INVALID_SESSION_ROUTES) {
    const result = await testRoute(route, 'sessionId=invalid_session_id');
    results2.push(result);
    
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${route.method} ${route.path} - Expected: ${route.expectedStatus}, Got: ${result.actualStatus}`);
  }
  
  // Test 3: Test login page accessibility
  console.log('\n📋 Test 3: Login Page Accessibility');
  console.log('=' .repeat(60));
  
  let loginResponse;
  try {
    loginResponse = await axios.get(`${BASE_URL}/admin/login`, {
      maxRedirects: 0,
      validateStatus: () => true,
      timeout: 5000
    });
    
    const loginSuccess = loginResponse.status === 200;
    const status = loginSuccess ? '✅' : '❌';
    console.log(`${status} GET /admin/login - Expected: 200, Got: ${loginResponse.status}`);
  } catch (error) {
    console.log(`❌ GET /admin/login - Error: ${error.message}`);
    loginResponse = { status: 0 };
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('=' .repeat(60));
  
  const totalTests = results1.length + results2.length + 1;
  const passedTests = results1.filter(r => r.success).length + 
                     results2.filter(r => r.success).length + 
                     (loginResponse?.status === 200 ? 1 : 0);
  
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  // Detailed results
  console.log('\n🔍 Detailed Results');
  console.log('=' .repeat(60));
  
  const failedTests = [...results1, ...results2].filter(r => !r.success);
  if (failedTests.length > 0) {
    console.log('❌ Failed Tests:');
    failedTests.forEach(test => {
      console.log(`   ${test.method} ${test.path} - Expected: ${test.expectedStatus}, Got: ${test.actualStatus}`);
      if (test.error) {
        console.log(`     Error: ${test.error}`);
      }
    });
  } else {
    console.log('✅ All tests passed!');
  }
  
  return {
    total: totalTests,
    passed: passedTests,
    failed: totalTests - passedTests,
    successRate: (passedTests / totalTests) * 100
  };
}

async function checkServerStatus() {
  try {
    const response = await axios.get(`${BASE_URL}/admin/login`, {
      timeout: 3000,
      validateStatus: () => true
    });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Route Authentication Tests...\n');
  
  // Check if server is running
  console.log('🔍 Checking server status...');
  const serverRunning = await checkServerStatus();
  
  if (!serverRunning) {
    console.log('❌ Server is not running on http://localhost:3000');
    console.log('Please start the server first with: npm start');
    process.exit(1);
  }
  
  console.log('✅ Server is running\n');
  
  // Run tests
  const results = await testAllRoutes();
  
  // Exit with appropriate code
  if (results.failed > 0) {
    console.log('\n❌ Some tests failed. Please check the authentication setup.');
    process.exit(1);
  } else {
    console.log('\n✅ All authentication tests passed!');
    process.exit(0);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error.message);
  process.exit(1);
});

// Run the tests
main().catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
