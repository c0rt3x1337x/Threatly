require('dotenv').config();
const { MongoClient } = require('mongodb');

async function testKeywordsLoading() {
  let client;
  try {
    console.log('🧪 Testing Keywords Loading for GPT...\n');
    
    // Connect to database
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('threatly2');
    
    console.log('✅ Connected to threatly2 database\n');
    
    // Step 1: Check Keywords collection directly
    console.log('📊 Step 1: Checking Keywords Collection Directly...');
    const keywordsCollection = db.collection('Keywords');
    const allKeywords = await keywordsCollection.find({}).toArray();
    
    console.log(`Found ${allKeywords.length} keywords in Keywords collection\n`);
    
    if (allKeywords.length === 0) {
      console.log('❌ No keywords found! This is why alertMatches won\'t work.');
      console.log('   Please add some keywords to the Keywords collection first.');
      return;
    }
    
    // Step 2: Display all keywords
    console.log('📋 Step 2: All Keywords Found:');
    allKeywords.forEach((keyword, index) => {
      console.log(`${index + 1}. ${keyword.displayName || keyword.name} (${keyword.name})`);
      console.log(`   ID: ${keyword._id}`);
      console.log(`   Description: ${keyword.description ? keyword.description.substring(0, 100) + '...' : 'No description'}`);
      console.log('   ---');
    });
    
    // Step 3: Test the exact format that would be sent to GPT
    console.log('\n🚀 Step 3: Keywords Format for GPT:');
    const alertsJson = JSON.stringify(allKeywords.map(alert => ({
      _id: alert._id.toString(),
      name: alert.name,
      displayName: alert.displayName || alert.name,
      description: alert.description || ''
    })), null, 2);
    
    console.log('GPT will receive this alerts data:');
    console.log(alertsJson);
    
    // Step 4: Check for any potential issues
    console.log('\n🔍 Step 4: Checking for Potential Issues...');
    
    const issues = [];
    
    allKeywords.forEach((keyword, index) => {
      if (!keyword._id) {
        issues.push(`Keyword ${index + 1}: Missing _id`);
      }
      if (!keyword.name) {
        issues.push(`Keyword ${index + 1}: Missing name`);
      }
      if (!keyword.description) {
        issues.push(`Keyword ${index + 1}: Missing description (this might affect matching)`);
      }
    });
    
    if (issues.length === 0) {
      console.log('✅ No issues found with keywords structure');
    } else {
      console.log('⚠️  Issues found:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    }
    
    console.log('\n🎯 Test completed!');
    console.log(`📊 Summary: ${allKeywords.length} keywords ready for GPT processing`);
    
  } catch (error) {
    console.error('❌ Error testing keywords loading:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the test
testKeywordsLoading().catch(console.error);
