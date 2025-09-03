require('dotenv').config();
const logger = require('./utils/logger');
const threatly2RSSService = require('./threatly2-rss-service');
const threatly2DatabaseService = require('./services/threatly2DatabaseService');

async function runWorkflow() {
  const startTime = Date.now();
  logger.info('Starting threat intelligence workflow...');

  try {
    // Run RSS feed processing
    const rssResult = await threatly2RSSService.fetchAllFeeds();
    
    if (!rssResult.success) {
      logger.error('RSS feed processing failed:', rssResult.error);
      return;
    }

    // Create workflow run record
    const workflowRun = {
      startTime: new Date(startTime),
      endTime: new Date(),
      duration: Date.now() - startTime,
      totalFeeds: rssResult.totalFeeds,
      totalArticlesFetched: rssResult.totalArticlesFetched,
      totalNewArticles: rssResult.totalNewArticles,
      totalErrors: rssResult.totalErrors,
      feedResults: rssResult.feedResults,
      status: rssResult.totalErrors === 0 ? 'success' : 'partial_success',
      createdAt: new Date()
    };

    await threatly2DatabaseService.insertWorkflowRun(workflowRun);

    logger.info(`Workflow completed in ${workflowRun.duration}ms`);
    logger.info(`Processed ${rssResult.totalFeeds} feeds`);
    logger.info(`Fetched ${rssResult.totalArticlesFetched} articles`);
    logger.info(`Added ${rssResult.totalNewArticles} new articles`);
    logger.info(`Encountered ${rssResult.totalErrors} errors`);

    } catch (error) {
    logger.error('Error in workflow execution:', error);
    
    // Create failed workflow run record
    const workflowRun = {
      startTime: new Date(startTime),
      endTime: new Date(),
      duration: Date.now() - startTime,
      status: 'failed',
      error: error.message,
      createdAt: new Date()
    };

    try {
      await threatly2DatabaseService.insertWorkflowRun(workflowRun);
    } catch (dbError) {
      logger.error('Error saving failed workflow run:', dbError);
    }
  }
}

// Run workflow if this file is executed directly
if (require.main === module) {
  runWorkflow()
    .then(() => {
      logger.info('Workflow execution completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Workflow execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runWorkflow };
