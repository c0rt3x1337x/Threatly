const { MongoClient, ObjectId } = require('mongodb');
const logger = require('../utils/logger');

class Threatly2DatabaseService {
  constructor() {
    this.client = null;
    this.db = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected && this.db) {
      return this.db;
    }

    try {
      this.client = new MongoClient(process.env.MONGODB_URI);
      await this.client.connect();
      this.db = this.client.db('threatly2');
      this.isConnected = true;
      logger.info('Connected to threatly2 database');
      return this.db;
    } catch (error) {
      logger.error('Error connecting to threatly2 database:', error);
      throw error;
    }
  }

  // Helper function to convert string ID to ObjectId
  toObjectId(id) {
    try {
      return new ObjectId(id);
    } catch (error) {
      logger.error('Invalid ObjectId:', id);
      throw new Error('Invalid ID format');
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.isConnected = false;
      logger.info('Disconnected from threatly2 database');
    }
  }

  // Get the MongoDB client for cross-database operations
  getClient() {
    return this.client;
  }

  // Articles collection methods
  async getArticles(filter = {}, sort = { isoDate: -1 }, limit = 100, skip = 0) {
    const db = await this.connect();
    return await db.collection('Articles').find(filter).sort(sort).limit(limit).skip(skip).toArray();
  }

  async getArticleById(id) {
    const db = await this.connect();
    return await db.collection('Articles').findOne({ _id: this.toObjectId(id) });
  }

  async getArticleByLink(link) {
    const db = await this.connect();
    return await db.collection('Articles').findOne({ link });
  }

  async insertArticle(article) {
    const db = await this.connect();
    const result = await db.collection('Articles').insertOne(article);
    return result;
  }

  async updateArticle(id, update) {
    const db = await this.connect();
    logger.info(`Updating article ${id} with:`, update);
    const result = await db.collection('Articles').updateOne({ _id: this.toObjectId(id) }, { $set: update });
    logger.info(`Article update result:`, result);
    return result;
  }

  async updateArticleByLink(link, update) {
    const db = await this.connect();
    return await db.collection('Articles').updateOne({ link }, { $set: update });
  }

  async deleteArticle(id) {
    const db = await this.connect();
    logger.info(`Deleting article ${id}`);
    const result = await db.collection('Articles').deleteOne({ _id: this.toObjectId(id) });
    logger.info(`Article delete result:`, result);
    return result;
  }

  async deleteAllArticles() {
    const db = await this.connect();
    logger.info('Deleting all articles');
    const result = await db.collection('Articles').deleteMany({});
    logger.info(`Delete all articles result:`, result);
    return result;
  }

  async deleteAllSpamArticles() {
    const db = await this.connect();
    logger.info('Deleting all spam articles');
    const result = await db.collection('Articles').deleteMany({ isSpam: true });
    logger.info(`Delete all spam articles result:`, result);
    return result;
  }

  async getArticlesCount(filter = {}) {
    const db = await this.connect();
    return await db.collection('Articles').countDocuments(filter);
  }

  // Keywords collection methods
  async getKeywords(filter = {}, sort = { createdAt: -1 }) {
    const db = await this.connect();
    return await db.collection('Keywords').find(filter).sort(sort).toArray();
  }

  async getKeywordById(id) {
    const db = await this.connect();
    return await db.collection('Keywords').findOne({ _id: this.toObjectId(id) });
  }

  async getKeywordByName(name) {
    const db = await this.connect();
    return await db.collection('Keywords').findOne({ name: name.toLowerCase() });
  }

  async insertKeyword(keyword) {
    const db = await this.connect();
    const result = await db.collection('Keywords').insertOne(keyword);
    return result;
  }

  async updateKeyword(id, update) {
    const db = await this.connect();
    return await db.collection('Keywords').updateOne({ _id: id }, { $set: update });
  }

  async deleteKeyword(id) {
    const db = await this.connect();
    logger.info(`Deleting keyword ${id}`);
    const result = await db.collection('Keywords').deleteOne({ _id: this.toObjectId(id) });
    logger.info(`Keyword delete result:`, result);
    return result;
  }

  async getKeywordsCount(filter = {}) {
    const db = await this.connect();
    return await db.collection('Keywords').countDocuments(filter);
  }

  // Feeds collection methods
  async getFeeds(filter = {}, sort = { createdAt: -1 }) {
    const db = await this.connect();
    return await db.collection('Feeds').find(filter).sort(sort).toArray();
  }

  async getActiveFeeds() {
    const db = await this.connect();
    return await db.collection('Feeds').find({ isActive: true }).toArray();
  }

  async getFeedById(id) {
    const db = await this.connect();
    return await db.collection('Feeds').findOne({ _id: this.toObjectId(id) });
  }

  async insertFeed(feed) {
    const db = await this.connect();
    logger.info('Inserting new feed:', feed);
    const result = await db.collection('Feeds').insertOne(feed);
    logger.info('Feed insert result:', result);
    return result;
  }

  async updateFeed(id, update) {
    const db = await this.connect();
    logger.info(`Updating feed ${id} with:`, update);
    const result = await db.collection('Feeds').updateOne({ _id: this.toObjectId(id) }, { $set: update });
    logger.info(`Feed update result:`, result);
    return result;
  }

  async deleteFeed(id) {
    const db = await this.connect();
    logger.info(`Deleting feed ${id}`);
    const result = await db.collection('Feeds').deleteOne({ _id: this.toObjectId(id) });
    logger.info(`Feed delete result:`, result);
    return result;
  }

  async updateFeedError(id, error) {
    const db = await this.connect();
    const update = {
      error: error,
      lastError: error ? new Date() : null,
      lastFetch: new Date()
    };
    
    if (error) {
      update.errorCount = { $inc: 1 };
    }
    
    return await db.collection('Feeds').updateOne(
      { _id: this.toObjectId(id) },
      { $set: update, $inc: { fetchCount: 1 } }
    );
  }

  async clearFeedError(id) {
    const db = await this.connect();
    return await db.collection('Feeds').updateOne(
      { _id: this.toObjectId(id) },
      { 
        $set: { 
          error: null
        },
        $inc: { fetchCount: 1 }
      }
    );
  }

  async updateFeedIsoTime(id, isoDate) {
    const db = await this.connect();
    logger.info(`Updating feed ${id} ISO time to: ${isoDate}`);
    const result = await db.collection('Feeds').updateOne(
      { _id: this.toObjectId(id) },
      { $set: { isodate: isoDate, updatedAt: new Date() } }
    );
    logger.info(`Feed ISO time update result:`, result);
    return result;
  }

  async updateFeedLastFetch(id, lastFetch) {
    const db = await this.connect();
    logger.info(`Updating feed ${id} lastFetch to: ${lastFetch}`);
    const result = await db.collection('Feeds').updateOne(
      { _id: this.toObjectId(id) },
      { $set: { lastFetch: lastFetch, updatedAt: new Date() } }
    );
    logger.info(`Feed lastFetch update result:`, result);
    return result;
  }

  // Workflow runs collection methods
  async insertWorkflowRun(workflowRun) {
    const db = await this.connect();
    const result = await db.collection('WorkflowRuns').insertOne(workflowRun);
    return result;
  }

  async getWorkflowRuns(filter = {}, sort = { createdAt: -1 }, limit = 50, skip = 0) {
    const db = await this.connect();
    return await db.collection('WorkflowRuns').find(filter).sort(sort).limit(limit).skip(skip).toArray();
  }

  async getWorkflowRunsCount(filter = {}) {
    const db = await this.connect();
    return await db.collection('WorkflowRuns').countDocuments(filter);
  }

  async getWorkflowRunById(id) {
    const db = await this.connect();
    return await db.collection('WorkflowRuns').findOne({ _id: id });
  }

  // Statistics methods
  async getArticlesStatistics() {
    const db = await this.connect();
    const pipeline = [
      {
        $group: {
          _id: null,
          totalArticles: { $sum: 1 },
          totalRead: { $sum: { $cond: ['$read', 1, 0] } },
          totalSaved: { $sum: { $cond: ['$saved', 1, 0] } },
          totalSpam: { $sum: { $cond: ['$isSpam', 1, 0] } },
          totalWithAlerts: { $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$alertMatches', []] } }, 0] }, 1, 0] } }
        }
      }
    ];
    
    const result = await db.collection('Articles').aggregate(pipeline).toArray();
    return result[0] || {
      totalArticles: 0,
      totalRead: 0,
      totalSaved: 0,
      totalSpam: 0,
      totalWithAlerts: 0
    };
  }

  async getFeedsStatistics() {
    const db = await this.connect();
    const pipeline = [
      {
        $group: {
          _id: null,
          totalFeeds: { $sum: 1 },
          activeFeeds: { $sum: { $cond: ['$isActive', 1, 0] } },
          feedsWithErrors: { $sum: { $cond: [{ $ne: ['$error', null] }, 1, 0] } }
        }
      }
    ];
    
    const result = await db.collection('Feeds').aggregate(pipeline).toArray();
    return result[0] || {
      totalFeeds: 0,
      activeFeeds: 0,
      feedsWithErrors: 0
    };
  }

  // User management methods
  async getUsers(page = 1, limit = 50) {
    try {
      const skip = (page - 1) * limit;
      const users = await db.collection('users')
        .find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .project({
          _id: 1,
          email: 1,
          role: 1,
          status: 1,
          plan: 1,
          createdAt: 1,
          updatedAt: 1
        })
        .toArray();

      const total = await db.collection('users').countDocuments({});
      return { users, total };
    } catch (error) {
      logger.error('Error getting users:', error);
      throw error;
    }
  }
}

module.exports = new Threatly2DatabaseService();
