const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function testUserPassword() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI.replace('/threatly?', '/threatly2?');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Test the approved user
    const testUser = await User.findOne({ email: 'test@threatly.com' });
    if (!testUser) {
      console.log('❌ User not found');
      return;
    }

    console.log('👤 Test user found:', testUser.email);
    console.log('   Status:', testUser.status);
    console.log('   Role:', testUser.role);
    console.log('   Has password:', !!testUser.password);
    console.log('   Password length:', testUser.password ? testUser.password.length : 0);

    // Test password comparison
    const testPassword = 'password123';
    console.log('\n🧪 Testing password comparison...');
    console.log('Test password:', testPassword);
    
    // Test using the comparePassword method
    const isValid1 = await testUser.comparePassword(testPassword);
    console.log('comparePassword method result:', isValid1);
    
    // Test direct bcrypt comparison
    const isValid2 = await bcrypt.compare(testPassword, testUser.password);
    console.log('Direct bcrypt comparison result:', isValid2);
    
    // Test with wrong password
    const isValid3 = await testUser.comparePassword('wrongpassword');
    console.log('Wrong password test result:', isValid3);

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

testUserPassword();

