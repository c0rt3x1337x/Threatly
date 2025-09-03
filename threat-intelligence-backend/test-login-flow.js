const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function testLoginFlow() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI.replace('/threatly?', '/threatly2?');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    console.log('\n🧪 Testing Login Flow Logic...\n');

    // Test 1: Check admin user
    const admin = await User.findOne({ role: 'admin' });
    if (admin) {
      console.log('✅ Admin user found:', admin.email);
      console.log('   Role:', admin.role);
      console.log('   Status:', admin.status);
      console.log('   Can login:', admin.role === 'admin' || admin.status === 'approved');
    } else {
      console.log('❌ No admin user found!');
    }

    // Test 2: Check pending users
    const pendingUsers = await User.find({ status: 'pending' });
    console.log(`\n📋 Pending users (${pendingUsers.length}):`);
    pendingUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.role}) - Can login: ${user.role === 'admin' || user.status === 'approved'}`);
    });

    // Test 3: Check approved users
    const approvedUsers = await User.find({ status: 'approved' });
    console.log(`\n✅ Approved users (${approvedUsers.length}):`);
    approvedUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.role}) - Can login: ${user.role === 'admin' || user.status === 'approved'}`);
    });

    // Test 4: Check suspended users
    const suspendedUsers = await User.find({ status: 'suspended' });
    console.log(`\n🚫 Suspended users (${suspendedUsers.length}):`);
    suspendedUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.role}) - Can login: ${user.role === 'admin' || user.status === 'approved'}`);
    });

    // Test 5: Login logic simulation
    console.log('\n🔐 Login Logic Test:');
    
    // Test admin login (should always work)
    if (admin) {
      const adminCanLogin = admin.role === 'admin' || admin.status === 'approved';
      console.log(`   Admin (${admin.email}): ${adminCanLogin ? '✅ CAN LOGIN' : '❌ CANNOT LOGIN'}`);
    }

    // Test regular user login scenarios
    const testUser = approvedUsers.find(u => u.role === 'user') || pendingUsers.find(u => u.role === 'user');
    if (testUser) {
      const canLogin = testUser.role === 'admin' || testUser.status === 'approved';
      console.log(`   Regular user (${testUser.email}): ${canLogin ? '✅ CAN LOGIN' : '❌ CANNOT LOGIN'} (Status: ${testUser.status})`);
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

testLoginFlow();

