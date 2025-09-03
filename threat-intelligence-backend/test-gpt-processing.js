require('dotenv').config();
const gptAlertService = require('./gpt-alert-service');
const { MongoClient } = require('mongodb');

async function testGPTProcessing() {
  let client;
  try {
    console.log('🧪 Testing GPT Processing...\n');
    
    // Connect to database
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('threatly2');
    
    console.log('✅ Connected to threatly2 database\n');
    
    // Step 1: Check total articles
    const totalArticles = await db.collection('Articles').countDocuments({});
    console.log(`📊 Total articles in database: ${totalArticles}`);
    
    // Step 2: Check articles with content
    const articlesWithContent = await db.collection('Articles').countDocuments({
      $and: [
        { title: { $exists: true, $ne: null, $ne: "" } },
        { content: { $exists: true, $ne: null, $ne: "" } }
      ]
    });
    console.log(`📝 Articles with title and content: ${articlesWithContent}`);
    
    // Step 3: Check articles already processed (have alertMatches)
    const processedArticles = await db.collection('Articles').countDocuments({
      $and: [
        { title: { $exists: true, $ne: null, $ne: "" } },
        { content: { $exists: true, $ne: null, $ne: "" } },
        { alertMatches: { $exists: true, $ne: null, $ne: [] } }
      ]
    });
    console.log(`✅ Articles already processed (have alertMatches): ${processedArticles}`);
    
    // Step 4: Check unprocessed articles
    const unprocessedArticles = await db.collection('Articles').countDocuments({
      $and: [
        { title: { $exists: true, $ne: null, $ne: "" } },
        { content: { $exists: true, $ne: null, $ne: "" } },
        {
          $or: [
            { alertMatches: { $exists: false } },
            { alertMatches: { $size: 0 } }
          ]
        }
      ]
    });
    console.log(`⏳ Articles NOT processed (no alertMatches): ${unprocessedArticles}`);
    
    // Step 5: Check articles by source
    const articlesBySource = await db.collection('Articles').aggregate([
      {
        $match: {
          $and: [
            { title: { $exists: true, $ne: null, $ne: "" } },
            { content: { $exists: true, $ne: null, $ne: "" } }
          ]
        }
      },
      {
        $group: {
          _id: '$source',
          total: { $sum: 1 },
          processed: {
            $sum: {
              $cond: [
                { $and: [{ $isArray: '$alertMatches' }, { $gt: [{ $size: '$alertMatches' }, 0] }] },
                1,
                0
              ]
            }
          },
          unprocessed: {
            $sum: {
              $cond: [
                { $or: [{ $not: '$alertMatches' }, { $eq: [{ $size: '$alertMatches' }, 0] }] },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { total: -1 } }
    ]).toArray();
    
    console.log('\n📊 Articles by source:');
    articlesBySource.forEach(source => {
      console.log(`   ${source._id || 'No Source'}:`);
      console.log(`     Total: ${source.total}`);
      console.log(`     Processed: ${source.processed}`);
      console.log(`     Unprocessed: ${source.unprocessed}`);
    });
    
    // Step 6: Check keywords/alerts
    const keywordsCount = await db.collection('Keywords').countDocuments({});
    console.log(`\n🔑 Keywords/Alerts available: ${keywordsCount}`);
    
    if (keywordsCount > 0) {
      const sampleKeywords = await db.collection('Keywords').find({}).limit(3).toArray();
      console.log('\n📋 Sample keywords:');
      sampleKeywords.forEach((keyword, index) => {
        console.log(`   ${index + 1}. ${keyword.displayName || keyword.name} (${keyword.name})`);
        console.log(`      Description: ${keyword.description?.substring(0, 100)}...`);
      });
    }
    
    // Step 7: Test GPT processing
    console.log('\n🚀 Testing GPT processing...');
    try {
      const result = await gptAlertService.processArticlesInBatches();
      console.log(`\n✅ GPT processing completed:`);
      console.log(`   Batches processed: ${result.batches}`);
      console.log(`   Articles updated: ${result.processed}`);
    } catch (error) {
      console.log(`\n❌ GPT processing failed: ${error.message}`);
    }
    
    console.log('\n🎯 Test completed!');
    
  } catch (error) {
    console.error('❌ Error testing GPT processing:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the test
testGPTProcessing().catch(console.error);
