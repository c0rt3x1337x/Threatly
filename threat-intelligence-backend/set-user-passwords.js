const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function setUserPasswords() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI.replace('/threatly?', '/threatly2?');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Set a default password for all users
    const defaultPassword = 'password123';
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);
    
    console.log('🔐 Setting default password for all users:', defaultPassword);

    // Update all users to have the default password
    const result = await User.updateMany(
      { password: { $exists: false } },
      { $set: { password: hashedPassword } }
    );

    console.log('✅ Updated users:', result.modifiedCount);

    // Verify the update
    const users = await User.find({});
    console.log('\n📊 Users after password update:');
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.role}) - Status: ${user.status} - Has password: ${!!user.password}`);
    });

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

setUserPasswords();

