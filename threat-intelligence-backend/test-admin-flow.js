const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testAdminFlow() {
  try {
    console.log('🧪 Testing Complete Admin Flow...\n');

    // Step 1: Admin Login
    console.log('1. 🔐 Admin Login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@threatly.com',
      password: 'admin'
    });
    
    console.log('✅ Admin login successful');
    const token = loginResponse.data.token;
    const cookies = loginResponse.headers['set-cookie'];
    
    // Configure axios with cookies
    const axiosWithCookies = axios.create({
      baseURL: BASE_URL,
      headers: {
        Cookie: cookies.join('; ')
      }
    });

    // Step 2: Get Admin Stats
    console.log('\n2. 📊 Getting Admin Stats...');
    try {
      const statsResponse = await axiosWithCookies.get('/admin/stats');
      console.log('✅ Admin stats:', statsResponse.data.stats);
    } catch (error) {
      console.log('❌ Failed to get admin stats:', error.response?.data || error.message);
    }

    // Step 3: List All Users
    console.log('\n3. 👥 Listing All Users...');
    try {
      const usersResponse = await axiosWithCookies.get('/admin/users');
      console.log('✅ Users list:', usersResponse.data.users.length, 'users found');
      
      usersResponse.data.users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (${user.role}) - Status: ${user.status} - Plan: ${user.plan}`);
      });
    } catch (error) {
      console.log('❌ Failed to get users list:', error.response?.data || error.message);
    }

    // Step 4: Approve a Pending User
    console.log('\n4. ✅ Approving a Pending User...');
    try {
      // Find a pending user
      const usersResponse = await axiosWithCookies.get('/admin/users');
      const pendingUser = usersResponse.data.users.find(u => u.status === 'pending' && u.role === 'user');
      
      if (pendingUser) {
        console.log(`   Approving user: ${pendingUser.email}`);
        const approveResponse = await axiosWithCookies.patch(`/admin/users/${pendingUser.id}/approve`);
        console.log('✅ User approved:', approveResponse.data.message);
        
        // Verify the user can now login
        console.log('\n5. 🔐 Testing Approved User Login...');
        try {
          const userLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: pendingUser.email,
            password: 'test123456' // Assuming this is the password
          });
          console.log('✅ Approved user can now login:', userLoginResponse.data.success);
        } catch (error) {
          console.log('❌ Approved user still cannot login:', error.response?.data || error.message);
        }
      } else {
        console.log('   No pending users found to approve');
      }
    } catch (error) {
      console.log('❌ Failed to approve user:', error.response?.data || error.message);
    }

    console.log('\n🎉 Admin flow test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testAdminFlow();
}

module.exports = { testAdminFlow };

