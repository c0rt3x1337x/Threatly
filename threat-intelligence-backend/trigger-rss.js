require('dotenv').config();
const mongoose = require('mongoose');
const scheduler = require('./services/scheduler');
const logger = require('./utils/logger');

async function triggerRSSWorkflow() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('Connected to MongoDB');

    // Start the scheduler (this will also trigger the initial workflow)
    scheduler.start();
    
    // Manually trigger the workflow
    logger.info('Manually triggering RSS workflow...');
    await scheduler.runNow();
    
    logger.info('RSS workflow completed successfully');

    // Wait a moment for any async operations to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check how many articles we have now
    const Article = require('./models/Article');
    const articleCount = await Article.countDocuments();
    logger.info(`Total articles in database: ${articleCount}`);

    await mongoose.connection.close();
    logger.info('Database connection closed');

  } catch (error) {
    logger.error('Error triggering RSS workflow:', error);
    process.exit(1);
  }
}

triggerRSSWorkflow();
