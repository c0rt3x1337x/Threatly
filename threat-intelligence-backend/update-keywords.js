require('dotenv').config();
const { MongoClient } = require('mongodb');

async function updateKeywords() {
  let client;
  try {
    console.log('🔧 Updating Keyword Descriptions...\n');
    
    // Connect to database
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('threatly2');
    
    console.log('✅ Connected to threatly2 database\n');
    
    // Get all keywords from Keywords collection
    const keywordsCollection = db.collection('Keywords');
    const keywords = await keywordsCollection.find({}).toArray();
    
    console.log(`📊 Found ${keywords.length} keywords to update\n`);
    
    if (keywords.length === 0) {
      console.log('❌ No keywords found! Please add some keywords first.');
      return;
    }
    
    // Define better descriptions for common keywords
    const betterDescriptions = {
      'samsung_sdi': 'Articles discussing Samsung SDI, battery technology, automotive batteries, electric vehicle batteries, or related company news and developments',
      'automotive': 'Articles related to automotive industry, car manufacturers, vehicle security, automotive cybersecurity, connected cars, or automotive technology',
      'finance': 'Articles about financial services, banking security, fintech, payment systems, cryptocurrency, or financial cybersecurity threats',
      'adyen': 'Articles discussing Adyen, payment processing, payment security, fintech, or related payment technology news',
      'security': 'Articles about cybersecurity, information security, network security, data protection, or security threats and vulnerabilities',
      'technology': 'Articles about technology companies, software security, hardware security, IT infrastructure, or technology-related threats',
      'manufacturing': 'Articles about manufacturing industry, industrial security, supply chain security, or manufacturing technology',
      'healthcare': 'Articles about healthcare cybersecurity, medical device security, patient data protection, or healthcare technology threats',
      'government': 'Articles about government cybersecurity, public sector security, national security, or government technology',
      'retail': 'Articles about retail cybersecurity, e-commerce security, point-of-sale security, or retail technology threats'
    };
    
    let updatedCount = 0;
    
    // Update each keyword with better description
    for (const keyword of keywords) {
      const keywordName = keyword.name.toLowerCase();
      let newDescription = keyword.description;
      let updated = false;
      
      // Check if we have a better description for this keyword
      if (betterDescriptions[keywordName]) {
        newDescription = betterDescriptions[keywordName];
        updated = true;
      } else {
        // For keywords not in our list, clean up any confusing language
        if (keyword.description) {
          // Remove patterns like "1 if...", "return X if...", etc.
          let cleaned = keyword.description
            .replace(/^\d+\s*if\s*/i, '') // Remove "1 if" at start
            .replace(/^return\s+\w+\s+if\s*/i, '') // Remove "return X if" at start
            .replace(/^if\s+.*?then\s*/i, '') // Remove "if X then" at start
            .replace(/^\d+\s*-\s*/, '') // Remove "1 -" at start
            .replace(/^\d+\.\s*/, '') // Remove "1." at start
            .trim();
          
          // If we cleaned something up, use the cleaned version
          if (cleaned !== keyword.description) {
            newDescription = cleaned;
            updated = true;
          }
        }
      }
      
      // Update the keyword if we have changes
      if (updated) {
        try {
          const result = await keywordsCollection.updateOne(
            { _id: keyword._id },
            { $set: { description: newDescription } }
          );
          
          if (result.modifiedCount > 0) {
            updatedCount++;
            console.log(`✅ Updated: ${keyword.displayName || keyword.name}`);
            console.log(`   Old: ${keyword.description}`);
            console.log(`   New: ${newDescription}`);
            console.log('   ---');
          }
        } catch (error) {
          console.log(`❌ Error updating ${keyword.name}: ${error.message}`);
        }
      } else {
        console.log(`⏭️  Skipped: ${keyword.displayName || keyword.name} (already good)`);
      }
    }
    
    console.log(`\n🎯 Update completed!`);
    console.log(`   Total keywords: ${keywords.length}`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Skipped: ${keywords.length - updatedCount}`);
    
    // Show final state
    console.log('\n📋 FINAL KEYWORD DESCRIPTIONS:');
    console.log('='.repeat(80));
    
    const finalKeywords = await keywordsCollection.find({}).toArray();
    finalKeywords.forEach((keyword, index) => {
      console.log(`${index + 1}. ${keyword.displayName || keyword.name} (${keyword.name})`);
      console.log(`   Description: ${keyword.description}`);
      console.log('   ' + '-'.repeat(60));
    });
    
  } catch (error) {
    console.error('❌ Error updating keywords:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the update
updateKeywords().catch(console.error);
