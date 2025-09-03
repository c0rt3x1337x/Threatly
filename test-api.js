const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log('Testing API health...');
    const healthResponse = await fetch('http://localhost:5000/api/health');
    const healthData = await healthResponse.json();
    console.log('Health check:', healthData);

    console.log('\nTesting articles endpoint...');
    const articlesResponse = await fetch('http://localhost:5000/api/articles');
    const articlesData = await articlesResponse.json();
    console.log('Articles count:', articlesData.length);
    console.log('First article:', articlesData[0] ? articlesData[0].title : 'No articles found');

  } catch (error) {
    console.error('API test failed:', error.message);
  }
}

testAPI(); 