const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000';

async function testSessionDebug() {
  console.log('🔍 Testing Session Debug...\n');
  
  // Step 1: Login
  console.log('1. Logging in...');
  const loginResponse = await axios.post(`${BASE_URL}/admin/login`, {
    email: 'admin@archivart.com',
    password: 'admin123'
  }, {
    validateStatus: () => true,
    timeout: 10000
  });
  
  console.log(`   Login status: ${loginResponse.status}`);
  
  // Extract session cookie
  const setCookieHeader = loginResponse.headers['set-cookie'];
  let sessionCookie = '';
  if (setCookieHeader) {
    sessionCookie = setCookieHeader.map(cookie => cookie.split(';')[0]).join('; ');
    console.log(`   Session cookie: ${sessionCookie.substring(0, 50)}...`);
  }
  
  // Step 2: Test a simple API endpoint
  console.log('\n2. Testing API endpoint with session...');
  const apiResponse = await axios.get(`${BASE_URL}/admin/api/rbac/roles`, {
    headers: {
      'Cookie': sessionCookie
    },
    validateStatus: () => true,
    timeout: 10000
  });
  
  console.log(`   API status: ${apiResponse.status}`);
  console.log(`   API response:`, apiResponse.data);
  
  // Step 3: Test web endpoint
  console.log('\n3. Testing web endpoint with session...');
  const webResponse = await axios.get(`${BASE_URL}/admin/rbac/roles`, {
    headers: {
      'Cookie': sessionCookie
    },
    validateStatus: () => true,
    timeout: 10000,
    maxRedirects: 0
  });
  
  console.log(`   Web status: ${webResponse.status}`);
  if (webResponse.status === 302) {
    console.log(`   Redirect location: ${webResponse.headers.location}`);
  }
  
  // Step 4: Test dashboard
  console.log('\n4. Testing dashboard with session...');
  const dashboardResponse = await axios.get(`${BASE_URL}/admin/dashboard`, {
    headers: {
      'Cookie': sessionCookie
    },
    validateStatus: () => true,
    timeout: 10000,
    maxRedirects: 0
  });
  
  console.log(`   Dashboard status: ${dashboardResponse.status}`);
  if (dashboardResponse.status === 302) {
    console.log(`   Redirect location: ${dashboardResponse.headers.location}`);
  }
}

testSessionDebug()
  .then(() => {
    console.log('\n✅ Session debug completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Session debug failed:', error.message);
    process.exit(1);
  });
