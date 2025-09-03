const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function fixAdminEmail() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI.replace('/threatly?', '/threatly2?');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find current admin user
    const currentAdmin = await User.findOne({ role: 'admin' });
    if (!currentAdmin) {
      console.log('❌ No admin user found!');
      return;
    }

    console.log('👑 Current admin user:', currentAdmin.email);
    console.log('   Role:', currentAdmin.role);
    console.log('   Status:', currentAdmin.status);
    console.log('   Plan:', currentAdmin.plan);

    // Update email to admin@threatly.com
    if (currentAdmin.email !== 'admin@threatly.com') {
      currentAdmin.email = 'admin@threatly.com';
      await currentAdmin.save();
      console.log('✅ Admin email updated to: admin@threatly.com');
    } else {
      console.log('✅ Admin email is already correct: admin@threatly.com');
    }

    // Ensure admin has correct password
    const adminPassword = 'admin';
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);
    
    currentAdmin.password = hashedPassword;
    currentAdmin.status = 'approved';
    currentAdmin.plan = 'premium';
    await currentAdmin.save();

    console.log('✅ Admin password updated to:', adminPassword);
    console.log('✅ Admin status set to: approved');
    console.log('✅ Admin plan set to: premium');

    // Verify the update
    const updatedAdmin = await User.findOne({ role: 'admin' });
    console.log('\n👑 Updated admin user:');
    console.log('   Email:', updatedAdmin.email);
    console.log('   Role:', updatedAdmin.role);
    console.log('   Status:', updatedAdmin.status);
    console.log('   Plan:', updatedAdmin.plan);
    console.log('   Has password:', !!updatedAdmin.password);

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

fixAdminEmail();

