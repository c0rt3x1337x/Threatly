const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function fixUserPasswords() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI.replace('/threatly?', '/threatly2?');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Hash password manually
    const userPassword = 'password123';
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(userPassword, salt);
    
    console.log('🔐 Password hashed successfully');
    console.log('Original password:', userPassword);
    console.log('Hashed password length:', hashedPassword.length);

    // Update all users to have the correct password hash
    const result = await User.updateMany(
      { role: 'user' },
      { 
        $set: { 
          password: hashedPassword
        }
      }
    );

    console.log('✅ Updated users:', result.modifiedCount);

    // Verify the update
    const users = await User.find({ role: 'user' });
    console.log('\n📊 Users after password update:');
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} - Status: ${user.status} - Has password: ${!!user.password}`);
    });

    // Test password comparison for one user
    const testUser = await User.findOne({ email: 'test@threatly.com' });
    if (testUser) {
      console.log('\n🧪 Testing password comparison for test@threatly.com...');
      const isValid = await bcrypt.compare(userPassword, testUser.password);
      console.log('Password comparison test:', isValid);
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

fixUserPasswords();

