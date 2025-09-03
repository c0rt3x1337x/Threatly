const logger = require('../utils/logger');
const Article = require('../models/Article');
const Feed = require('../models/Feed');

class DatabaseService {
  /**
   * Save articles to database
   * @param {Array} articles - Array of articles to save
   * @returns {Promise<Array>} Array of saved articles
   */
  async saveArticles(articles) {
    if (!articles || articles.length === 0) {
      return [];
    }

    const savedArticles = [];
    const errors = [];

    for (const article of articles) {
      try {
        // Check if article already exists
        const existingArticle = await Article.findOne({
          link: article.link,
          source: article.source
        });

        if (existingArticle) {
          logger.debug(`Article already exists: ${article.title}`);
          continue;
        }

        // Create new article document
        const newArticle = new Article({
          title: article.title,
          content: article.content,
          link: article.link,
          isoDate: article.isoDate,
          source: article.source,
          feedUrl: article.feedUrl,
          sector: article.sector || 'Other',
          severity: article.severity || 'medium',
          spam: article.spam || 0,
          alerts: article.alerts || {}
        });

        const savedArticle = await newArticle.save();
        savedArticles.push(savedArticle);
        logger.info(`Saved article: ${article.title}`);

      } catch (error) {
        logger.error(`Error saving article ${article.title}:`, error);
        errors.push({ article: article.title, error: error.message });
      }
    }

    if (errors.length > 0) {
      logger.warn(`Failed to save ${errors.length} articles:`, errors);
    }

    logger.info(`Successfully saved ${savedArticles.length} articles`);
    return savedArticles;
  }

  /**
   * Update articles with classification results
   * @param {Array} classifications - Array of classification results
   * @returns {Promise<Array>} Array of updated articles
   */
  async updateArticleClassifications(classifications) {
    const updatedArticles = [];
    const errors = [];

    for (const classification of classifications) {
      try {
        const updateData = {
          sector: classification.sector,
          severity: classification.severity,
          spam: classification.spam,
          lastUpdated: new Date()
        };

        // Add alert fields
        Object.keys(classification).forEach(key => {
          if (key !== '_id' && key !== 'sector' && key !== 'severity' && key !== 'spam') {
            updateData[`alerts.${key}`] = classification[key];
          }
        });

        const updatedArticle = await Article.findOneAndUpdate(
          { _id: classification._id },
          updateData,
          { new: true }
        );

        if (updatedArticle) {
          updatedArticles.push(updatedArticle);
          logger.debug(`Updated classification for article: ${updatedArticle.title}`);
        }

      } catch (error) {
        logger.error(`Error updating classification for article ${classification._id}:`, error);
        errors.push({ articleId: classification._id, error: error.message });
      }
    }

    if (errors.length > 0) {
      logger.warn(`Failed to update ${errors.length} classifications:`, errors);
    }

    logger.info(`Successfully updated ${updatedArticles.length} article classifications`);
    return updatedArticles;
  }

  /**
   * Get articles with pagination and filtering
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated articles result
   */
  async getArticles(options = {}) {
    const {
      page = 1,
      limit = 20,
      sector,
      severity,
      source,
      search,
      startDate,
      endDate,
      sortBy = 'isoDate',
      sortOrder = 'desc'
    } = options;

    try {
      // Build query
      const query = {};

      // Exclude spam articles from main articles list
      query.$or = [
        { spam: 0 },
        { isSpam: false },
        { isSpam: { $exists: false } }
      ];

      if (sector) {
        query.sector = sector;
      }

      if (severity) {
        query.severity = severity;
      }

      if (source) {
        query.source = { $regex: source, $options: 'i' };
      }

      if (search) {
        query.$text = { $search: search };
      }

      if (startDate || endDate) {
        query.isoDate = {};
        if (startDate) {
          query.isoDate.$gte = new Date(startDate);
        }
        if (endDate) {
          query.isoDate.$lte = new Date(endDate);
        }
      }

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Execute query with pagination
      const skip = (page - 1) * limit;
      
      const [articles, total] = await Promise.all([
        Article.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Article.countDocuments(query)
      ]);

      return {
        articles,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      logger.error('Error fetching articles:', error);
      throw error;
    }
  }

  /**
   * Get article statistics
   * @returns {Promise<Object>} Statistics object
   */
  async getArticleStats() {
    try {
      const [
        totalArticles,
        sectorStats,
        severityStats,
        sourceStats,
        recentArticles
      ] = await Promise.all([
        Article.countDocuments(),
        Article.aggregate([
          { $group: { _id: '$sector', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        Article.aggregate([
          { $group: { _id: '$severity', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        Article.aggregate([
          { $group: { _id: '$source', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]),
        Article.countDocuments({
          isoDate: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        })
      ]);

      return {
        totalArticles,
        sectorStats,
        severityStats,
        sourceStats,
        recentArticles
      };

    } catch (error) {
      logger.error('Error fetching article statistics:', error);
      throw error;
    }
  }

  /**
   * Get feeds with statistics
   * @returns {Promise<Array>} Array of feeds with stats
   */
  async getFeedsWithStats() {
    try {
      const feeds = await Feed.find().lean();
      
      const feedsWithStats = await Promise.all(
        feeds.map(async (feed) => {
          const articleCount = await Article.countDocuments({ feedUrl: feed.url });
          const lastArticle = await Article.findOne({ feedUrl: feed.url })
            .sort({ isoDate: -1 })
            .select('title isoDate')
            .lean();

          return {
            ...feed,
            articleCount,
            lastArticle
          };
        })
      );

      return feedsWithStats;

    } catch (error) {
      logger.error('Error fetching feeds with stats:', error);
      throw error;
    }
  }

  /**
   * Clean up old articles (optional maintenance function)
   * @param {number} daysOld - Number of days old to consider for cleanup
   * @returns {Promise<number>} Number of articles deleted
   */
  async cleanupOldArticles(daysOld = 90) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      
      const result = await Article.deleteMany({
        isoDate: { $lt: cutoffDate }
      });

      logger.info(`Cleaned up ${result.deletedCount} articles older than ${daysOld} days`);
      return result.deletedCount;

    } catch (error) {
      logger.error('Error cleaning up old articles:', error);
      throw error;
    }
  }
}

module.exports = new DatabaseService();
