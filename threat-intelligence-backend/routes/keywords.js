const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const threatly2DatabaseService = require('../services/threatly2DatabaseService');
const { authenticate, requirePremium, requireAdmin } = require('../middleware/auth');
const { ObjectId } = require('mongodb');

/**
 * GET /api/keywords
 * Get keywords based on user role:
 * - Admin: all keywords with owner info
 * - Regular users: only their own keywords
 */
router.get('/', authenticate, requirePremium, async (req, res) => {
  try {
    let keywords;
    
    if (req.user.role === 'admin') {
      // Admin gets all keywords with owner information from main database
      const db = await threatly2DatabaseService.connect();
      const keywordsCollection = db.collection('Keywords');
      
      // Get all keywords
      const allKeywords = await keywordsCollection.find({}).sort({ createdAt: -1 }).toArray();
      
      // For each keyword, get owner info from main database
      // Create a new MongoDB connection to the main database
      const { MongoClient } = require('mongodb');
      const mainClient = new MongoClient(process.env.MONGODB_URI);
      await mainClient.connect();
      const mainDb = mainClient.db('threatly');
      const usersCollection = mainDb.collection('users');
      
      try {
        keywords = await Promise.all(allKeywords.map(async (keyword) => {
          try {
            const owner = await usersCollection.findOne({ _id: new ObjectId(keyword.userId) });
            return {
              ...keyword,
              ownerEmail: owner?.email || 'Unknown',
              ownerName: owner?.firstName && owner?.lastName 
                ? `${owner.firstName} ${owner.lastName}` 
                : owner?.email || 'Unknown'
            };
          } catch (error) {
            logger.error(`Error looking up owner for keyword ${keyword._id}:`, error);
            return {
              ...keyword,
              ownerEmail: 'Error loading owner',
              ownerName: 'Error loading owner'
            };
          }
        }));
      } finally {
        await mainClient.close();
      }
    } else {
      // Regular users get only their own keywords
      const db = await threatly2DatabaseService.connect();
      keywords = await db.collection('Keywords').find({ 
        userId: new ObjectId(req.user._id) 
      }).sort({ createdAt: -1 }).toArray();
    }
    
    res.json({
      success: true,
      data: keywords
    });

  } catch (error) {
    logger.error('Error fetching keywords:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch keywords'
    });
  }
});

/**
 * GET /api/keywords/:id
 * Get keyword by ID
 */
router.get('/:id', authenticate, requirePremium, async (req, res) => {
  try {
    const keyword = await threatly2DatabaseService.getKeywordById(req.params.id);
    
    if (!keyword) {
      return res.status(404).json({
        success: false,
        error: 'Keyword not found'
      });
    }

    res.json({
      success: true,
      data: keyword
    });

  } catch (error) {
    logger.error('Error fetching keyword:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch keyword'
    });
  }
});

/**
 * POST /api/keywords
 * Add new keyword (owned by current user)
 */
router.post('/', authenticate, requirePremium, async (req, res) => {
  try {
    const { name, displayName, description } = req.body;

    if (!name || !displayName || !description) {
      return res.status(400).json({
        success: false,
        error: 'Name, displayName, and description are required'
      });
    }

    // Check if keyword already exists globally (admin can override this check)
    const existingKeyword = await threatly2DatabaseService.getKeywordByName(name);
    if (existingKeyword && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        error: 'Keyword with this name already exists'
      });
    }

    const keyword = {
      name: name.toLowerCase(),
      displayName,
      description,
      userId: new ObjectId(req.user._id),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await threatly2DatabaseService.insertKeyword(keyword);
    const newKeyword = { ...keyword, _id: result.insertedId };

    res.status(201).json({
      success: true,
      data: newKeyword
    });

  } catch (error) {
    logger.error('Error adding keyword:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add keyword'
    });
  }
});

/**
 * PATCH /api/keywords/:id
 * Update keyword (users can only edit their own, admin can edit any)
 */
router.patch('/:id', authenticate, requirePremium, async (req, res) => {
  try {
    const { name, displayName, description } = req.body;

    if (!displayName || !description) {
      return res.status(400).json({
        success: false,
        error: 'DisplayName and description are required'
      });
    }

    const keywordId = req.params.id;
    const db = await threatly2DatabaseService.connect();
    
    // Check if keyword exists and user has permission to edit
    const keyword = await db.collection('Keywords').findOne({ _id: new ObjectId(keywordId) });
    
    if (!keyword) {
      return res.status(404).json({
        success: false,
        error: 'Keyword not found'
      });
    }

    // Check ownership: users can only edit their own keywords, admin can edit any
    if (req.user.role !== 'admin' && keyword.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You can only edit your own keywords'
      });
    }

    // Prepare update object
    const update = {
      displayName,
      description,
      updatedAt: new Date()
    };

    // Only allow name update if provided and different
    if (name && name !== keyword.name) {
      // Check if new name already exists globally (admin can override this check)
      const existingKeyword = await threatly2DatabaseService.getKeywordByName(name);
      if (existingKeyword && req.user.role !== 'admin') {
        return res.status(400).json({
          success: false,
          error: 'Keyword with this name already exists'
        });
      }
      update.name = name.toLowerCase();
    }

    logger.info(`Updating keyword ${keywordId} with data:`, update);
    const result = await threatly2DatabaseService.updateKeyword(keywordId, update);
    logger.info(`Update result:`, result);

    if (result.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        error: 'No changes made to keyword'
      });
    }

    // Fetch and return the updated keyword
    const updatedKeyword = await db.collection('Keywords').findOne({ _id: new ObjectId(keywordId) });
    logger.info(`Returning updated keyword:`, updatedKeyword);
    
    res.json({
      success: true,
      data: updatedKeyword,
      message: 'Keyword updated successfully'
    });

  } catch (error) {
    logger.error('Error updating keyword:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update keyword'
      });
  }
});

/**
 * DELETE /api/keywords/:id
 * Delete keyword (users can only delete their own, admin can delete any)
 */
router.delete('/:id', authenticate, requirePremium, async (req, res) => {
  try {
    const keywordId = req.params.id;
    const db = await threatly2DatabaseService.connect();
    
    // Check if keyword exists and user has permission to delete
    const keyword = await db.collection('Keywords').findOne({ _id: new ObjectId(keywordId) });
    
    if (!keyword) {
      return res.status(404).json({
        success: false,
        error: 'Keyword not found'
      });
    }

    // Check ownership: users can only delete their own keywords, admin can delete any
    if (req.user.role !== 'admin' && keyword.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own keywords'
      });
    }

    const result = await threatly2DatabaseService.deleteKeyword(keywordId);

    if (result.deletedCount === 0) {
      return res.status(400).json({
        success: false,
        error: 'Failed to delete keyword'
      });
    }

    res.json({
      success: true,
      message: 'Keyword deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting keyword:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete keyword'
    });
  }
});

/**
 * GET /api/keywords/admin/all
 * Admin-only route to get all keywords with owner information
 */
router.get('/admin/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const db = await threatly2DatabaseService.connect();
    const keywordsCollection = db.collection('Keywords');
    
    // Get all keywords
    const allKeywords = await keywordsCollection.find({}).sort({ createdAt: -1 }).toArray();
    
    // For each keyword, get owner info from main database
    const mainDb = db.client.db('threatly');
    const usersCollection = mainDb.collection('users');
    
    const keywords = await Promise.all(allKeywords.map(async (keyword) => {
      try {
        const owner = await usersCollection.findOne({ _id: new ObjectId(keyword.userId) });
        return {
          ...keyword,
          ownerEmail: owner?.email || 'Unknown',
          ownerName: owner?.firstName && owner?.lastName 
            ? `${owner.firstName} ${owner.lastName}` 
            : owner?.email || 'Unknown'
        };
      } catch (error) {
        return {
          ...keyword,
          ownerEmail: 'Error loading owner',
          ownerName: 'Error loading owner'
        };
      }
    }));
    
    res.json({
      success: true,
      data: keywords
    });

  } catch (error) {
    logger.error('Error fetching all keywords for admin:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch keywords'
    });
  }
});

module.exports = router;
