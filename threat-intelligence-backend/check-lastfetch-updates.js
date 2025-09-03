require('dotenv').config();
const { MongoClient } = require('mongodb');
const logger = require('./utils/logger');

async function checkLastFetchUpdates() {
  let client;
  try {
    console.log('🔍 Checking lastFetch updates after workflow run...\n');
    
    // Connect to threatly2 database
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('threatly2');
    
    console.log('✅ Connected to threatly2 database\n');
    
    // 1. Fetch all documents from Feeds collection
    const feedsCollection = db.collection('Feeds');
    const feeds = await feedsCollection.find({}).toArray();
    
    console.log(`📊 Found ${feeds.length} feeds in database\n`);
    
    if (feeds.length === 0) {
      console.log('⚠️  No feeds found in database');
      return;
    }
    
    // 2. For each feed, compare lastFetch with newest article isoDate
    const articlesCollection = db.collection('Articles');
    let totalFeedsChecked = 0;
    let feedsWithIssues = 0;
    let feedsWithUpdates = 0;
    
    for (const feed of feeds) {
      totalFeedsChecked++;
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔍 Checking Feed: ${feed.name} (ID: ${feed._id})`);
      console.log(`   URL: ${feed.url}`);
      console.log(`   Current lastFetch: ${feed.lastFetch || 'NOT SET'}`);
      console.log(`   Feed Type: ${feed.type || 'news'}`);
      console.log(`   Is Active: ${feed.isActive || false}`);
      
      // Find articles belonging to this feed
      const feedArticles = await articlesCollection.find({
        source: feed.name
      }).sort({ isoDate: -1 }).toArray();
      
      if (feedArticles.length === 0) {
        console.log(`   ⚠️  No articles found for this feed`);
        if (feed.lastFetch) {
          console.log(`   ⚠️  WARNING: lastFetch not updated for feed ${feed._id} - no articles to process`);
          feedsWithIssues++;
        }
        continue;
      }
      
      // Get the newest article date
      const newestArticle = feedArticles[0];
      const newestArticleDate = newestArticle.isoDate;
      const oldestArticleDate = feedArticles[feedArticles.length - 1].isoDate;
      
      console.log(`   📰 Articles found: ${feedArticles.length}`);
      console.log(`   📅 Newest article date: ${newestArticleDate}`);
      console.log(`   📅 Oldest article date: ${oldestArticleDate}`);
      console.log(`   📰 Newest article title: ${newestArticle.title}`);
      
      // Check if lastFetch is set and compare with newest article date
      if (!feed.lastFetch) {
        console.log(`   ⚠️  WARNING: lastFetch not updated for feed ${feed._id} - lastFetch is null/undefined`);
        feedsWithIssues++;
      } else {
        const lastFetchDate = new Date(feed.lastFetch);
        const newestDate = new Date(newestArticleDate);
        
        console.log(`   🔄 lastFetch comparison:`);
        console.log(`      lastFetch: ${lastFetchDate.toISOString()}`);
        console.log(`      Newest article: ${newestDate.toISOString()}`);
        
        // Check if lastFetch is set to the max isoDate of processed articles
        if (lastFetchDate.getTime() === newestDate.getTime()) {
          console.log(`   ✅ lastFetch is correctly set to newest article date`);
          feedsWithUpdates++;
        } else if (lastFetchDate > newestDate) {
          console.log(`   ⚠️  WARNING: lastFetch is newer than newest article date`);
          console.log(`      This might indicate an issue with the workflow`);
          feedsWithIssues++;
        } else {
          console.log(`   ⚠️  WARNING: lastFetch is older than newest article date`);
          console.log(`      lastFetch not updated for feed ${feed._id}`);
          feedsWithIssues++;
        }
        
        // Check if lastFetch has changed recently (within last 24 hours)
        const now = new Date();
        const lastFetchAge = now.getTime() - lastFetchDate.getTime();
        const oneDayMs = 24 * 60 * 60 * 1000;
        
        if (lastFetchAge < oneDayMs) {
          console.log(`   🕒 lastFetch was updated ${Math.round(lastFetchAge / (60 * 60 * 1000))} hours ago`);
        } else {
          console.log(`   ⏰ lastFetch was updated ${Math.round(lastFetchAge / (60 * 60 * 1000))} hours ago`);
        }
      }
      
      // Show some sample articles for context
      console.log(`   📋 Sample articles:`);
      feedArticles.slice(0, 3).forEach((article, index) => {
        console.log(`      ${index + 1}. ${article.title} (${article.isoDate})`);
      });
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 SUMMARY REPORT`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Total feeds checked: ${totalFeedsChecked}`);
    console.log(`Feeds with issues: ${feedsWithIssues}`);
    console.log(`Feeds working correctly: ${feedsWithUpdates}`);
    console.log(`Feeds with no articles: ${totalFeedsChecked - feedsWithIssues - feedsWithUpdates}`);
    
    if (feedsWithIssues > 0) {
      console.log(`\n⚠️  ISSUES FOUND:`);
      console.log(`   - ${feedsWithIssues} feeds have lastFetch update issues`);
      console.log(`   - Check the warnings above for specific feed IDs`);
    } else {
      console.log(`\n✅ ALL FEEDS ARE WORKING CORRECTLY!`);
      console.log(`   - lastFetch is being updated properly for all feeds`);
    }
    
    // Additional checks for workflow consistency
    console.log(`\n🔍 ADDITIONAL WORKFLOW CHECKS:`);
    
    // Check if there are any articles without proper source mapping
    const articlesWithoutSource = await articlesCollection.find({
      $or: [
        { source: { $exists: false } },
        { source: null },
        { source: "" }
      ]
    }).count();
    
    if (articlesWithoutSource > 0) {
      console.log(`   ⚠️  Found ${articlesWithoutSource} articles without proper source mapping`);
    } else {
      console.log(`   ✅ All articles have proper source mapping`);
    }
    
    // Check for articles with very recent dates (potential workflow activity)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentArticles = await articlesCollection.find({
      isoDate: { $gte: oneHourAgo }
    }).count();
    
    console.log(`   📰 Articles processed in last hour: ${recentArticles}`);
    
    if (recentArticles > 0) {
      console.log(`   🚀 Workflow appears to be actively running`);
    } else {
      console.log(`   💤 No recent workflow activity detected`);
    }
    
    // Check total articles count
    const totalArticles = await articlesCollection.countDocuments();
    console.log(`   📊 Total articles in database: ${totalArticles}`);
    
    // Check if there are any articles at all
    if (totalArticles === 0) {
      console.log(`\n🚨 CRITICAL ISSUE: No articles found in database!`);
      console.log(`   This explains why lastFetch updates are not working properly.`);
      console.log(`   The workflow needs to be run to fetch and process articles.`);
    }
    
  } catch (error) {
    console.error('❌ Error checking lastFetch updates:', error);
    logger.error('Error in checkLastFetchUpdates:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the check
checkLastFetchUpdates().catch(console.error);
