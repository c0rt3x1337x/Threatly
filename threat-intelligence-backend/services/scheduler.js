const logger = require('../utils/logger');
const threatly2DatabaseService = require('./threatly2DatabaseService');
const classificationService = require('./classificationService');
const gptAlertService = require('../gpt-alert-service');

class Scheduler {
  constructor() {
    this.isRunning = false;
    this.jobs = [];
  }

  start() {
    this.isRunning = true;
    logger.info('Scheduler started');
  }

  stop() {
    this.isRunning = false;
    logger.info('Scheduler stopped');
  }

  async runNow() {
    if (!this.isRunning) {
      logger.info('Scheduler is not running, skipping workflow execution');
      return;
    }
    
    logger.info('Running RSS workflow...');
    
    try {
      // Get all active feeds from threatly2 database
      const feeds = await threatly2DatabaseService.getActiveFeeds();
      logger.info(`Found ${feeds.length} active feeds to process`);

      if (feeds.length === 0) {
        logger.warn('No active feeds found in database');
        return;
      }

      let totalNewArticles = 0;

      // Process each feed
      for (const feed of feeds) {
        try {
          logger.info(`Processing feed: ${feed.name} (${feed.url})`);
          
          // Fetch RSS feed
          const rssData = await this.fetchRSSFeed(feed.url);
          
          if (rssData && rssData.items && rssData.items.length > 0) {
            logger.info(`Fetched ${rssData.items.length} articles from ${feed.name}`);
            
            let feedNewArticles = 0;
            let latestArticleDate = null;
            
            // Process each article
            for (const item of rssData.items) {
              const isNew = await this.processArticle(item, feed);
              if (isNew) {
                totalNewArticles++;
                feedNewArticles++;
              }
              
              // Track the latest article date for this feed (regardless of whether it's new)
              const articleDate = item.isoDate ? new Date(item.isoDate) : new Date();
              if (!latestArticleDate || articleDate > latestArticleDate) {
                latestArticleDate = articleDate;
              }
            }
            
            // Always update feed's lastFetch with the latest article date found
            // This ensures lastFetch is current even if no new articles were processed
            if (latestArticleDate) {
              await threatly2DatabaseService.updateFeedLastFetch(feed._id, latestArticleDate.toISOString());
              logger.info(`Updated feed ${feed.name} lastFetch to: ${latestArticleDate}`);
            }
            
            // Clear error if successful
            await threatly2DatabaseService.clearFeedError(feed._id);
            logger.info(`Successfully processed ${feed.name}: ${feedNewArticles} new articles`);
            
          } else {
            logger.warn(`No articles found in feed: ${feed.name}`);
            
            // Even if no new articles found, try to update lastFetch from existing articles
            try {
              const existingArticles = await threatly2DatabaseService.getArticlesBySource(feed.name);
              if (existingArticles.length > 0) {
                // Find the newest existing article date
                const newestExistingArticle = existingArticles.reduce((newest, article) => {
                  const articleDate = new Date(article.isoDate);
                  return (!newest || articleDate > newest) ? articleDate : newest;
                }, null);
                
                if (newestExistingArticle) {
                  await threatly2DatabaseService.updateFeedLastFetch(feed._id, newestExistingArticle.toISOString());
                  logger.info(`Updated feed ${feed.name} lastFetch to existing article date: ${newestExistingArticle}`);
                }
              }
            } catch (error) {
              logger.warn(`Could not update lastFetch for feed ${feed.name} from existing articles:`, error.message);
            }
            
            await threatly2DatabaseService.updateFeedError(feed._id, 'No articles found');
          }
          
        } catch (error) {
          logger.error(`Error processing feed ${feed.name}:`, error.message);
          await threatly2DatabaseService.updateFeedError(feed._id, error.message);
        }
      }

      logger.info(`RSS workflow completed. Total new articles: ${totalNewArticles}`);
      
      // After ingestion, run GPT alert processing in batches using active prompt and keywords
      if (totalNewArticles > 0) {
        try {
          logger.info('Starting GPT alert processing for newly ingested/unprocessed articles...');
          const result = await gptAlertService.processArticlesInBatches();
          logger.info(`GPT alert processing completed. Batches: ${result.batches}, Articles updated: ${result.processed}`);
        } catch (alertError) {
          logger.error('GPT alert processing failed:', alertError);
        }
      } else {
        logger.info('No new articles to process with GPT');
      }
      
    } catch (error) {
      logger.error('Error in RSS workflow:', error);
    }
  }

  async fetchRSSFeed(feedUrl) {
    const Parser = require('rss-parser');
    const parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    try {
      logger.info(`Fetching RSS feed: ${feedUrl}`);
      const feed = await parser.parseURL(feedUrl);
      logger.info(`Successfully fetched RSS feed: ${feedUrl}`);
      return feed;
    } catch (error) {
      logger.error(`Error fetching RSS feed ${feedUrl}:`, error);
      throw error;
    }
  }

  async processArticle(item, feed) {
    try {
      // Check if article already exists
      const existingArticle = await threatly2DatabaseService.getArticleByLink(item.link);
      
      if (existingArticle) {
        logger.debug(`Article already exists: ${item.title}`);
        return false;
      }

      // Parse article date
      const articleDate = item.isoDate ? new Date(item.isoDate) : new Date();
      
      // Remove the problematic lastFetch comparison that prevents articles from being processed
      // The lastFetch should be updated based on processed articles, not used to filter them
      // This was causing the chicken-and-egg problem where lastFetch never got updated

      // Create new article with complete structure
      const article = {
        title: item.title || 'No Title',
        content: item.contentSnippet || item.content || item.summary || 'No Content',
        link: item.link || item.guid || '',
        isoDate: articleDate,
        source: feed.name,
        feedUrl: feed.url,
        type: feed.type || 'news', // Default to 'news' if type not specified
        author: item.creator || item.author || '',
        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
        guid: item.guid || item.link || '',
        // Initialize fields that will be populated by GPT processing
        alertMatches: [],
        industries: [],
        isSpam: false,
        threatLevel: 'NONE',
        threatType: 'N/A',
        read: false,
        saved: false,
        processedAt: new Date(),
        lastUpdated: new Date(),
        creator: item.creator || item.author || ''
      };

      // Basic validation
      if (!article.link || !article.title) {
        logger.warn(`Skipping invalid article from ${feed.name}: missing link or title`);
        return false;
      }

      // Insert article into database
      const result = await threatly2DatabaseService.insertArticle(article);
      
      if (result.insertedId) {
        logger.info(`Inserted new article: ${article.title} (Date: ${articleDate})`);
        return true;
      } else {
        logger.warn(`Failed to insert article: ${article.title}`);
        return false;
      }

    } catch (error) {
      logger.error(`Error processing article from ${feed.name}:`, error);
      return false;
    }
  }

  addJob(job) {
    this.jobs.push(job);
  }

  removeJob(jobId) {
    this.jobs = this.jobs.filter(job => job.id !== jobId);
  }
}

module.exports = new Scheduler();
