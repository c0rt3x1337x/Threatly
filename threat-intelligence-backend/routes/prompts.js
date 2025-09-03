const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { ObjectId } = require('mongodb');
const threatly2DatabaseService = require('../services/threatly2DatabaseService');

/**
 * GET /api/prompts
 * Get all prompts
 */
router.get('/', async (req, res) => {
  try {
    const db = await threatly2DatabaseService.connect();
    const prompts = await db.collection('Prompts').find({}).sort({ createdAt: -1 }).toArray();
    
    res.json({
      success: true,
      data: prompts
    });

  } catch (error) {
    logger.error('Error fetching prompts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prompts'
    });
  }
});

/**
 * GET /api/prompts/active
 * Get the currently active prompt
 */
router.get('/active', async (req, res) => {
  try {
    const db = await threatly2DatabaseService.connect();
    const activePrompt = await db.collection('Prompts').findOne({ isActive: true });
    
    if (!activePrompt) {
      return res.status(404).json({
        success: false,
        error: 'No active prompt found'
      });
    }

    res.json({
      success: true,
      data: activePrompt
    });

  } catch (error) {
    logger.error('Error fetching active prompt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active prompt'
    });
  }
});

/**
 * GET /api/prompts/:id
 * Get prompt by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const db = await threatly2DatabaseService.connect();
    const prompt = await db.collection('Prompts').findOne({ _id: new ObjectId(req.params.id) });
    
    if (!prompt) {
      return res.status(404).json({
        success: false,
        error: 'Prompt not found'
      });
    }

    res.json({
      success: true,
      data: prompt
    });

  } catch (error) {
    logger.error('Error fetching prompt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prompt'
    });
  }
});

/**
 * POST /api/prompts
 * Create new prompt
 */
router.post('/', async (req, res) => {
  try {
    const { name, content, description, isActive = true } = req.body;

    if (!name || !content) {
      return res.status(400).json({
        success: false,
        error: 'Name and content are required'
      });
    }

    const db = await threatly2DatabaseService.connect();
    const prompt = {
      name,
      content,
      description: description || '',
      isActive,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('Prompts').insertOne(prompt);
    prompt._id = result.insertedId;

    res.json({
      success: true,
      data: prompt
    });

  } catch (error) {
    logger.error('Error creating prompt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create prompt'
    });
  }
});

/**
 * PUT /api/prompts/:id
 * Update prompt
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, content, description, isActive } = req.body;

    if (!name || !content) {
      return res.status(400).json({
        success: false,
        error: 'Name and content are required'
      });
    }

    const db = await threatly2DatabaseService.connect();
    const update = {
      name,
      content,
      description: description || '',
      updatedAt: new Date()
    };

    if (isActive !== undefined) {
      update.isActive = isActive;
      
      // If setting this prompt as active, deactivate all others
      if (isActive === true) {
        await db.collection('Prompts').updateMany(
          { _id: { $ne: new ObjectId(req.params.id) } },
          { $set: { isActive: false, updatedAt: new Date() } }
        );
      }
    }

    const result = await db.collection('Prompts').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: update }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Prompt not found'
      });
    }

    res.json({
      success: true,
      message: 'Prompt updated successfully'
    });

  } catch (error) {
    logger.error('Error updating prompt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update prompt'
    });
  }
});

/**
 * POST /api/prompts/:id/activate
 * Set a prompt as active (deactivates all others)
 */
router.post('/:id/activate', async (req, res) => {
  try {
    const db = await threatly2DatabaseService.connect();
    
    // First, deactivate all prompts
    await db.collection('Prompts').updateMany(
      {},
      { $set: { isActive: false, updatedAt: new Date() } }
    );
    
    // Then activate the specified prompt
    const result = await db.collection('Prompts').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { isActive: true, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Prompt not found'
      });
    }

    res.json({
      success: true,
      message: 'Prompt activated successfully'
    });

  } catch (error) {
    logger.error('Error activating prompt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to activate prompt'
    });
  }
});

/**
 * DELETE /api/prompts/:id
 * Delete prompt
 */
router.delete('/:id', async (req, res) => {
  try {
    const db = await threatly2DatabaseService.connect();
    const result = await db.collection('Prompts').deleteOne({ _id: new ObjectId(req.params.id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Prompt not found'
      });
    }

    res.json({
      success: true,
      message: 'Prompt deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting prompt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete prompt'
    });
  }
});

module.exports = router;
