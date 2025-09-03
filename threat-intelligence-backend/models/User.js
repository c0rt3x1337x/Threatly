const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'suspended'],
    default: 'pending'
  },
  plan: {
    type: String,
    enum: ['simple', 'premium'],
    default: 'simple'
  }
}, {
  timestamps: true // This automatically adds createdAt and updatedAt
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  // Handle both old passwordHash and new password fields during transition
  const storedPassword = this.password || this.passwordHash;
  if (!storedPassword) {
    return false;
  }
  return bcrypt.compare(candidatePassword, storedPassword);
};

// Get user without password
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.passwordHash; // Also remove old field
  return user;
};

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ plan: 1 });
userSchema.index({ status: 1 });

module.exports = mongoose.model('User', userSchema);
