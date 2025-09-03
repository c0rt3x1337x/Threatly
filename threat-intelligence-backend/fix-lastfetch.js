require('dotenv').config();
const threatly2DatabaseService = require('./services/threatly2DatabaseService');
const scheduler = require('./services/scheduler');
const logger = require('./utils/logger');

async function fixLastFetch() {
  try {
    console.log('🔧 Fixing lastFetch issues...\n');
    
    // Step 1: Reset all feed lastFetch values
    console.log('📊 Step 1: Resetting all feed lastFetch values...');
    const resetResult = await threatly2DatabaseService.resetAllFeedLastFetch();
    console.log(`✅ Reset lastFetch for ${resetResult.updatedCount} feeds\n`);
    
    // Step 2: Run the RSS workflow to test the fix
    console.log('🚀 Step 2: Running RSS workflow to test lastFetch updates...');
    await scheduler.runNow();
    console.log('✅ RSS workflow completed\n');
    
    // Step 3: Check the results
    console.log('🔍 Step 3: Checking lastFetch update results...');
    const feeds = await threatly2DatabaseService.getFeeds();
    
    let feedsWithLastFetch = 0;
    let feedsWithoutLastFetch = 0;
    
    for (const feed of feeds) {
      if (feed.lastFetch) {
        feedsWithLastFetch++;
        console.log(`✅ Feed ${feed.name}: lastFetch = ${feed.lastFetch}`);
      } else {
        feedsWithoutLastFetch++;
        console.log(`⚠️  Feed ${feed.name}: lastFetch = NOT SET`);
      }
    }
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Feeds with lastFetch: ${feedsWithLastFetch}`);
    console.log(`   Feeds without lastFetch: ${feedsWithoutLastFetch}`);
    console.log(`   Total feeds: ${feeds.length}`);
    
    if (feedsWithoutLastFetch === 0) {
      console.log('\n🎉 SUCCESS: All feeds now have lastFetch values!');
    } else {
      console.log(`\n⚠️  ${feedsWithoutLastFetch} feeds still don't have lastFetch values.`);
      console.log('   This might indicate feeds with no articles or processing errors.');
    }
    
  } catch (error) {
    console.error('❌ Error fixing lastFetch:', error);
    logger.error('Error in fixLastFetch:', error);
  } finally {
    // Disconnect from database
    await threatly2DatabaseService.disconnect();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the fix
fixLastFetch().catch(console.error);
