const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000';

async function testLoginSession() {
  console.log('🔍 Testing Login Session...\n');
  
  // Create a cookie jar to maintain cookies across requests
  const cookieJar = new Map();
  
  // Helper function to extract and store cookies
  function extractCookies(response) {
    const setCookieHeader = response.headers['set-cookie'];
    if (setCookieHeader) {
      setCookieHeader.forEach(cookie => {
        const [nameValue] = cookie.split(';');
        const [name, value] = nameValue.split('=');
        cookieJar.set(name, value);
      });
    }
  }
  
  // Helper function to get cookie string
  function getCookieString() {
    return Array.from(cookieJar.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }
  
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
  extractCookies(loginResponse);
  console.log(`   Cookies after login: ${getCookieString()}`);
  
  // Step 2: Test dashboard with cookies
  console.log('\n2. Testing dashboard with cookies...');
  const dashboardResponse = await axios.get(`${BASE_URL}/admin/dashboard`, {
    headers: {
      'Cookie': getCookieString()
    },
    validateStatus: () => true,
    timeout: 10000,
    maxRedirects: 0
  });
  
  console.log(`   Dashboard status: ${dashboardResponse.status}`);
  if (dashboardResponse.status === 302) {
    console.log(`   Redirect location: ${dashboardResponse.headers.location}`);
  }
  
  // Step 3: Test API with cookies
  console.log('\n3. Testing API with cookies...');
  const apiResponse = await axios.get(`${BASE_URL}/admin/api/rbac/roles`, {
    headers: {
      'Cookie': getCookieString()
    },
    validateStatus: () => true,
    timeout: 10000
  });
  
  console.log(`   API status: ${apiResponse.status}`);
  console.log(`   API response:`, apiResponse.data);
  
  // Step 4: Test a simple endpoint that should work
  console.log('\n4. Testing a simple endpoint...');
  const simpleResponse = await axios.get(`${BASE_URL}/admin/login`, {
    headers: {
      'Cookie': getCookieString()
    },
    validateStatus: () => true,
    timeout: 10000
  });
  
  console.log(`   Simple endpoint status: ${simpleResponse.status}`);
}

testLoginSession()
  .then(() => {
    console.log('\n✅ Login session test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Login session test failed:', error.message);
    process.exit(1);
  });
