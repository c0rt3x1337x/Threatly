require('dotenv').config();
const Parser = require('rss-parser');
const logger = require('./utils/logger');
const threatly2DatabaseService = require('./services/threatly2DatabaseService');
const classificationService = require('./services/classificationService');

// Create RSS parser instance
const parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

class Threatly2RSSService {
  constructor() {
    this.parser = parser;
  }

  /**
   * Fetch and process all active RSS feeds
   */
  async fetchAllFeeds() {
    const startTime = Date.now();
    let totalArticlesFetched = 0;
    let totalNewArticles = 0;
    let totalErrors = 0;
    const feedResults = [];

    try {
      logger.info('Starting RSS feed fetching process...');
      
      // Get all active feeds from threatly2 database
      const feeds = await threatly2DatabaseService.getActiveFeeds();
      logger.info(`Found ${feeds.length} active feeds to process`);

      if (feeds.length === 0) {
        logger.warn('No active feeds found');
        return {
          success: true,
          totalFeeds: 0,
          totalArticlesFetched: 0,
          totalNewArticles: 0,
          totalErrors: 0,
          processingTime: Date.now() - startTime,
          feedResults: []
        };
      }

      // Process each feed
      for (const feed of feeds) {
        const feedStartTime = Date.now();
        let feedArticlesFetched = 0;
        let feedNewArticles = 0;
        let feedError = null;

        try {
          logger.info(`Processing feed: ${feed.name} (${feed.url})`);
          
          // Fetch RSS feed
          const rssData = await this.fetchRSSFeed(feed.url);
          
          if (rssData && rssData.items && rssData.items.length > 0) {
            feedArticlesFetched = rssData.items.length;
            logger.info(`Fetched ${feedArticlesFetched} articles from ${feed.name}`);
            
            // Process each article
            for (const item of rssData.items) {
              const isNew = await this.processArticle(item, feed);
              if (isNew) {
                feedNewArticles++;
                totalNewArticles++;
              }
            }
            
            // Clear error if successful
            await threatly2DatabaseService.clearFeedError(feed._id);
            logger.info(`Successfully processed ${feed.name}: ${feedNewArticles} new articles`);
            
          } else {
            logger.warn(`No articles found in feed: ${feed.name}`);
            feedError = 'No articles found';
            await threatly2DatabaseService.updateFeedError(feed._id, feedError);
            totalErrors++;
          }
          
        } catch (error) {
          logger.error(`Error processing feed ${feed.name}:`, error.message);
          feedError = error.message;
          await threatly2DatabaseService.updateFeedError(feed._id, feedError);
          totalErrors++;
        }

        totalArticlesFetched += feedArticlesFetched;
        
        // Record feed result
        feedResults.push({
          feedId: feed._id,
          feedName: feed.name,
          feedUrl: feed.url,
          articlesFetched: feedArticlesFetched,
          newArticles: feedNewArticles,
          error: feedError,
          processingTime: Date.now() - feedStartTime
        });
      }

      const totalProcessingTime = Date.now() - startTime;
      
      logger.info(`RSS feed processing completed in ${totalProcessingTime}ms`);
      logger.info(`Total feeds processed: ${feeds.length}`);
      logger.info(`Total articles fetched: ${totalArticlesFetched}`);
      logger.info(`Total new articles: ${totalNewArticles}`);
      logger.info(`Total errors: ${totalErrors}`);

      return {
        success: true,
        totalFeeds: feeds.length,
        totalArticlesFetched,
        totalNewArticles,
        totalErrors,
        processingTime: totalProcessingTime,
        feedResults
      };

      } catch (error) {
      logger.error('Error in fetchAllFeeds:', error);
      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime,
        feedResults
      };
    }
  }

  /**
   * Fetch RSS feed from URL
   */
  async fetchRSSFeed(url) {
    try {
      const feed = await this.parser.parseURL(url);
      return feed;
    } catch (error) {
      logger.error(`Error fetching RSS feed from ${url}:`, error.message);
      throw error;
    }
  }

  /**
   * Process individual article
   */
  async processArticle(item, feed) {
    try {
      // Check if article already exists
      const existingArticle = await threatly2DatabaseService.getArticleByLink(item.link);
      
      if (existingArticle) {
        logger.debug(`Article already exists: ${item.title}`);
        return false; // Not new
      }

      // Create article object with correct structure
      const article = {
        title: item.title || 'No Title',
        content: item.content || item.contentSnippet || item.summary || 'No content available',
        link: item.link,
        isoDate: item.isoDate ? new Date(item.isoDate) : new Date(),
        source: feed.name,
        feedUrl: feed.url,
        type: feed.type || 'news', // Add type field from feed
        processedAt: new Date(),
        lastUpdated: new Date(),
        alertMatches: [],
        alertProcessedAt: new Date(),
        industries: ['Other'], // Default industry
        isSpam: false,
        read: false,
        saved: false
      };

      // Add optional fields if available
      if (item.creator) article.creator = item.creator;
      if (item.pubDate) article.pubDate = item.pubDate;
      if (item.mediaContent) article.mediaContent = item.mediaContent;
      if (item.mediaThumbnail) article.mediaThumbnail = item.mediaThumbnail;

      // Save article to Articles collection
      await threatly2DatabaseService.insertArticle(article);
      
      logger.debug(`Saved new article: ${article.title}`);
      
      // Process article for classification and alerts
      await this.processArticleClassification(article);
      
      return true; // New article
      
    } catch (error) {
      logger.error(`Error processing article ${item.title}:`, error.message);
      return false;
    }
  }

  /**
   * Process article for classification and alert matching
   */
  async processArticleClassification(article) {
    try {
      // Get keywords from Keywords collection
      const keywords = await threatly2DatabaseService.getKeywords();
      
      if (keywords.length === 0) {
        logger.warn('No keywords found for classification');
        return;
      }

      // Classify article using classification service
      const classificationResult = await classificationService.classifyArticle(
        article.title + ' ' + article.content,
        keywords
      );

      // Update article with classification results
      const update = {
        industries: classificationResult.industries || ['Other'],
        alertMatches: classificationResult.matchedKeywords || [],
        alertProcessedAt: new Date(),
        lastUpdated: new Date()
      };

      await threatly2DatabaseService.updateArticleByLink(article.link, update);
      
      logger.debug(`Classified article: ${article.title} - Industries: ${update.industries.join(', ')} - Alerts: ${update.alertMatches.length}`);
      
    } catch (error) {
      logger.error(`Error classifying article ${article.title}:`, error.message);
    }
  }

  /**
   * Fetch and process a single feed
   */
  async fetchSingleFeed(feedId) {
    try {
      logger.info(`Starting to fetch single feed: ${feedId}`);
      
      const feed = await threatly2DatabaseService.getFeedById(feedId);
      
      if (!feed) {
        logger.error(`Feed not found: ${feedId}`);
        throw new Error('Feed not found');
      }

      logger.info(`Found feed: ${feed.name} (${feed.url})`);

      const rssData = await this.fetchRSSFeed(feed.url);
      logger.info(`RSS data fetched: ${rssData?.items?.length || 0} items`);
      
      let newArticles = 0;

      if (rssData && rssData.items) {
        for (const item of rssData.items) {
          const isNew = await this.processArticle(item, feed);
          if (isNew) {
            newArticles++;
          }
        }
      }

      logger.info(`Processed articles: ${newArticles} new articles`);

      await threatly2DatabaseService.clearFeedError(feed._id);
      
      const result = {
        success: true,
        feedName: feed.name,
        articlesFetched: rssData?.items?.length || 0,
        newArticles,
        error: null
      };
      
      logger.info('Single feed fetch result:', result);
      return result;

    } catch (error) {
      logger.error(`Error fetching single feed ${feedId}:`, error.message);
      
      // Update feed error status
      await threatly2DatabaseService.updateFeedError(feedId, error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new Threatly2RSSService();
