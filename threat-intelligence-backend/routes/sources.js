const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const threatly2DatabaseService = require('../services/threatly2DatabaseService');
const { authenticate, requireAdmin } = require('../middleware/auth');

/**
 * GET /api/sources
 * Get all sources from threatly2 database (admin only)
 */
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const feeds = await threatly2DatabaseService.getFeeds();
    
    // Transform feeds to match the expected format
    const sources = feeds.map(feed => ({
      _id: feed._id,
      name: feed.name,
      url: feed.url,
      description: feed.description || '',
      category: feed.category || 'general',
      type: feed.type || 'news',
      status: feed.error ? 'inactive' : 'active',
      error: feed.error,
      isActive: feed.isActive,
      createdAt: feed.createdAt,
      updatedAt: feed.updatedAt,
      isodate: feed.isodate,
      lastFetch: feed.lastFetch,
      fetchCount: feed.fetchCount || 0,
      errorCount: feed.errorCount || 0
    }));

    res.json({
      success: true,
      data: sources
    });

  } catch (error) {
    logger.error('Error fetching sources:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sources'
    });
  }
});

/**
 * GET /api/sources/:id
 * Get source by ID (admin only)
 */
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const feed = await threatly2DatabaseService.getFeedById(req.params.id);
    
    if (!feed) {
      return res.status(404).json({
        success: false,
        error: 'Source not found'
      });
    }

    const source = {
      _id: feed._id,
      name: feed.name,
      url: feed.url,
      description: feed.description || '',
      category: feed.category || 'general',
      type: feed.type || 'news',
      status: feed.error ? 'inactive' : 'active',
      error: feed.error,
      isActive: feed.isActive,
      createdAt: feed.createdAt,
      updatedAt: feed.updatedAt,
      isodate: feed.isodate,
      lastFetch: feed.lastFetch,
      fetchCount: feed.fetchCount || 0,
      errorCount: feed.errorCount || 0
    };

    res.json({
      success: true,
      data: source
    });

  } catch (error) {
    logger.error('Error fetching source:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch source'
    });
  }
});

/**
 * POST /api/sources
 * Add new source (admin only)
 */
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, url, description, category, type } = req.body;

    if (!name || !url) {
      return res.status(400).json({
        success: false,
        error: 'Name and URL are required'
      });
    }

    const feed = {
      name,
      url,
      description: description || '',
      category: category || 'general',
      type: type || 'news',
      status: 'active',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      fetchCount: 0,
      errorCount: 0
    };

    const result = await threatly2DatabaseService.insertFeed(feed);
    const newFeed = { ...feed, _id: result.insertedId };

    res.status(201).json({
      success: true,
      data: newFeed
    });

  } catch (error) {
    logger.error('Error adding source:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add source'
    });
  }
});

/**
 * PUT /api/sources/:id
 * Update source
 */
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, url, description, category, type, isActive } = req.body;
    
    logger.info(`Updating source ${req.params.id} with data:`, { name, url, category, type, isActive });

    if (!name || !url) {
      return res.status(400).json({
        success: false,
        error: 'Name and URL are required'
      });
    }

    const update = {
      name,
      url,
      description: description || '',
      category: category || 'general',
      type: type || 'news',
      isActive: isActive !== undefined ? isActive : true,
      updatedAt: new Date()
    };

    logger.info('Update object:', update);

    const result = await threatly2DatabaseService.updateFeed(req.params.id, update);
    
    logger.info('Update result:', result);

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Source not found'
      });
    }

    res.json({
      success: true,
      message: 'Source updated successfully'
    });

  } catch (error) {
    logger.error('Error updating source:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update source'
    });
  }
});

/**
 * DELETE /api/sources/:id
 * Delete source
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await threatly2DatabaseService.deleteFeed(req.params.id);

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Source not found'
      });
    }

    res.json({
      success: true,
      message: 'Source deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting source:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete source'
    });
  }
});

/**
 * PATCH /api/sources/:id/clear-error
 * Clear error for a source
 */
router.patch('/:id/clear-error', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await threatly2DatabaseService.clearFeedError(req.params.id);

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Source not found'
      });
    }

    res.json({
      success: true,
      message: 'Source error cleared successfully'
    });

  } catch (error) {
    logger.error('Error clearing source error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear source error'
    });
  }
});

/**
 * PATCH /api/sources/:id/iso-time
 * Update ISO time for a source
 */
router.patch('/:id/iso-time', authenticate, requireAdmin, async (req, res) => {
  try {
    const { isoDate } = req.body;
    
    logger.info(`Updating ISO time for source ${req.params.id} to: ${isoDate}`);

    if (!isoDate) {
      return res.status(400).json({
        success: false,
        error: 'ISO date is required'
      });
    }

    const result = await threatly2DatabaseService.updateFeedIsoTime(req.params.id, isoDate);
    
    logger.info('ISO time update result:', result);

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Source not found'
      });
    }

    res.json({
      success: true,
      message: 'Source ISO time updated successfully'
    });

  } catch (error) {
    logger.error('Error updating source ISO time:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update source ISO time'
    });
  }
});

/**
 * PATCH /api/sources/:id/last-fetch
 * Update lastFetch time for a source
 */
router.patch('/:id/last-fetch', authenticate, requireAdmin, async (req, res) => {
  try {
    const { lastFetch } = req.body;
    
    logger.info(`Updating lastFetch for source ${req.params.id} to: ${lastFetch}`);

    if (!lastFetch) {
      return res.status(400).json({
        success: false,
        error: 'LastFetch date is required'
      });
    }

    const result = await threatly2DatabaseService.updateFeedLastFetch(req.params.id, lastFetch);
    
    logger.info('LastFetch update result:', result);

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Source not found'
      });
    }

    res.json({
      success: true,
      message: 'Source lastFetch updated successfully'
    });

  } catch (error) {
    logger.error('Error updating source lastFetch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update source lastFetch'
    });
  }
});

/**
 * POST /api/sources/:id/run
 * Run a single source
 */
router.post('/:id/run', async (req, res) => {
  try {
    logger.info(`Running single source: ${req.params.id}`);
    
    const threatly2RSSService = require('../threatly2-rss-service');
    const result = await threatly2RSSService.fetchSingleFeed(req.params.id);
    
    logger.info('Single source run result:', result);

    res.json({
      success: result.success,
      data: result,
      error: result.error
    });

  } catch (error) {
    logger.error('Error running source:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run source'
    });
  }
});

module.exports = router;
