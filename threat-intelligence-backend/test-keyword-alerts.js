require('dotenv').config();
const { MongoClient } = require('mongodb');
const logger = require('./utils/logger');

async function testKeywordAlerts() {
  let client;
  try {
    console.log('🧪 Testing Keyword-Based Alert Matching...\n');
    
    // Connect to threatly2 database
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('threatly2');
    
    console.log('✅ Connected to threatly2 database\n');
    
    // Step 1: Check Keywords collection
    console.log('📊 Step 1: Checking Keywords Collection...');
    const keywordsCollection = db.collection('Keywords');
    const keywords = await keywordsCollection.find({}).toArray();
    
    console.log(`Found ${keywords.length} keywords in collection\n`);
    
    if (keywords.length === 0) {
      console.log('❌ No keywords found! Please add some keywords first.');
      return;
    }
    
    // Display keywords
    keywords.forEach((keyword, index) => {
      console.log(`${index + 1}. ${keyword.displayName || keyword.name} (${keyword.name})`);
      console.log(`   ID: ${keyword._id}`);
      console.log(`   Description: ${keyword.description ? keyword.description.substring(0, 100) + '...' : 'No description'}`);
      console.log(`   User ID: ${keyword.userId}`);
      console.log('   ---');
    });
    
    // Step 2: Check Articles collection
    console.log('\n📰 Step 2: Checking Articles Collection...');
    const articlesCollection = db.collection('Articles');
    const articles = await articlesCollection.find({}).limit(5).toArray();
    
    console.log(`Found ${articles.length} sample articles\n`);
    
    if (articles.length > 0) {
      articles.forEach((article, index) => {
        console.log(`${index + 1}. ${article.title || 'No Title'}`);
        console.log(`   ID: ${article._id}`);
        console.log(`   Source: ${article.source || 'No Source'}`);
        console.log(`   Current alertMatches: ${article.alertMatches ? article.alertMatches.length : 0}`);
        if (article.alertMatches && article.alertMatches.length > 0) {
          console.log(`   Alert IDs: ${article.alertMatches.join(', ')}`);
        }
        console.log(`   Industries: ${article.industries ? article.industries.join(', ') : 'None'}`);
        console.log('   ---');
      });
    }
    
    // Step 3: Test keyword matching logic
    console.log('\n🔍 Step 3: Testing Keyword Matching Logic...');
    
    // Test case: automotive keyword
    const automotiveKeyword = keywords.find(k => 
      k.name.toLowerCase() === 'automotive' || 
      (k.displayName && k.displayName.toLowerCase().includes('automotive'))
    );
    
    if (automotiveKeyword) {
      console.log(`✅ Found automotive keyword: ${automotiveKeyword.displayName || automotiveKeyword.name}`);
      console.log(`   ID: ${automotiveKeyword._id}`);
      console.log(`   Description: ${automotiveKeyword.description}`);
      
      // Find articles that might match
      const potentialMatches = articles.filter(article => {
        const content = `${article.title || ''} ${article.content || ''}`.toLowerCase();
        const industries = article.industries || [];
        
        // Check if content matches keyword description
        const contentMatch = automotiveKeyword.description && 
          content.includes(automotiveKeyword.description.toLowerCase());
        
        // Check if industries match keyword name
        const industryMatch = industries.some(industry => 
          industry.toLowerCase().includes('automotive')
        );
        
        return contentMatch || industryMatch;
      });
      
      console.log(`\n📋 Found ${potentialMatches.length} potential matches for automotive keyword:`);
      potentialMatches.forEach((article, index) => {
        console.log(`${index + 1}. ${article.title || 'No Title'}`);
        console.log(`   Should have alertMatches: [${automotiveKeyword._id}]`);
        console.log(`   Current alertMatches: ${article.alertMatches ? article.alertMatches.length : 0}`);
      });
      
    } else {
      console.log('⚠️  No automotive keyword found. This is expected if no such keyword exists.');
    }
    
    // Step 4: Check for test case scenario
    console.log('\n🎯 Step 4: Checking Test Case Scenario...');
    
    // Look for: keyword with name = "automotive" + article with industries: ["Automotive"]
    const automotiveKeywords = keywords.filter(k => 
      k.name.toLowerCase() === 'automotive'
    );
    
    const automotiveArticles = articles.filter(article => 
      article.industries && 
      article.industries.some(industry => 
        industry.toLowerCase().includes('automotive')
      )
    );
    
    if (automotiveKeywords.length > 0 && automotiveArticles.length > 0) {
      console.log('✅ Test case scenario found!');
      console.log(`   Keywords with name "automotive": ${automotiveKeywords.length}`);
      console.log(`   Articles with "Automotive" industry: ${automotiveArticles.length}`);
      
      automotiveKeywords.forEach(keyword => {
        automotiveArticles.forEach(article => {
          console.log(`\n   Keyword: ${keyword.displayName || keyword.name} (ID: ${keyword._id})`);
          console.log(`   Article: ${article.title} (ID: ${article._id})`);
          console.log(`   Expected alertMatches: [${keyword._id}]`);
          console.log(`   Current alertMatches: ${article.alertMatches ? article.alertMatches.length : 0}`);
          
          if (article.alertMatches && article.alertMatches.includes(keyword._id.toString())) {
            console.log(`   ✅ CORRECT: Article already has this keyword in alertMatches`);
          } else {
            console.log(`   ❌ MISSING: Article should have this keyword in alertMatches`);
          }
        });
      });
    } else {
      console.log('⚠️  Test case scenario not found:');
      console.log(`   Keywords with name "automotive": ${automotiveKeywords.length}`);
      console.log(`   Articles with "Automotive" industry: ${automotiveArticles.length}`);
    }
    
    // Step 5: Summary and recommendations
    console.log('\n📊 SUMMARY:');
    console.log(`   Total Keywords: ${keywords.length}`);
    console.log(`   Sample Articles: ${articles.length}`);
    console.log(`   Keywords with descriptions: ${keywords.filter(k => k.description).length}`);
    console.log(`   Articles with alertMatches: ${articles.filter(a => a.alertMatches && a.alertMatches.length > 0).length}`);
    
    console.log('\n💡 RECOMMENDATIONS:');
    if (keywords.length === 0) {
      console.log('   1. Add keywords to the Keywords collection first');
    } else if (keywords.filter(k => !k.description).length > 0) {
      console.log('   1. Add descriptions to keywords for better matching');
    } else {
      console.log('   1. Keywords collection is properly configured');
    }
    
    if (articles.length === 0) {
      console.log('   2. Add articles to test the alert matching');
    } else {
      console.log('   2. Articles collection has data for testing');
    }
    
    console.log('   3. Run the GPT alert service to process articles with keywords');
    
  } catch (error) {
    console.error('❌ Error testing keyword alerts:', error);
    logger.error('Error in testKeywordAlerts:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the test
testKeywordAlerts().catch(console.error);
