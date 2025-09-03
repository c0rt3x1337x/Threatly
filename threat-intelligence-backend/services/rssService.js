const Parser = require('rss-parser');
const axios = require('axios');
const logger = require('../utils/logger');
const Feed = require('../models/Feed');
const Article = require('../models/Article');

class RSSService {
  constructor() {
    this.parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
  }

  /**
   * Fetch and parse RSS feed
   * @param {string} feedUrl - The RSS feed URL
   * @returns {Promise<Array>} Array of parsed articles
   */
  async fetchFeed(feedUrl) {
    try {
      logger.info(`Fetching RSS feed: ${feedUrl}`);
      
      const feed = await this.parser.parseURL(feedUrl);
      const articles = [];

      for (const item of feed.items) {
        const article = {
          title: item.title || 'No Title',
          content: item.contentSnippet || item.content || item.summary || 'No Content',
          link: item.link || item.guid || '',
          isoDate: item.isoDate ? new Date(item.isoDate) : new Date(),
          source: feed.title || new URL(feedUrl).hostname,
          feedUrl: feedUrl
        };

        // Basic validation
        if (article.link && article.title) {
          articles.push(article);
        }
      }

      logger.info(`Successfully parsed ${articles.length} articles from ${feedUrl}`);
      return articles;

    } catch (error) {
      logger.error(`Error fetching RSS feed ${feedUrl}:`, error);
      
      // Update feed error tracking
      await this.updateFeedError(feedUrl, error);
      
      throw error;
    }
  }

  /**
   * Update feed error information in database
   * @param {string} feedUrl - The RSS feed URL
   * @param {Error} error - The error object
   */
  async updateFeedError(feedUrl, error) {
    try {
      await Feed.findOneAndUpdate(
        { url: feedUrl },
        {
          lastError: {
            code: error.code || 'UNKNOWN',
            message: error.message,
            timestamp: new Date()
          },
          errorCount: { $inc: 1 },
          lastFetchAttempt: new Date()
        },
        { upsert: true }
      );
    } catch (dbError) {
      logger.error('Error updating feed error tracking:', dbError);
    }
  }

  /**
   * Check if article is newer than the latest processed article for this feed
   * @param {Object} article - The article object
   * @param {Date} latestDate - The latest processed date for this feed
   * @returns {boolean} True if article is newer
   */
  isArticleNewer(article, latestDate) {
    return article.isoDate > latestDate;
  }

  /**
   * Deduplicate articles based on link and source
   * @param {Array} articles - Array of articles to deduplicate
   * @returns {Promise<Array>} Array of unique articles
   */
  async deduplicateArticles(articles) {
    const uniqueArticles = [];
    
    for (const article of articles) {
      try {
        // Check if article already exists
        const existingArticle = await Article.findOne({
          link: article.link,
          source: article.source
        });

        if (!existingArticle) {
          uniqueArticles.push(article);
        }
      } catch (error) {
        logger.error('Error checking article duplication:', error);
      }
    }

    logger.info(`Deduplication: ${articles.length} -> ${uniqueArticles.length} unique articles`);
    return uniqueArticles;
  }

  /**
   * Initialize default feeds from environment variable if no feeds exist
   */
  async initializeDefaultFeeds() {
    try {
      const existingFeeds = await Feed.countDocuments();
      
      if (existingFeeds === 0) {
        logger.info('No feeds found in database, initializing default feeds...');
        const defaultFeedUrls = process.env.RSS_FEEDS ? process.env.RSS_FEEDS.split(',') : [];
        
        for (const feedUrl of defaultFeedUrls) {
          const feed = new Feed({
            url: feedUrl.trim(),
            name: new URL(feedUrl.trim()).hostname,
            description: `RSS feed from ${new URL(feedUrl.trim()).hostname}`,
            isActive: true
          });
          await feed.save();
          logger.info(`Created default feed: ${feed.name}`);
        }
      }
    } catch (error) {
      logger.error('Error initializing default feeds:', error);
    }
  }

  /**
   * Process all configured RSS feeds
   * @returns {Promise<Array>} Array of all new articles
   */
  async processAllFeeds() {
    // Initialize default feeds if needed
    await this.initializeDefaultFeeds();
    
    // Get feeds from MongoDB
    const feeds = await Feed.find({ isActive: true });
    const allArticles = [];

    for (const feed of feeds) {
      const feedUrl = feed.url;
      try {
        // Skip inactive feeds (already filtered, but double-check)
        if (!feed.isActive) {
          logger.info(`Skipping inactive feed: ${feedUrl}`);
          continue;
        }

        // Fetch articles from feed
        const articles = await this.fetchFeed(feedUrl);
        
        // Filter articles newer than the latest processed
        const newArticles = articles.filter(article => 
          this.isArticleNewer(article, feed.isoDate)
        );

        if (newArticles.length > 0) {
          // Deduplicate articles
          const uniqueArticles = await this.deduplicateArticles(newArticles);
          allArticles.push(...uniqueArticles);

          // Update feed's latest processed date
          const latestDate = Math.max(...newArticles.map(a => a.isoDate.getTime()));
          feed.isoDate = new Date(latestDate);
          feed.fetchCount += 1;
          feed.lastFetchAttempt = new Date();
          await feed.save();

          logger.info(`Processed ${uniqueArticles.length} new articles from ${feedUrl}`);
        } else {
          logger.info(`No new articles from ${feedUrl}`);
        }

      } catch (error) {
        logger.error(`Failed to process feed ${feedUrl}:`, error);
      }
    }

    return allArticles;
  }
}

module.exports = new RSSService();
