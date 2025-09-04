# Threatly - Threat Intelligence Platform
<img width="1916" height="1045" alt="image" src="https://github.com/user-attachments/assets/e75a6b52-572b-4c01-969d-f99f3a1437fc" />


<img width="1915" height="1022" alt="image" src="https://github.com/user-attachments/assets/b6403545-0718-433f-9cbe-9b2b1c4148ac" />

## Smart Alerting, Driven by LLMs

<img width="1919" height="1065" alt="image" src="https://github.com/user-attachments/assets/75f1619a-56c7-4bbd-a6ee-3c63cf9e9c69" />

## Create Custom Keywords to Power Alerts

<img width="1919" height="841" alt="image" src="https://github.com/user-attachments/assets/258b6859-766f-4d40-b095-0a37122c3797" />

## User Management

<img width="1919" height="1046" alt="image" src="https://github.com/user-attachments/assets/d2c58fd9-1f53-4e7d-99b9-4a30733a3896" />

## Manage Your Threat Intelligence Sources

<img width="1919" height="1046" alt="image" src="https://github.com/user-attachments/assets/70b00ec9-cfa6-4ee2-8ae3-5f3e913c1125" />

A modern React-based threat intelligence platform that aggregates and analyzes security articles with advanced filtering, search, and alerting.

## Features

- 🔍 **Advanced Search**: Search across article titles, content, and authors
- 🏷️ **Smart Filtering**: Filter by sector, severity, and company-specific flags
- 📊 **Real-time Data**: Connected to MongoDB Atlas for live threat intelligence
- 🎨 **Modern UI**: Beautiful, responsive design with Tailwind CSS
- ⚡ **Fast Performance**: Optimized React components with TypeScript

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Fetch API** for backend communication

### Backend
- **Node.js** with Express
- **MongoDB** Atlas for data storage
- **CORS** enabled for cross-origin requests
- **Helmet** for security headers
- **Rate limiting** for API protection

## Project Structure

```
threatly/
├── src/                    # Frontend React app
│   ├── components/        # React components
│   ├── pages/            # Page components
│   ├── services/         # API services
│   └── types/            # TypeScript interfaces
├── threat-intelligence-backend/  # Node.js API server
│   ├── config/          # Database configuration
│   ├── routes/          # API routes
│   └── server.js        # Express server
└── README.md
```

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- MongoDB Atlas account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd threatly
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd threat-intelligence-backend
   npm install
   ```

### Running the Application

#### Start the Backend Server
```bash
cd threat-intelligence-backend
npm start
```
The API server will start on `http://localhost:5000`

#### Start the Frontend Development Server
```bash
# In a new terminal, from the project root
npm start
```
The React app will start on `http://localhost:3000`

## API Endpoints

### Articles
- `GET /api/articles` - Get all articles
- `GET /api/articles/:id` - Get article by ID
- `GET /api/articles/search/:query` - Search articles
- `GET /api/articles/sector/:sector` - Get articles by sector
- `GET /api/articles/severity/:severity` - Get articles by severity
- `POST /api/articles/filter` - Get filtered articles
- `GET /api/articles/stats/summary` - Get article statistics

### Health Check
- `GET /api/health` - API health status

## MongoDB Schema

Articles are stored with the following structure:
```javascript
{
  _id: "ObjectId",
  title: "string",
  author: "string", 
  link: "string",
  pubDate: "string",
  content: "string",
  guid: "string",
  isoDate: "string",
  adyen_related: 0|1,
  automotive_security: 0|1,
  samsung_sdi_related: 0|1,
  sector: "string",
  severity: "high|medium|low",
  source: "string", // Extracted from URL for performance
  type: "string"    // 'news' or 'forum'
}
```

## Performance Optimizations

### Source Field Optimization
The application has been optimized to store source names directly in the database instead of extracting them from URLs on every request. This significantly improves website performance.

**Migration Script:**
```bash
cd threat-intelligence-backend
npm run migrate:add-sources
```

This script adds source fields to existing articles in the database, eliminating the need for URL parsing on every API call.

## Features

### Search & Filter
- **Text Search**: Search across titles, content, and authors
- **Sector Filter**: Filter by Technology, Finance, Automotive, etc.
- **Severity Filter**: Filter by High, Medium, Low severity levels
- **Company Flags**: Filter by automotive security, Samsung SDI, Adyen related articles

### Article Display
- **Article Cards**: Clean, informative article previews
- **Severity Badges**: Color-coded severity indicators
- **Company Tags**: Visual indicators for company-specific articles
- **Detailed View**: Full article information with metadata

### Responsive Design
- **Mobile-friendly**: Optimized for all screen sizes
- **Modern UI**: Clean, professional design
- **Loading States**: Smooth loading indicators
- **Error Handling**: Graceful error states

## Development

### Frontend Development
```bash
npm start          # Start development server
npm run build      # Build for production
npm test           # Run tests
```

### Backend Development
```bash
cd threat-intelligence-backend
npm run dev        # Start with nodemon (auto-restart)
npm start          # Start production server
```

## Environment Variables

Create a `.env` file in the backend directory:
```env
MONGODB_URI=your_mongodb_connection_string
DATABASE_NAME=threatly
COLLECTION_NAME=articles
PORT=5000
NODE_ENV=development
```

## Security Features

- **CORS Protection**: Configured for frontend origin
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Security Headers**: Helmet.js for additional security
- **Input Validation**: Server-side validation for all inputs
- **Error Handling**: Comprehensive error handling and logging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
