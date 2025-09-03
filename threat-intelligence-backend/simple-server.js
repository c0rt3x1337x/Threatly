const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Test endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/articles', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        _id: '1',
        title: 'Test Article 1',
        content: 'This is a test article',
        source: 'Test Source',
        isoDate: new Date().toISOString()
      },
      {
        _id: '2',
        title: 'Test Article 2',
        content: 'This is another test article',
        source: 'Test Source 2',
        isoDate: new Date().toISOString()
      }
    ],
    pagination: {
      page: 1,
      limit: 50,
      total: 2,
      pages: 1
    }
  });
});

app.get('/api/sources', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        _id: '1',
        name: 'Test Source 1',
        url: 'https://example1.com/feed',
        isActive: true
      },
      {
        _id: '2',
        name: 'Test Source 2',
        url: 'https://example2.com/feed',
        isActive: true
      }
    ]
  });
});

app.get('/api/keywords', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        _id: '1',
        name: 'test_keyword',
        displayName: 'Test Keyword',
        description: 'A test keyword'
      }
    ]
  });
});

// Statistics endpoints for Dashboard and Statistics tabs
app.get('/api/statistics/workflow', (req, res) => {
  res.json({
    success: true,
    data: {
      workflow: {
        lastRun: new Date().toISOString(),
        rssFetchSuccess: 45,
        rssFetchFailed: 3,
        articlesProcessed: 150,
        newArticles: 25,
        articlesWithAlerts: 8,
        processingTime: '2m 30s',
        tokensUsed: '15,420',
        successRate: '93.8%'
      },
      overview: {
        totalArticles: 1250,
        articlesWithAlerts: 45,
        recentArticles: 150,
        readArticles: 890,
        unreadArticles: 360,
        savedArticles: 67,
        spamArticles: 23
      }
    }
  });
});

app.get('/api/statistics/detailed', (req, res) => {
  res.json({
    success: true,
    data: {
      feeds: [
        {
          name: 'SecurityWeek',
          url: 'https://www.securityweek.com/feed/',
          isActive: true,
          totalArticles: 45,
          recentArticles: 12,
          lastFetch: new Date().toISOString(),
          status: 'active'
        },
        {
          name: 'The Hacker News',
          url: 'https://feeds.feedburner.com/TheHackersNews',
          isActive: true,
          totalArticles: 67,
          recentArticles: 18,
          lastFetch: new Date().toISOString(),
          status: 'active'
        }
      ]
    }
  });
});

app.get('/api/prompts', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        name: 'Default Alert Classification',
        description: 'Default prompt for classifying security alerts',
        content: 'Analyze the following security article and determine if it contains any security alerts...',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  });
});

app.get('/api/statistics/workflow-runs', (req, res) => {
  res.json({
    success: true,
    data: {
      runs: [
        {
          id: '1',
          startTime: new Date(Date.now() - 3600000).toISOString(),
          endTime: new Date().toISOString(),
          status: 'completed',
          duration: 150,
          successRate: 93.8,
          feedsProcessed: {
            total: 48,
            successful: 45,
            failed: 3
          },
          articlesProcessed: {
            total: 150,
            new: 25,
            withAlerts: 8
          },
          performance: {
            totalProcessingTime: 150000,
            tokensUsed: 15420,
            averageProcessingTimePerArticle: 1000
          }
        }
      ],
      pagination: {
        total: 1,
        page: 1,
        limit: 10,
        pages: 1
      }
    }
  });
});

app.get('/api/statistics/openai-billing', (req, res) => {
  res.json({
    success: true,
    data: {
      currentPeriod: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
        totalUsage: 15420,
        totalCost: 0.15,
        currency: 'USD'
      },
      subscription: {
        plan: 'pay-as-you-go',
        status: 'active',
        softLimit: 100000,
        hardLimit: 1000000
      },
      monthlyUsage: {
        totalCost: 0.15,
        dailyBreakdown: [
          {
            date: new Date().toISOString().split('T')[0],
            cost: 0.05,
            tokens: 5000
          }
        ]
      },
      modelUsage: {
        totalTokens: 15420,
        estimatedCost: 0.15,
        lastUpdated: new Date().toISOString()
      }
    }
  });
});

// Dashboard statistics endpoints
app.get('/api/statistics/dashboard', (req, res) => {
  res.json({
    success: true,
    data: {
      articleTypes: [
        { type: 'News', count: 890 },
        { type: 'Forum', count: 360 }
      ],
      dailyArticles: [
        { date: '2025-08-10', count: 12 },
        { date: '2025-08-11', count: 15 },
        { date: '2025-08-12', count: 8 },
        { date: '2025-08-13', count: 20 },
        { date: '2025-08-14', count: 18 },
        { date: '2025-08-15', count: 25 }
      ],
      topSources: [
        { name: 'SecurityWeek', count: 45 },
        { name: 'The Hacker News', count: 67 },
        { name: 'Dark Reading', count: 34 },
        { name: 'ThreatPost', count: 28 }
      ]
    }
  });
});

console.log('Starting simple server...');
app.listen(PORT, () => {
  console.log(`Simple server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Articles: http://localhost:${PORT}/api/articles`);
  console.log(`Statistics: http://localhost:${PORT}/api/statistics/workflow`);
});
