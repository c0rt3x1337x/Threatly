const express = require('express');
const User = require('../models/User');
const { authenticate, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');
const threatly2DatabaseService = require('../services/threatly2DatabaseService');

const router = express.Router();

// Apply admin middleware to all routes
router.use(authenticate, requireAdmin);

// GET /api/admin/users - List all registered users
router.get('/users', async (req, res) => {
  try {
    logger.info('Admin users endpoint called by:', req.user.email);
    const db = await threatly2DatabaseService.connect();
    logger.info('Connected to database, querying users collection...');
    
    const users = await db.collection('users').find({}).sort({ createdAt: -1 }).toArray();
    logger.info(`Found ${users.length} users in database`);
    
    const mappedUsers = users.map(user => ({
      id: user._id,
      _id: user._id, // Keep both for compatibility
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role,
      status: user.status,
      plan: user.plan,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));
    
    logger.info('Sending response with users:', mappedUsers.length);
    res.json({
      success: true,
      users: mappedUsers
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error while fetching users.' 
    });
  }
});

// PATCH /api/admin/users/:id/approve - Approve a user
router.patch('/users/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Convert string ID to ObjectId and validate
    const { ObjectId } = require('mongodb');
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch (error) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user ID format.' 
      });
    }
    
    // Update user in threatly2 database
    const db = await threatly2DatabaseService.connect();
    const updateResult = await db.collection('users').updateOne(
      { _id: objectId },
      { 
        $set: { 
          status: 'approved', 
          updatedAt: new Date() 
        } 
      }
    );
    
    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }
    
    if (updateResult.modifiedCount === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'User is already approved.' 
      });
    }
    
    // Get updated user info
    const updatedUser = await db.collection('users').findOne({ _id: objectId });
    
    logger.info(`User ${updatedUser.email} approved by admin ${req.user.email}`);

    res.json({
      success: true,
      message: `User ${updatedUser.email} approved successfully`,
      user: {
        id: updatedUser._id,
        _id: updatedUser._id, // Keep both for compatibility
        email: updatedUser.email,
        firstName: updatedUser.firstName || '',
        lastName: updatedUser.lastName || '',
        role: updatedUser.role,
        status: updatedUser.status,
        plan: updatedUser.plan
      }
    });
  } catch (error) {
    logger.error('Error approving user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error while approving user.' 
    });
  }
});

// PATCH /api/admin/users/:id/plan - Change user plan
router.patch('/users/:id/plan', async (req, res) => {
  try {
    const { id } = req.params;
    const { plan } = req.body;

    if (!plan || !['simple', 'premium'].includes(plan)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Plan must be either "simple" or "premium".' 
      });
    }

    // Convert string ID to ObjectId and validate
    const { ObjectId } = require('mongodb');
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch (error) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user ID format.' 
      });
    }
    
    // Update user plan in threatly2 database
    const db = await threatly2DatabaseService.connect();
    const updateResult = await db.collection('users').updateOne(
      { _id: objectId },
      { 
        $set: { 
          plan: plan, 
          updatedAt: new Date() 
        } 
      }
    );
    
    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }
    
    if (updateResult.modifiedCount === 0) {
      return res.status(400).json({ 
        success: false, 
        message: `User is already on ${plan} plan.` 
      });
    }
    
    // Get updated user info
    const updatedUser = await db.collection('users').findOne({ _id: objectId });
    
    logger.info(`User ${updatedUser.email} plan changed to ${plan} by admin ${req.user.email}`);

    res.json({
      success: true,
      message: `User ${updatedUser.email} plan changed to ${plan}`,
      user: {
        id: updatedUser._id,
        _id: updatedUser._id, // Keep both for compatibility
        email: updatedUser.email,
        firstName: updatedUser.firstName || '',
        lastName: updatedUser.lastName || '',
        role: updatedUser.role,
        status: updatedUser.status,
        plan: updatedUser.plan
      }
    });
  } catch (error) {
    logger.error('Error changing user plan:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error while changing user plan.' 
    });
  }
});

// PATCH /api/admin/users/:id/suspend - Suspend a user
router.patch('/users/:id/suspend', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Convert string ID to ObjectId and validate
    const { ObjectId } = require('mongodb');
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch (error) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user ID format.' 
      });
    }
    
    // Check if user exists and get current info
    const db = await threatly2DatabaseService.connect();
    const user = await db.collection('users').findOne({ _id: objectId });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot suspend admin users.' 
      });
    }

    if (user.status === 'suspended') {
      return res.status(400).json({ 
        success: false, 
        message: 'User is already suspended.' 
      });
    }
    
    // Update user status in threatly2 database
    const updateResult = await db.collection('users').updateOne(
      { _id: objectId },
      { 
        $set: { 
          status: 'suspended', 
          updatedAt: new Date() 
        } 
      }
    );
    
    if (updateResult.modifiedCount === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Failed to suspend user.' 
      });
    }
    
    // Get updated user info
    const updatedUser = await db.collection('users').findOne({ _id: objectId });

    logger.info(`User ${updatedUser.email} suspended by admin ${req.user.email}`);

    res.json({
      success: true,
      message: `User ${updatedUser.email} suspended successfully`,
      user: {
        id: updatedUser._id,
        _id: updatedUser._id, // Keep both for compatibility
        email: updatedUser.email,
        firstName: updatedUser.firstName || '',
        lastName: updatedUser.lastName || '',
        role: updatedUser.role,
        status: updatedUser.status,
        plan: updatedUser.plan
      }
    });
  } catch (error) {
    logger.error('Error suspending user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error while suspending user.' 
    });
  }
});

// GET /api/admin/stats - Get admin dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const db = await threatly2DatabaseService.connect();
    
    const totalUsers = await db.collection('users').countDocuments({});
    const pendingUsers = await db.collection('users').countDocuments({ status: 'pending' });
    const approvedUsers = await db.collection('users').countDocuments({ status: 'approved' });
    const simpleUsers = await db.collection('users').countDocuments({ plan: 'simple' });
    const premiumUsers = await db.collection('users').countDocuments({ plan: 'premium' });
    const adminUsers = await db.collection('users').countDocuments({ role: 'admin' });

    res.json({
      success: true,
      stats: {
        totalUsers,
        pendingUsers,
        approvedUsers,
        simpleUsers,
        premiumUsers,
        adminUsers
      }
    });
  } catch (error) {
    logger.error('Error fetching admin stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error while fetching statistics.' 
    });
  }
});

module.exports = router;
