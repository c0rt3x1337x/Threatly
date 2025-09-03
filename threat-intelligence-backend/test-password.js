const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function testPassword() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI.replace('/threatly?', '/threatly2?');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find admin user
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('❌ No admin user found!');
      return;
    }

    console.log('👑 Admin user found:', admin.email);
    console.log('Password field exists:', !!admin.password);
    console.log('PasswordHash field exists:', !!admin.passwordHash);
    console.log('Password length:', admin.password ? admin.password.length : 0);

    // Test password comparison
    const testPassword = 'admin';
    console.log('\n🧪 Testing password comparison...');
    console.log('Test password:', testPassword);
    
    // Test using the comparePassword method
    const isValid1 = await admin.comparePassword(testPassword);
    console.log('comparePassword method result:', isValid1);
    
    // Test direct bcrypt comparison
    const isValid2 = await bcrypt.compare(testPassword, admin.password);
    console.log('Direct bcrypt comparison result:', isValid2);
    
    // Test with wrong password
    const isValid3 = await admin.comparePassword('wrongpassword');
    console.log('Wrong password test result:', isValid3);

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

testPassword();
