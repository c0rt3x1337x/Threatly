const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testAuthFlow() {
  try {
    console.log('🧪 Testing Frontend Authentication Flow...\n');

    // Step 1: Test login with admin credentials
    console.log('1. 🔐 Testing Admin Login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@threatly.com',
      password: 'admin'
    }, {
      withCredentials: true
    });
    
    console.log('✅ Admin login successful');
    console.log('   User:', loginResponse.data.user);
    console.log('   Token:', loginResponse.data.token ? 'Present' : 'None');
    console.log('   Cookies:', loginResponse.headers['set-cookie'] ? 'Set' : 'None');
    
    // Step 2: Test if we can access articles with the same session
    console.log('\n2. 📰 Testing Articles Access with Session...');
    try {
      // Create a new axios instance with the cookies from login
      const cookies = loginResponse.headers['set-cookie'];
      const authenticatedClient = axios.create({
        baseURL: BASE_URL,
        withCredentials: true,
        headers: {
          Cookie: cookies.join('; ')
        }
      });
      
      const articlesResponse = await authenticatedClient.get('/articles');
      console.log('✅ Articles endpoint accessible with session!');
      console.log(`   Articles returned: ${articlesResponse.data.data?.length || articlesResponse.data.articles?.length || 'Unknown'}`);
    } catch (error) {
      console.log('❌ Failed to access articles with session:', error.response?.data || error.message);
    }

    // Step 3: Test if we can access articles without session (should fail)
    console.log('\n3. 🚫 Testing Articles Access without Session...');
    try {
      const articlesResponse = await axios.get(`${BASE_URL}/articles`, {
        withCredentials: false
      });
      console.log('❌ Articles accessible without session (this should fail)');
    } catch (error) {
      console.log('✅ Articles properly protected (requires authentication)');
      console.log('   Error:', error.response?.data?.message || error.message);
    }

    console.log('\n🎉 Authentication flow test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testAuthFlow();
}

module.exports = { testAuthFlow };
