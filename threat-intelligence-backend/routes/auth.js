const express = require('express');
const User = require('../models/User');
const { generateToken, authenticate, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required.' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long.' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email already exists.' 
      });
    }

    // Create new user
    const user = new User({
      email,
      password: password, // Will be hashed by pre-save hook
      role: 'user',
      status: 'pending',
      plan: 'simple'
    });

    await user.save();

    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      success: true,
      message: 'User registered, awaiting approval'
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error during registration.' 
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required.' 
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password.' 
      });
    }

    // Check user status - admin can always login, others need approval
    // Special case: admin@threatly.com can always login regardless of status
    if (user.role !== 'admin' && user.email !== 'admin@threatly.com') {
      if (user.status === 'pending') {
        return res.status(403).json({ 
          success: false, 
          message: 'Account pending approval by admin' 
        });
      }
      if (user.status === 'suspended') {
        return res.status(403).json({ 
          success: false, 
          message: 'Account suspended' 
        });
      }
      if (user.status !== 'approved') {
        return res.status(403).json({ 
          success: false, 
          message: 'Account not approved.' 
        });
      }
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password.' 
      });
    }

    // Generate token
    const token = generateToken(user._id, user.email, user.role, user.plan);

    // Set token in HttpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000 // 1 hour
    });

    logger.info(`User logged in: ${email}`);

    res.json({
      success: true,
      token,
      user: {
        email: user.email,
        role: user.role,
        plan: user.plan
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error during login.' 
    });
  }
});

// Get current user info
router.get('/me', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    // Get fresh user data from database
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        plan: user.plan,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    logger.error('Error getting user info:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Logout user
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ 
    success: true, 
    message: 'Logged out successfully' 
  });
});

// Get current user info
router.get('/me', authenticate, (req, res) => {
  res.json({
    success: true,
    user: {
      email: req.user.email,
      role: req.user.role,
      plan: req.user.plan,
      status: req.user.status
    }
  });
});

// Get all users (admin only)
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}).select('-password -passwordHash');
    res.json({
      success: true,
      users
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error while fetching users.' 
    });
  }
});

// Update user status/plan (admin only)
router.put('/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, plan } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }

    if (status) user.status = status;
    if (plan) user.plan = plan;

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error while updating user.' 
    });
  }
});

module.exports = router;
