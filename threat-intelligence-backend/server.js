require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const logger = require('./utils/logger');
const { seedAdmin } = require('./utils/seedAdmin');
const articleRoutes = require('./routes/articles');
const feedRoutes = require('./routes/feeds');
const keywordRoutes = require('./routes/keywords');
const sourceRoutes = require('./routes/sources');
const statisticsRoutes = require('./routes/statistics');
const promptsRoutes = require('./routes/prompts');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const scheduler = require('./services/scheduler');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip, userAgent: req.get('User-Agent') });
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/feeds', feedRoutes);
app.use('/api/keywords', keywordRoutes);
app.use('/api/sources', sourceRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/prompts', promptsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Connect to MongoDB and start server
async function startServer() {
  try {
    // Connect to threatly2 database
    const mongoUri = process.env.MONGODB_URI.replace('/threatly?', '/threatly2?');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('Connected to MongoDB');

    // Seed admin user
    await seedAdmin();

    // Start the scheduler
    scheduler.start();
    logger.info('Scheduler started');

    // Run initial RSS workflow on startup
    logger.info('Running initial RSS workflow on startup...');
    scheduler.runNow().catch(error => {
      logger.error('Error in initial workflow execution:', error);
    });

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  scheduler.stop();
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  scheduler.stop();
  await mongoose.connection.close();
  process.exit(0);
});

startServer();