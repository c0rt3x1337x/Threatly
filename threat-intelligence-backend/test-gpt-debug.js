require('dotenv').config();
const gptAlertService = require('./gpt-alert-service');

async function testGPTDebug() {
  try {
    console.log('🧪 Testing GPT Service with Full Debugging...\n');
    
    // Test 1: Check if keywords are loaded
    console.log('📊 Step 1: Testing Keywords Loading...');
    await gptAlertService.connect();
    await gptAlertService.loadAlerts();
    
    // Test 2: Get unprocessed articles
    console.log('\n📰 Step 2: Getting Unprocessed Articles...');
    const articles = await gptAlertService.getUnprocessedArticles();
    
    if (articles.length === 0) {
      console.log('❌ No unprocessed articles found!');
      console.log('   This means all articles already have alertMatches or no articles exist.');
      return;
    }
    
    console.log(`✅ Found ${articles.length} articles to process`);
    
    // Test 3: Process a small batch with GPT (this will show all debugging)
    console.log('\n🚀 Step 3: Processing Articles with GPT (Debug Mode)...');
    console.log('This will show you the complete debugging output!');
    
    // Process just the first article to see debugging
    const testBatch = articles.slice(0, 1);
    console.log(`\n📋 Processing test batch of ${testBatch.length} article(s)...`);
    
    const result = await gptAlertService.processArticlesInBatches();
    
    console.log('\n🎯 GPT Processing Complete!');
    console.log(`📊 Results: ${result.processed} articles updated in ${result.batches} batches`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\n🔍 Error details:', error.message);
    
    if (error.message.includes('Failed to parse GPT response')) {
      console.log('\n💡 This suggests GPT returned invalid JSON. Check the debugging output above.');
    }
  } finally {
    try {
      await gptAlertService.disconnect();
      console.log('\n🔌 Disconnected from database');
    } catch (e) {
      // Ignore disconnect errors
    }
  }
}

// Run the test
console.log('Starting GPT Debug Test...\n');
testGPTDebug().catch(console.error);

