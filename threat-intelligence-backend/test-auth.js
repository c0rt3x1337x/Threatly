const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/auth';

async function testAuth() {
  try {
    console.log('🧪 Testing Authentication Endpoints...\n');

    // Test 1: Register a new user
    console.log('1. Testing User Registration...');
    const registerResponse = await axios.post(`${BASE_URL}/register`, {
      email: 'test@example.com',
      password: 'test123456'
    });
    console.log('✅ Registration successful:', registerResponse.data);

    // Test 2: Try to login with pending user (should fail)
    console.log('\n2. Testing Login with Pending User...');
    try {
      await axios.post(`${BASE_URL}/login`, {
        email: 'test@example.com',
        password: 'test123456'
      });
    } catch (error) {
      console.log('✅ Login correctly rejected for pending user:', error.response.data);
    }

    // Test 3: Login with admin user
    console.log('\n3. Testing Admin Login...');
    const loginResponse = await axios.post(`${BASE_URL}/login`, {
      email: 'admin',
      password: 'admin'
    });
    console.log('✅ Admin login successful:', loginResponse.data);

    // Test 4: Get current user info
    console.log('\n4. Testing Get Current User...');
    const cookies = loginResponse.headers['set-cookie'];
    const userResponse = await axios.get(`${BASE_URL}/me`, {
      headers: {
        Cookie: cookies.join('; ')
      }
    });
    console.log('✅ Current user info:', userResponse.data);

    console.log('\n🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testAuth();
}

module.exports = { testAuth };
