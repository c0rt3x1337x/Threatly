const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const threatly2DatabaseService = require('../services/threatly2DatabaseService');
const { authenticate, requirePremium, requireAdmin } = require('../middleware/auth');
const { ObjectId } = require('mongodb');

/**
 * GET /api/articles
 * Get all articles with optional filtering
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      source = '', 
      industry = '', 
      type = '',
      read = '',
      saved = '',
      spam = ''
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build filter object
    const filter = {};
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (source && source !== '') {
      filter.source = source;
    }
    
    if (industry && industry !== 'all') {
      filter.industries = { $in: [industry] };
    }
    
    if (read !== '') {
      filter.read = read === 'true';
    }
    
    if (saved !== '') {
      filter.saved = saved === 'true';
    }
    
    if (spam !== '') {
      filter.isSpam = spam === 'true';
    } else {
      // By default, exclude spam articles from the main articles list
      filter.isSpam = { $ne: true };
    }

    // SIMPLIFIED: Just get articles directly without complex type filtering
    const articles = await threatly2DatabaseService.getArticles(filter, { isoDate: -1 }, parseInt(limit), skip);
    const total = await threatly2DatabaseService.getArticlesCount(filter);

    res.json({
      success: true,
      data: articles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    logger.error('Error fetching articles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch articles'
    });
  }
});

/**
 * GET /api/articles/types
 * Get available article types from Feeds collection
 */
router.get('/types', async (req, res) => {
  try {
    const db = await threatly2DatabaseService.connect();
    const types = await db.collection('Feeds').distinct('type');
    
    res.json({
      success: true,
      data: types.filter(type => type) // Filter out null/undefined values
    });

  } catch (error) {
    logger.error('Error fetching article types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch article types'
    });
  }
});

/**
 * GET /api/articles/sources
 * Get available article sources from Articles collection
 */
router.get('/sources', async (req, res) => {
  try {
    const db = await threatly2DatabaseService.connect();
    const sources = await db.collection('Articles').distinct('source');
    
    res.json({
      success: true,
      data: sources.filter(source => source).sort() // Filter out null/undefined values and sort alphabetically
    });

  } catch (error) {
    logger.error('Error fetching article sources:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch article sources'
    });
  }
});

/**
 * GET /api/articles/stats/summary
 * Get summary statistics for dashboard
 */
router.get('/stats/summary', async (req, res) => {
  try {
    logger.info('Dashboard requesting summary statistics');
    const db = await threatly2DatabaseService.connect();
    
    // Get basic statistics
    const totalArticles = await db.collection('Articles').countDocuments({});
    logger.info(`Total articles: ${totalArticles}`);
    
    const spamArticles = await db.collection('Articles').countDocuments({ isSpam: true });
    logger.info(`Spam articles: ${spamArticles}`);
    
    const readArticles = await db.collection('Articles').countDocuments({ read: true });
    logger.info(`Read articles: ${readArticles}`);
    
    const savedArticles = await db.collection('Articles').countDocuments({ saved: true });
    logger.info(`Saved articles: ${savedArticles}`);
    
    const articlesWithAlerts = await db.collection('Articles').countDocuments({
      alertMatches: { $exists: true, $ne: [] }
    });
    logger.info(`Articles with alerts: ${articlesWithAlerts}`);

    // Get severity statistics
    const highSeverity = await db.collection('Articles').countDocuments({ severity: 'high' });
    const mediumSeverity = await db.collection('Articles').countDocuments({ severity: 'medium' });
    const lowSeverity = await db.collection('Articles').countDocuments({ severity: 'low' });
    logger.info(`Severity counts - High: ${highSeverity}, Medium: ${mediumSeverity}, Low: ${lowSeverity}`);

    // Get industry-specific statistics (these might need to be adjusted based on your actual data)
    const automotiveSecurity = await db.collection('Articles').countDocuments({
      industries: { $in: ['Automotive', 'Automotive Security'] }
    });
    logger.info(`Automotive security articles: ${automotiveSecurity}`);
    
    const samsungSDI = await db.collection('Articles').countDocuments({
      alertMatches: { $in: ['samsung_sdi'] }
    });
    logger.info(`Samsung SDI articles: ${samsungSDI}`);
    
    const adyenRelated = await db.collection('Articles').countDocuments({
      alertMatches: { $in: ['adyen'] }
    });
    logger.info(`Adyen related articles: ${adyenRelated}`);

    res.json({
      success: true,
      totalArticles,
      highSeverity,
      mediumSeverity,
      lowSeverity,
      automotiveSecurity,
      samsungSDI,
      adyenRelated,
      spam: spamArticles,
      readArticles,
      savedArticles,
      articlesWithAlerts
    });

  } catch (error) {
    logger.error('Error fetching summary statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch summary statistics'
    });
  }
});

/**
 * GET /api/articles/search/:query
 * Search articles by title and content
 */
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    if (!query || query.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const db = await threatly2DatabaseService.connect();
    
    // Create search filter for title and content
    const searchFilter = {
      $and: [
        {
          $or: [
            { title: { $regex: query, $options: 'i' } },
            { content: { $regex: query, $options: 'i' } },
            { source: { $regex: query, $options: 'i' } }
          ]
        },
        // Exclude spam articles from search results by default
        { isSpam: { $ne: true } }
      ]
    };

    // Get total count for pagination
    const totalCount = await db.collection('Articles').countDocuments(searchFilter);
    
    // Get articles with pagination
    const articles = await db.collection('Articles')
      .find(searchFilter)
      .sort({ isoDate: -1, isodate: -1, pubDate: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    res.json({
      success: true,
      data: articles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit))
      }
    });

  } catch (error) {
    logger.error('Error searching articles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search articles'
    });
  }
});

/**
 * GET /api/articles/stats/unread-count
 * Get unread articles count
 */
router.get('/stats/unread-count', async (req, res) => {
  try {
    logger.info('Dashboard requesting unread count');
    const db = await threatly2DatabaseService.connect();
    const unreadCount = await db.collection('Articles').countDocuments({ 
      read: { $ne: true },
      isSpam: { $ne: true } // Exclude spam articles from unread count
    });
    
    logger.info(`Unread count: ${unreadCount}`);
    
    res.json({
      success: true,
      unreadCount
    });

  } catch (error) {
    logger.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch unread count'
    });
  }
});

/**
 * GET /api/articles/spam
 * Get spam articles only (admin only)
 */
router.get('/spam', authenticate, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const filter = { isSpam: true };
    
    const articles = await threatly2DatabaseService.getArticles(filter, { isoDate: -1 }, parseInt(limit), skip);
    const total = await threatly2DatabaseService.getArticlesCount(filter);

    res.json({
      success: true,
      data: articles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    logger.error('Error fetching spam articles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch spam articles'
    });
  }
});

/**
 * DELETE /api/articles/spam
 * Delete all spam articles (admin only)
 */
router.delete('/spam', authenticate, requireAdmin, async (req, res) => {
  try {
    logger.info('Delete all spam articles request received');
    
    const result = await threatly2DatabaseService.deleteAllSpamArticles();
    logger.info(`Delete all spam articles result: ${JSON.stringify(result)}`);

    res.json({
      success: true,
      message: 'All spam articles deleted successfully',
      deletedCount: result.deletedCount
    });

  } catch (error) {
    logger.error('Error deleting all spam articles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete all spam articles'
    });
  }
});

/**
 * GET /api/articles/alerts
 * Get articles with alerts based on user role and keyword ownership
 */
router.get('/alerts', authenticate, requirePremium, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let filter = { 
      alertMatches: { $exists: true, $ne: [] },
      isSpam: { $ne: true } // Exclude spam articles from alerts
    };
    let articles;
    let total;
    
    if (req.user.role === 'admin') {
      // Admin gets all articles with alerts
      articles = await threatly2DatabaseService.getArticles(filter, { isoDate: -1 }, parseInt(limit), skip);
      total = await threatly2DatabaseService.getArticlesCount(filter);
      
      // For admin, also get keyword details for each alert match
      const db = await threatly2DatabaseService.connect();
      const keywordsCollection = db.collection('Keywords');
      
      // Get all unique keyword IDs from all articles
      const allKeywordIds = new Set();
      articles.forEach(article => {
        if (article.alertMatches && Array.isArray(article.alertMatches)) {
          article.alertMatches.forEach(id => allKeywordIds.add(id.toString()));
        }
      });
      
      // Get keyword details for all matched keywords
      const keywords = await keywordsCollection.find({ 
        _id: { $in: Array.from(allKeywordIds).map(id => new ObjectId(id)) } 
      }).toArray();
      
      // Create a map of keyword ID to keyword details
      const keywordMap = {};
      keywords.forEach(keyword => {
        keywordMap[keyword._id.toString()] = keyword;
      });
      
      // Add keyword details to each article
      articles = articles.map(article => {
        if (article.alertMatches && Array.isArray(article.alertMatches)) {
          article.alertMatches = article.alertMatches.map(keywordId => {
            const keyword = keywordMap[keywordId.toString()];
            return {
              _id: keywordId,
              name: keyword?.name || 'Unknown',
              displayName: keyword?.displayName || 'Unknown',
              ownerEmail: keyword?.ownerEmail || 'Unknown'
            };
          });
        }
        return article;
      });
      
    } else {
      // Regular users get only articles that match their keywords
      const db = await threatly2DatabaseService.connect();
      const keywordsCollection = db.collection('Keywords');
      
      // Get all keyword IDs owned by the current user
      const userKeywords = await keywordsCollection.find({ 
        userId: new ObjectId(req.user._id) 
      }).project({ _id: 1 }).toArray();
      
      const userKeywordIds = userKeywords.map(k => k._id.toString());
      
      if (userKeywordIds.length === 0) {
        // User has no keywords, return empty result
        return res.json({
          success: true,
          data: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0
          }
        });
      }
      
      // Filter articles to only include those that match user's keywords
      filter = {
        alertMatches: { 
          $in: userKeywordIds.map(id => new ObjectId(id))
        },
        isSpam: { $ne: true } // Exclude spam articles from alerts
      };
      
      articles = await threatly2DatabaseService.getArticles(filter, { isoDate: -1 }, parseInt(limit), skip);
      total = await threatly2DatabaseService.getArticlesCount(filter);
    }

    res.json({
      success: true,
      data: articles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    logger.error('Error fetching alert articles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert articles'
    });
  }
});

/**
 * GET /api/articles/saved
 * Get saved articles only
 */
router.get('/saved', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const filter = { saved: true };
    
    const articles = await threatly2DatabaseService.getArticles(filter, { isoDate: -1 }, parseInt(limit), skip);
    const total = await threatly2DatabaseService.getArticlesCount(filter);

    res.json({
      success: true,
      data: articles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    logger.error('Error fetching saved articles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch saved articles'
    });
  }
});

/**
 * DELETE /api/articles
 * Delete all articles (admin only)
 */
router.delete('/', authenticate, requireAdmin, async (req, res) => {
  try {
    logger.info(`Delete all articles request received by admin: ${req.user.email}`);
    
    const result = await threatly2DatabaseService.deleteAllArticles();
    logger.info(`Delete all articles result: ${JSON.stringify(result)}`);

    res.json({
      success: true,
      message: 'All articles deleted successfully',
      deletedCount: result.deletedCount
    });

  } catch (error) {
    logger.error('Error deleting all articles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete all articles'
    });
  }
});

/**
 * GET /api/articles/:id
 * Get article by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const article = await threatly2DatabaseService.getArticleById(req.params.id);
    
    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }

    res.json({
      success: true,
      data: article
    });

  } catch (error) {
    logger.error('Error fetching article:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch article'
    });
  }
});

/**
 * PATCH /api/articles/:id/read
 * Mark article as read
 */
router.patch('/:id/read', async (req, res) => {
  try {
    logger.info(`Mark as read/unread request for article: ${req.params.id}`);
    const { read = true } = req.body;
    logger.info(`Read status to set: ${read}`);
    
    const result = await threatly2DatabaseService.updateArticle(req.params.id, {
      read,
      readAt: read ? new Date() : null
    });

    logger.info(`Update result: ${JSON.stringify(result)}`);

    if (result.matchedCount === 0) {
      logger.warn(`Article not found: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }

    logger.info(`Article ${req.params.id} marked as ${read ? 'read' : 'unread'} successfully`);
    res.json({
      success: true,
      message: `Article marked as ${read ? 'read' : 'unread'}`
    });

  } catch (error) {
    logger.error('Error updating article read status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update article read status'
    });
  }
});

/**
 * PATCH /api/articles/:id/saved
 * Mark article as saved
 */
router.patch('/:id/saved', async (req, res) => {
  try {
    logger.info(`Save/unsave request for article: ${req.params.id}`);
    const { saved = true } = req.body;
    logger.info(`Saved status to set: ${saved}`);
    
    const result = await threatly2DatabaseService.updateArticle(req.params.id, {
      saved,
      savedAt: saved ? new Date() : null
    });

    logger.info(`Update result: ${JSON.stringify(result)}`);

    if (result.matchedCount === 0) {
      logger.warn(`Article not found: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }

    logger.info(`Article ${req.params.id} ${saved ? 'saved' : 'unsaved'} successfully`);
    res.json({
      success: true,
      message: `Article ${saved ? 'saved' : 'unsaved'}`
    });

  } catch (error) {
    logger.error('Error updating article saved status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update article saved status'
    });
  }
});

/**
 * PATCH /api/articles/:id/spam
 * Mark article as spam (authenticated users only)
 */
router.patch('/:id/spam', authenticate, async (req, res) => {
  try {
    const { isSpam = true } = req.body;
    
    const result = await threatly2DatabaseService.updateArticle(req.params.id, {
      isSpam
    });

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }

    res.json({
      success: true,
      message: `Article marked as ${isSpam ? 'spam' : 'not spam'}`
    });

  } catch (error) {
    logger.error('Error updating article spam status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update article spam status'
    });
  }
});

/**
 * DELETE /api/articles/:id
 * Delete article (admin only)
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    logger.info(`Delete request for article: ${req.params.id} by admin: ${req.user.email}`);
    
    const result = await threatly2DatabaseService.deleteArticle(req.params.id);
    logger.info(`Delete result: ${JSON.stringify(result)}`);

    if (result.deletedCount === 0) {
      logger.warn(`Article not found for deletion: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }

    logger.info(`Article ${req.params.id} deleted successfully by admin: ${req.user.email}`);
    res.json({
      success: true,
      message: 'Article deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting article:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete article'
    });
  }
});

module.exports = router;
