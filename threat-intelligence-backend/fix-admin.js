const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function fixAdmin() {
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

    console.log('👑 Found admin user:', admin.email);
    console.log('Current status:', admin.status);
    console.log('Has password:', !!admin.password);
    console.log('Has passwordHash:', !!admin.passwordHash);

    // Set admin password to 'admin' as requested
    const adminPassword = 'admin';
    const salt = await bcrypt.genSalt(12);
    admin.password = await bcrypt.hash(adminPassword, salt);
    
    // Ensure admin is approved
    admin.status = 'approved';
    
    await admin.save();
    console.log('✅ Admin user updated successfully!');
    console.log('New password set:', adminPassword);
    console.log('Status:', admin.status);

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

fixAdmin();
