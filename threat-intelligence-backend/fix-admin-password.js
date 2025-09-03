const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function fixAdminPassword() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI.replace('/threatly?', '/threatly2?');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Hash password manually
    const adminPassword = 'admin';
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);
    
    console.log('🔐 Password hashed successfully');
    console.log('Original password:', adminPassword);
    console.log('Hashed password length:', hashedPassword.length);

    // Update admin user directly in database (bypassing pre-save hook)
    const result = await User.updateOne(
      { role: 'admin' },
      { 
        $set: { 
          password: hashedPassword,
          status: 'approved',
          plan: 'premium'
        }
      }
    );

    console.log('✅ Admin user updated directly:', result);

    // Verify the update
    const admin = await User.findOne({ role: 'admin' });
    console.log('\n👑 Admin user after update:');
    console.log('Email:', admin.email);
    console.log('Password field exists:', !!admin.password);
    console.log('Password length:', admin.password ? admin.password.length : 0);
    console.log('Status:', admin.status);
    console.log('Plan:', admin.plan);

    // Test password comparison
    const isValid = await bcrypt.compare(adminPassword, admin.password);
    console.log('Password comparison test:', isValid);

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

fixAdminPassword();

