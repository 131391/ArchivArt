const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000';

async function testSessionFlow() {
  console.log('🔍 Testing Session Flow...\n');
  
  // Step 1: Test login endpoint
  console.log('1. Testing login endpoint...');
  try {
    const loginResponse = await axios.post(`${BASE_URL}/admin/login`, {
      email: 'admin@archivart.com',
      password: 'admin123'
    }, {
      validateStatus: () => true,
      timeout: 10000
    });
    
    console.log(`   Login status: ${loginResponse.status}`);
    console.log(`   Response headers:`, Object.keys(loginResponse.headers));
    
    if (loginResponse.headers['set-cookie']) {
      console.log(`   Set-Cookie header:`, loginResponse.headers['set-cookie']);
    }
    
    // Extract session cookie
    const setCookieHeader = loginResponse.headers['set-cookie'];
    let sessionCookie = '';
    if (setCookieHeader) {
      sessionCookie = setCookieHeader.map(cookie => cookie.split(';')[0]).join('; ');
      console.log(`   Session cookie: ${sessionCookie.substring(0, 50)}...`);
    }
    
    // Step 2: Test with the session cookie
    if (sessionCookie) {
      console.log('\n2. Testing with session cookie...');
      
      // Test dashboard
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
      
      // Test API
      const apiResponse = await axios.get(`${BASE_URL}/admin/api/rbac/roles`, {
        headers: {
          'Cookie': sessionCookie
        },
        validateStatus: () => true,
        timeout: 10000
      });
      
      console.log(`   API status: ${apiResponse.status}`);
      console.log(`   API response:`, apiResponse.data);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSessionFlow()
  .then(() => {
    console.log('\n✅ Session flow test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Session flow test failed:', error.message);
    process.exit(1);
  });
