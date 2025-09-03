require('dotenv').config();
const { MongoClient } = require('mongodb');

async function listKeywords() {
  let client;
  try {
    console.log('🔍 Listing Keywords for GPT...\n');
    
    // Connect to database
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('threatly2');
    
    console.log('✅ Connected to threatly2 database\n');
    
    // Get all keywords from Keywords collection
    const keywordsCollection = db.collection('Keywords');
    const keywords = await keywordsCollection.find({}).toArray();
    
    console.log(`📊 Found ${keywords.length} keywords in Keywords collection\n`);
    
    if (keywords.length === 0) {
      console.log('❌ No keywords found! This is why alertMatches won\'t work.');
      console.log('   Please add some keywords to the Keywords collection first.');
      return;
    }
    
    // Display all keywords
    console.log('📋 ALL KEYWORDS BEING SENT TO GPT:');
    console.log('='.repeat(80));
    
    keywords.forEach((keyword, index) => {
      console.log(`${index + 1}. ${keyword.displayName || keyword.name} (${keyword.name})`);
      console.log(`   ID: ${keyword._id}`);
      console.log(`   Description: ${keyword.description || 'No description'}`);
      console.log(`   User ID: ${keyword.userId || 'No user ID'}`);
      console.log('   ' + '-'.repeat(60));
    });
    
    // Show the exact JSON format that GPT receives
    console.log('\n🚀 EXACT JSON FORMAT SENT TO GPT:');
    console.log('='.repeat(80));
    
    const alertsJson = JSON.stringify(keywords.map(alert => ({
      _id: alert._id.toString(),
      name: alert.name,
      displayName: alert.displayName || alert.name || 'Unknown',
      description: alert.description || ''
    })), null, 2);
    
    console.log(alertsJson);
    
    console.log('\n📊 SUMMARY:');
    console.log(`   Total Keywords: ${keywords.length}`);
    console.log(`   With Display Names: ${keywords.filter(k => k.displayName).length}`);
    console.log(`   With Descriptions: ${keywords.filter(k => k.description).length}`);
    console.log(`   With User IDs: ${keywords.filter(k => k.userId).length}`);
    
  } catch (error) {
    console.error('❌ Error listing keywords:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the script
listKeywords().catch(console.error);
