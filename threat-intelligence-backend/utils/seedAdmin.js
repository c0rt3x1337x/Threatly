const mongoose = require('mongoose');
const User = require('../models/User');
const logger = require('./logger');

async function seedAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      logger.info('Admin user already exists');
      return;
    }

    // Use fixed admin credentials as specified
    const adminEmail = 'admin@threatly.com';
    const adminPassword = 'admin';

    // Create admin user
    const admin = new User({
      email: adminEmail,
      password: adminPassword, // Will be hashed by pre-save hook
      role: 'admin',
      plan: 'premium',
      status: 'approved'
    });

    await admin.save();

    logger.info(`Admin user created: ${adminEmail}`);
  } catch (error) {
    logger.error('Error seeding admin user:', error);
  }
}

module.exports = { seedAdmin };
