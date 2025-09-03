const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testArticlesEndpoint() {
  try {
    console.log('🧪 Testing Articles Endpoint...\n');

    // Step 1: Admin Login
    console.log('1. 🔐 Admin Login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@threatly.com',
      password: 'admin'
    });
    
    console.log('✅ Admin login successful');
    const cookies = loginResponse.headers['set-cookie'];
    
    // Configure axios with cookies
    const axiosWithCookies = axios.create({
      baseURL: BASE_URL,
      headers: {
        Cookie: cookies.join('; ')
      }
    });

    // Step 2: Test Articles Endpoint
    console.log('\n2. 📰 Testing Articles Endpoint...');
    try {
      const articlesResponse = await axiosWithCookies.get('/articles');
      console.log('✅ Articles endpoint working!');
      console.log(`   Total articles: ${articlesResponse.data.data?.length || articlesResponse.data.articles?.length || 'Unknown'}`);
      console.log(`   Response format: ${JSON.stringify(Object.keys(articlesResponse.data))}`);
      
      // Show sample article if available
      const articles = articlesResponse.data.data || articlesResponse.data.articles || [];
      if (articles.length > 0) {
        const sample = articles[0];
        console.log('\n   Sample article:');
        console.log(`   - Title: ${sample.title}`);
        console.log(`   - Source: ${sample.source}`);
        console.log(`   - Date: ${sample.isoDate || sample.isodate || sample.pubDate}`);
        console.log(`   - ID: ${sample._id}`);
      }
    } catch (error) {
      console.log('❌ Failed to get articles:', error.response?.data || error.message);
    }

    // Step 3: Test Articles with Pagination
    console.log('\n3. 📄 Testing Articles with Pagination...');
    try {
      const articlesResponse = await axiosWithCookies.get('/articles?page=1&limit=5');
      console.log('✅ Articles with pagination working!');
      console.log(`   Articles returned: ${articlesResponse.data.data?.length || articlesResponse.data.articles?.length || 'Unknown'}`);
      console.log(`   Pagination info: ${JSON.stringify(articlesResponse.data.pagination)}`);
    } catch (error) {
      console.log('❌ Failed to get articles with pagination:', error.response?.data || error.message);
    }

    // Step 4: Test Articles Sources
    console.log('\n4. 🔗 Testing Articles Sources...');
    try {
      const sourcesResponse = await axiosWithCookies.get('/articles/sources');
      console.log('✅ Articles sources working!');
      console.log(`   Sources found: ${sourcesResponse.data.data?.length || 'Unknown'}`);
      if (sourcesResponse.data.data && sourcesResponse.data.data.length > 0) {
        console.log(`   Sample sources: ${sourcesResponse.data.data.slice(0, 5).join(', ')}`);
      }
    } catch (error) {
      console.log('❌ Failed to get articles sources:', error.response?.data || error.message);
    }

    console.log('\n🎉 Articles endpoint test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testArticlesEndpoint();
}

module.exports = { testArticlesEndpoint };
