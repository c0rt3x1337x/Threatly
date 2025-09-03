const express = require('express');
const router = express.Router();
const databaseService = require('../services/databaseService');
const scheduler = require('../services/scheduler');
const logger = require('../utils/logger');
const Feed = require('../models/Feed');
const Alert = require('../models/Alert');

/**
 * GET /api/feeds
 * Get all feeds with statistics
 */
router.get('/', async (req, res) => {
  try {
    const feeds = await databaseService.getFeedsWithStats();
    
    res.json({
      success: true,
      data: feeds
    });

  } catch (error) {
    logger.error('Error fetching feeds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch feeds'
    });
  }
});

/**
 * POST /api/feeds
 * Add a new RSS feed
 */
router.post('/', async (req, res) => {
  try {
    const { url, name, description } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Feed URL is required'
      });
    }

    // Check if feed already exists
    const existingFeed = await Feed.findOne({ url });
    if (existingFeed) {
      return res.status(409).json({
        success: false,
        error: 'Feed already exists'
      });
    }

    const feed = new Feed({
      url,
      name: name || new URL(url).hostname,
      description: description || `RSS feed from ${new URL(url).hostname}`
    });

    await feed.save();

    res.status(201).json({
      success: true,
      data: feed
    });

  } catch (error) {
    logger.error('Error adding feed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add feed'
    });
  }
});

/**
 * PUT /api/feeds/:id
 * Update a feed
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const feed = await Feed.findByIdAndUpdate(
      id,
      { name, description, isActive },
      { new: true }
    );

    if (!feed) {
      return res.status(404).json({
        success: false,
        error: 'Feed not found'
      });
    }

    res.json({
      success: true,
      data: feed
    });

  } catch (error) {
    logger.error('Error updating feed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update feed'
    });
  }
});

/**
 * DELETE /api/feeds/:id
 * Delete a feed
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const feed = await Feed.findByIdAndDelete(id);

    if (!feed) {
      return res.status(404).json({
        success: false,
        error: 'Feed not found'
      });
    }

    res.json({
      success: true,
      message: 'Feed deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting feed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete feed'
    });
  }
});

/**
 * GET /api/feeds/scheduler/status
 * Get scheduler status
 */
router.get('/scheduler/status', async (req, res) => {
  try {
    const status = scheduler.getStatus();
    
    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Error fetching scheduler status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scheduler status'
    });
  }
});

/**
 * POST /api/feeds/scheduler/run
 * Run workflow immediately
 */
router.post('/scheduler/run', async (req, res) => {
  try {
    // Run workflow asynchronously
    scheduler.runNow().catch(error => {
      logger.error('Error in manual workflow execution:', error);
    });

    res.json({
      success: true,
      message: 'Workflow started successfully'
    });

  } catch (error) {
    logger.error('Error starting workflow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start workflow'
    });
  }
});

/**
 * PUT /api/feeds/scheduler/schedule
 * Update scheduler schedule
 */
router.put('/scheduler/schedule', async (req, res) => {
  try {
    const { schedule } = req.body;

    if (!schedule) {
      return res.status(400).json({
        success: false,
        error: 'Schedule is required'
      });
    }

    scheduler.updateSchedule(schedule);

    res.json({
      success: true,
      message: 'Schedule updated successfully',
      data: { schedule }
    });

  } catch (error) {
    logger.error('Error updating schedule:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update schedule'
    });
  }
});

/**
 * GET /api/feeds/alerts
 * Get all alerts
 */
router.get('/alerts', async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ name: 1 });
    
    res.json({
      success: true,
      data: alerts
    });

  } catch (error) {
    logger.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts'
    });
  }
});

/**
 * POST /api/feeds/alerts
 * Add a new alert
 */
router.post('/alerts', async (req, res) => {
  try {
    const { name, description, keywords, severity, sectors } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        success: false,
        error: 'Name and description are required'
      });
    }

    // Check if alert already exists
    const existingAlert = await Alert.findOne({ name });
    if (existingAlert) {
      return res.status(409).json({
        success: false,
        error: 'Alert already exists'
      });
    }

    const alert = new Alert({
      name,
      description,
      keywords: keywords || [],
      severity: severity || 'medium',
      sectors: sectors || []
    });

    await alert.save();

    res.status(201).json({
      success: true,
      data: alert
    });

  } catch (error) {
    logger.error('Error adding alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add alert'
    });
  }
});

/**
 * PUT /api/feeds/alerts/:id
 * Update an alert
 */
router.put('/alerts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, keywords, severity, sectors, isActive } = req.body;

    const alert = await Alert.findByIdAndUpdate(
      id,
      { name, description, keywords, severity, sectors, isActive },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    res.json({
      success: true,
      data: alert
    });

  } catch (error) {
    logger.error('Error updating alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update alert'
    });
  }
});

/**
 * DELETE /api/feeds/alerts/:id
 * Delete an alert
 */
router.delete('/alerts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const alert = await Alert.findByIdAndDelete(id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    res.json({
      success: true,
      message: 'Alert deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete alert'
    });
  }
});

module.exports = router;
