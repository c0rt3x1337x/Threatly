require('dotenv').config();
const threatly2DatabaseService = require('./services/threatly2DatabaseService');

async function checkDatabase() {
  try {
    console.log('Checking threatly2 database...');

    // Check articles
    const articleCount = await threatly2DatabaseService.getArticlesCount();
    console.log('Total articles in database:', articleCount);

    if (articleCount > 0) {
      const sample = await threatly2DatabaseService.getArticles({}, {}, 3, 0);
      console.log('\nSample articles:');
      sample.forEach((article, i) => {
        console.log(`${i+1}. ${article.title}`);
        console.log(`   Source: ${article.source}`);
        console.log(`   Date: ${article.isoDate}`);
        console.log(`   Type: ${article.type || 'N/A'}`);
        console.log(`   Industry: ${article.industry || 'N/A'}`);
        console.log(`   Severity: ${article.severity || 'N/A'}`);
        console.log(`   Adyen: ${article.adyen || 0}`);
        console.log(`   Automotive: ${article.automotive || 0}`);
        console.log(`   Samsung SDI: ${article.samsung_sdi || 0}`);
        console.log('');
      });
    }

    // Check feeds
    const feeds = await threatly2DatabaseService.getFeeds();
    console.log('\nTotal feeds in database:', feeds.length);

    if (feeds.length > 0) {
      console.log('\nFeeds in database:');
      feeds.forEach((feed, i) => {
        console.log(`${i+1}. ${feed.name}`);
        console.log(`   URL: ${feed.url}`);
        console.log(`   Type: ${feed.type || 'N/A'}`);
        console.log(`   Active: ${feed.isActive ? 'Yes' : 'No'}`);
        console.log(`   Description: ${feed.description || 'N/A'}`);
        console.log(`   Last Fetch: ${feed.lastFetch ? new Date(feed.lastFetch).toISOString() : 'Never'}`);
        console.log(`   ISO Date: ${feed.isodate ? new Date(feed.isodate).toISOString() : 'Never'}`);
        console.log('');
      });
    } else {
      console.log('\nNo feeds found in database. Please add some feeds to enable RSS fetching.');
    }

    console.log('Database check completed');

  } catch (error) {
    console.error('Error checking database:', error);
  }
}

checkDatabase();
