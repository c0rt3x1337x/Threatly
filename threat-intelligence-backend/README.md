# Threat Intelligence Backend

A Node.js backend for collecting and classifying threat intelligence articles from RSS feeds using MongoDB and OpenAI.

## Features

- **RSS Feed Processing**: Automatically fetches and parses articles from configured RSS feeds
- **Article Deduplication**: Prevents duplicate articles using MongoDB
- **AI Classification**: Uses OpenAI GPT-4 to classify articles by sector, severity, and spam detection
- **Custom Alert Categories**: Dynamic alert system for threat categorization
- **Scheduled Processing**: Runs every 4 hours automatically
- **RESTful API**: Clean JSON endpoints for frontend integration
- **Error Tracking**: Comprehensive logging and error handling
- **Feed Management**: Add, update, and manage RSS feeds through API

## Prerequisites

- Node.js 16+ 
- MongoDB Atlas account
- OpenAI API key

## Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   The `.env` file is already configured with your credentials:
   - MongoDB URI
   - OpenAI API key
   - RSS feed URLs
   - Server configuration

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

   For development with auto-restart:
   ```bash
   npm run dev
   ```

## API Endpoints

### Articles

- `GET /api/articles` - Get articles with pagination and filtering
- `GET /api/articles/stats` - Get article statistics
- `GET /api/articles/:id` - Get specific article
- `GET /api/articles/search/:query` - Search articles by text
- `GET /api/articles/sectors` - Get all available sectors
- `GET /api/articles/sources` - Get all available sources
- `DELETE /api/articles/:id` - Delete article

### Feeds

- `GET /api/feeds` - Get all feeds with statistics
- `POST /api/feeds` - Add new RSS feed
- `PUT /api/feeds/:id` - Update feed
- `DELETE /api/feeds/:id` - Delete feed

### Scheduler

- `GET /api/feeds/scheduler/status` - Get scheduler status
- `POST /api/feeds/scheduler/run` - Run workflow immediately
- `PUT /api/feeds/scheduler/schedule` - Update scheduler schedule

### Alerts

- `GET /api/feeds/alerts` - Get all alerts
- `POST /api/feeds/alerts` - Add new alert
- `PUT /api/feeds/alerts/:id` - Update alert
- `DELETE /api/feeds/alerts/:id` - Delete alert

## Query Parameters

### Articles Endpoint
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `sector` - Filter by sector
- `severity` - Filter by severity (critical, high, medium, low)
- `source` - Filter by source
- `search` - Text search
- `startDate` - Filter by start date (ISO string)
- `endDate` - Filter by end date (ISO string)
- `sortBy` - Sort field (default: isoDate)
- `sortOrder` - Sort order (asc/desc, default: desc)

## React Integration

### Basic Setup

1. **Install axios in your React app:**
   ```bash
   npm install axios
   ```

2. **Create API service:**
   ```javascript
   // src/services/api.js
   import axios from 'axios';

   const API_BASE_URL = 'http://localhost:3001/api';

   const api = axios.create({
     baseURL: API_BASE_URL,
     headers: {
       'Content-Type': 'application/json',
     },
   });

   export const articlesAPI = {
     getArticles: (params) => api.get('/articles', { params }),
     getStats: () => api.get('/articles/stats'),
     getArticle: (id) => api.get(`/articles/${id}`),
     searchArticles: (query, params) => api.get(`/articles/search/${query}`, { params }),
     getSectors: () => api.get('/articles/sectors'),
     getSources: () => api.get('/articles/sources'),
   };

   export const feedsAPI = {
     getFeeds: () => api.get('/feeds'),
     addFeed: (feedData) => api.post('/feeds', feedData),
     updateFeed: (id, feedData) => api.put(`/feeds/${id}`, feedData),
     deleteFeed: (id) => api.delete(`/feeds/${id}`),
     getSchedulerStatus: () => api.get('/feeds/scheduler/status'),
     runWorkflow: () => api.post('/feeds/scheduler/run'),
     updateSchedule: (schedule) => api.put('/feeds/scheduler/schedule', { schedule }),
   };

   export const alertsAPI = {
     getAlerts: () => api.get('/feeds/alerts'),
     addAlert: (alertData) => api.post('/feeds/alerts', alertData),
     updateAlert: (id, alertData) => api.put(`/feeds/alerts/${id}`, alertData),
     deleteAlert: (id) => api.delete(`/feeds/alerts/${id}`),
   };

   export default api;
   ```

3. **Example React component:**
   ```javascript
   // src/components/ArticlesList.js
   import React, { useState, useEffect } from 'react';
   import { articlesAPI } from '../services/api';

   const ArticlesList = () => {
     const [articles, setArticles] = useState([]);
     const [loading, setLoading] = useState(true);
     const [pagination, setPagination] = useState({});
     const [filters, setFilters] = useState({
       page: 1,
       limit: 20,
       sector: '',
       severity: '',
       source: '',
     });

     useEffect(() => {
       fetchArticles();
     }, [filters]);

     const fetchArticles = async () => {
       try {
         setLoading(true);
         const response = await articlesAPI.getArticles(filters);
         setArticles(response.data.data);
         setPagination(response.data.pagination);
       } catch (error) {
         console.error('Error fetching articles:', error);
       } finally {
         setLoading(false);
       }
     };

     const handleFilterChange = (key, value) => {
       setFilters(prev => ({
         ...prev,
         [key]: value,
         page: 1, // Reset to first page when filters change
       }));
     };

     if (loading) return <div>Loading...</div>;

     return (
       <div>
         <h2>Threat Intelligence Articles</h2>
         
         {/* Filters */}
         <div className="filters">
           <select
             value={filters.sector}
             onChange={(e) => handleFilterChange('sector', e.target.value)}
           >
             <option value="">All Sectors</option>
             <option value="Finance">Finance</option>
             <option value="Automotive">Automotive</option>
             <option value="Industrial Control Systems">Industrial Control Systems</option>
             {/* Add more sectors */}
           </select>
           
           <select
             value={filters.severity}
             onChange={(e) => handleFilterChange('severity', e.target.value)}
           >
             <option value="">All Severities</option>
             <option value="critical">Critical</option>
             <option value="high">High</option>
             <option value="medium">Medium</option>
             <option value="low">Low</option>
           </select>
         </div>

         {/* Articles List */}
         <div className="articles-list">
           {articles.map(article => (
             <div key={article._id} className="article-card">
               <h3>{article.title}</h3>
               <p>{article.content.substring(0, 200)}...</p>
               <div className="article-meta">
                 <span className={`severity ${article.severity}`}>
                   {article.severity}
                 </span>
                 <span className="sector">{article.sector}</span>
                 <span className="source">{article.source}</span>
                 <span className="date">
                   {new Date(article.isoDate).toLocaleDateString()}
                 </span>
               </div>
               <a href={article.link} target="_blank" rel="noopener noreferrer">
                 Read More
               </a>
             </div>
           ))}
         </div>

         {/* Pagination */}
         {pagination.pages > 1 && (
           <div className="pagination">
             <button
               disabled={pagination.page === 1}
               onClick={() => handleFilterChange('page', pagination.page - 1)}
             >
               Previous
             </button>
             <span>
               Page {pagination.page} of {pagination.pages}
             </span>
             <button
               disabled={pagination.page === pagination.pages}
               onClick={() => handleFilterChange('page', pagination.page + 1)}
             >
               Next
             </button>
           </div>
         )}
       </div>
     );
   };

   export default ArticlesList;
   ```

## Database Schema

### Article
```javascript
{
  title: String,
  content: String,
  link: String (unique),
  isoDate: Date,
  source: String,
  feedUrl: String,
  sector: String,
  severity: String,
  spam: Number (0 or 1),
  alerts: Map,
  processedAt: Date,
  lastUpdated: Date
}
```

### Feed
```javascript
{
  url: String (unique),
  name: String,
  description: String,
  isoDate: Date,
  lastError: {
    code: String,
    message: String,
    timestamp: Date
  },
  isActive: Boolean,
  lastFetchAttempt: Date,
  fetchCount: Number,
  errorCount: Number
}
```

### Alert
```javascript
{
  name: String (unique),
  description: String,
  isActive: Boolean,
  keywords: [String],
  severity: String,
  sectors: [String]
}
```

## Configuration

### Environment Variables

- `MONGODB_URI` - MongoDB connection string
- `OPENAI_API_KEY` - OpenAI API key
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `RSS_FEEDS` - Comma-separated RSS feed URLs
- `OPENAI_MODEL` - OpenAI model (default: gpt-4)
- `OPENAI_MAX_TOKENS` - Max tokens for OpenAI (default: 1000)
- `OPENAI_TEMPERATURE` - OpenAI temperature (default: 0.1)
- `BATCH_SIZE` - Articles per batch (default: 5)
- `BATCH_DELAY_MS` - Delay between batches (default: 2000)
- `CRON_SCHEDULE` - Cron schedule (default: "0 */4 * * *")

## Workflow

1. **RSS Fetching**: System fetches articles from configured RSS feeds
2. **Deduplication**: Checks for existing articles to prevent duplicates
3. **Database Storage**: Saves new articles to MongoDB
4. **AI Classification**: Uses OpenAI to classify articles by sector, severity, and spam
5. **Alert Matching**: Applies custom alert categories
6. **Update Tracking**: Updates feed's latest processed date

## Monitoring

- Logs are stored in `logs/` directory
- Error tracking for RSS feeds
- Scheduler status monitoring
- Article processing statistics

## Security

- CORS enabled for frontend integration
- Helmet.js for security headers
- Input validation on all endpoints
- Error handling without exposing sensitive information

## Troubleshooting

1. **MongoDB Connection Issues**: Check your MongoDB URI and network connectivity
2. **OpenAI API Errors**: Verify your API key and check rate limits
3. **RSS Feed Errors**: Check feed URLs and network connectivity
4. **Scheduler Issues**: Verify cron schedule format and timezone settings

## License

MIT License
