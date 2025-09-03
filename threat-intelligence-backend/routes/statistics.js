const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const threatly2DatabaseService = require('../services/threatly2DatabaseService');
const classificationService = require('../services/classificationService');
const axios = require('axios');
const { authenticate, requireAdmin } = require('../middleware/auth');

/**
 * GET /api/statistics/workflow
 * Get workflow statistics (admin only)
 */
router.get('/workflow', authenticate, requireAdmin, async (req, res) => {
  try {
    const [articlesStats, feedsStats] = await Promise.all([
      threatly2DatabaseService.getArticlesStatistics(),
      threatly2DatabaseService.getFeedsStatistics()
    ]);

    const workflowStats = {
      totalFeeds: feedsStats.totalFeeds,
      activeFeeds: feedsStats.activeFeeds,
      feedsWithErrors: feedsStats.feedsWithErrors,
      totalArticles: articlesStats.totalArticles,
      totalRead: articlesStats.totalRead,
      totalSaved: articlesStats.totalSaved,
      totalSpam: articlesStats.totalSpam,
      totalWithAlerts: articlesStats.totalWithAlerts
    };

    const overviewStats = {
      successRate: feedsStats.totalFeeds > 0 ? 
        ((feedsStats.totalFeeds - feedsStats.feedsWithErrors) / feedsStats.totalFeeds * 100).toFixed(1) : 0,
      averageArticlesPerFeed: feedsStats.totalFeeds > 0 ? 
        (articlesStats.totalArticles / feedsStats.totalFeeds).toFixed(1) : 0,
      readRate: articlesStats.totalArticles > 0 ? 
        (articlesStats.totalRead / articlesStats.totalArticles * 100).toFixed(1) : 0,
      alertRate: articlesStats.totalArticles > 0 ? 
        (articlesStats.totalWithAlerts / articlesStats.totalArticles * 100).toFixed(1) : 0
    };

    res.json({
      success: true,
      data: {
        workflow: workflowStats,
        overview: overviewStats
      }
    });

  } catch (error) {
    logger.error('Error fetching workflow statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflow statistics'
    });
  }
});

/**
 * GET /api/statistics/detailed
 * Get detailed statistics (admin only)
 */
router.get('/detailed', authenticate, requireAdmin, async (req, res) => {
  try {
    const db = await threatly2DatabaseService.connect();
    
    // Get feed statistics
    const feedStats = await db.collection('Feeds').aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          activeCount: { $sum: { $cond: ['$isActive', 1, 0] } },
          errorCount: { $sum: { $cond: [{ $ne: ['$error', null] }, 1, 0] } }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    // Get source statistics
    const sourceStats = await db.collection('Articles').aggregate([
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 },
          readCount: { $sum: { $cond: ['$read', 1, 0] } },
          savedCount: { $sum: { $cond: ['$saved', 1, 0] } },
          spamCount: { $sum: { $cond: ['$isSpam', 1, 0] } },
          alertCount: { $sum: { $cond: [{ $gt: [{ $size: '$alertMatches' }, 0] }, 1, 0] } }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();

    // Get industry statistics
    const industryStats = await db.collection('Articles').aggregate([
      { $unwind: '$industries' },
      {
        $group: {
          _id: '$industries',
          count: { $sum: 1 },
          readCount: { $sum: { $cond: ['$read', 1, 0] } },
          savedCount: { $sum: { $cond: ['$saved', 1, 0] } },
          spamCount: { $sum: { $cond: ['$isSpam', 1, 0] } },
          alertCount: { $sum: { $cond: [{ $gt: [{ $size: '$alertMatches' }, 0] }, 1, 0] } }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    res.json({
      success: true,
      data: {
        feeds: feedStats,
        sources: sourceStats,
        industries: industryStats
      }
    });

  } catch (error) {
    logger.error('Error fetching detailed statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch detailed statistics'
    });
  }
});

/**
 * GET /api/statistics/workflow-runs
 * Get workflow run history
 */
router.get('/workflow-runs', authenticate, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [runs, total] = await Promise.all([
      threatly2DatabaseService.getWorkflowRuns({}, { createdAt: -1 }, parseInt(limit), skip),
      threatly2DatabaseService.getWorkflowRunsCount({})
    ]);

    res.json({
      success: true,
      data: {
        runs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching workflow runs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflow runs'
    });
  }
});

/**
 * GET /api/statistics/workflow-runs/:id
 * Get specific workflow run details
 */
router.get('/workflow-runs/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { ObjectId } = require('mongodb');
    const db = await threatly2DatabaseService.connect();
    const run = await db.collection('WorkflowRuns').findOne({ _id: new ObjectId(req.params.id) });
    
    if (!run) {
      return res.status(404).json({
        success: false,
        error: 'Workflow run not found'
      });
    }

    res.json({
      success: true,
      data: run
    });

  } catch (error) {
    logger.error('Error fetching workflow run:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflow run'
    });
  }
});

/**
 * GET /api/statistics/openai-billing
 * Get OpenAI API billing information
 */
router.get('/openai-billing', authenticate, requireAdmin, async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(400).json({
        success: false,
        error: 'OpenAI API key not configured'
      });
    }

    // Get current usage
    const usageResponse = await axios.get('https://api.openai.com/v1/usage', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    // Get subscription info
    const subscriptionResponse = await axios.get('https://api.openai.com/v1/dashboard/billing/subscription', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const billingData = {
      currentPeriod: {
        startDate: new Date(usageResponse.data.start_date),
        endDate: new Date(usageResponse.data.end_date),
        totalUsage: usageResponse.data.total_usage,
        totalCost: usageResponse.data.total_cost || 0
      },
      subscription: {
        plan: subscriptionResponse.data.plan?.id || 'unknown',
        status: subscriptionResponse.data.status || 'unknown',
        limit: subscriptionResponse.data.limit || 0
      }
    };

    res.json({
      success: true,
      data: billingData
    });

  } catch (error) {
    logger.error('Error fetching OpenAI billing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch OpenAI billing information'
    });
  }
});

/**
 * POST /api/statistics/test-run
 * Test run with one random article from HackerNews
 */
router.post('/test-run', async (req, res) => {
  try {
    const db = await threatly2DatabaseService.connect();
    
    // Get one random article from saved articles
    const randomSavedArticle = await db.collection('SavedArticles').aggregate([
      { $sample: { size: 1 } }
    ]).toArray();

    console.log('Saved articles found:', randomSavedArticle.length);

    // If no saved articles found, get any random article
    if (!randomSavedArticle || randomSavedArticle.length === 0) {
      console.log('No saved articles found, using fallback');
      const fallbackArticle = await db.collection('Articles')
        .aggregate([
          { $sample: { size: 1 } }
        ])
        .toArray();
      
      if (!fallbackArticle || fallbackArticle.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No articles found for testing'
        });
      }
      
      randomSavedArticle = fallbackArticle;
      console.log('Using fallback article from:', randomSavedArticle[0].source);
    } else {
      console.log('Using saved article:', randomSavedArticle[0].title.substring(0, 50));
    }

    if (!randomSavedArticle || randomSavedArticle.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No articles found for testing'
      });
    }

    const article = randomSavedArticle[0];
    
    // Classify the article using the active prompt
    const classificationResult = await classificationService.classifyArticlesWithPrompt([article]);
    
    res.json({
      success: true,
      data: {
        testArticle: {
          title: article.title,
          content: article.content,
          source: article.source,
          link: article.link,
          isoDate: article.isoDate
        },
        gptOutput: classificationResult.gptOutput,
        matchedKeywords: classificationResult.matchedKeywords,
        industries: classificationResult.industries
      }
    });

  } catch (error) {
    logger.error('Error running test:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run test: ' + error.message
    });
  }
});

module.exports = router;
