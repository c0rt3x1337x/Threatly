require('dotenv').config();
const { MongoClient } = require('mongodb');
const OpenAI = require('openai');
const logger = require('./utils/logger');

class GPTAlertService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.client = null;
    this.db = null;
    this.alerts = [];
    this.batchSize = parseInt(process.env.ALERT_BATCH_SIZE || process.env.BATCH_SIZE || '5', 10);
    this.maxArticles = parseInt(process.env.ALERT_MAX_ARTICLES || '200', 10);
         this.model = process.env.OPENAI_MODEL || 'gpt-4.1-nano';
  }

  /**
   * Connect to MongoDB
   */
  async connect() {
    try {
      this.client = new MongoClient(process.env.MONGODB_URI);
      await this.client.connect();
      this.db = this.client.db('threatly2');
      logger.info('Connected to threatly2 database for GPT alert processing');
    } catch (error) {
      logger.error('Error connecting to MongoDB:', error);
      throw error;
    }
  }

  /**
   * Load the active prompt from Prompts collection
   */
  async loadActivePrompt() {
    try {
      const activePrompt = await this.db.collection('Prompts').findOne({ isActive: true });
      if (!activePrompt) {
        logger.warn('No active prompt found in Prompts collection. Falling back to default prompt.');
      } else {
        logger.info(`Loaded active prompt: ${activePrompt.name}`);
      }
      return activePrompt;
    } catch (error) {
      logger.error('Error loading active prompt:', error);
      return null;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    if (this.client) {
      await this.client.close();
      logger.info('Disconnected from MongoDB');
    }
  }

  /**
   * Load alerts from Keywords collection
   */
  async loadAlerts() {
    try {
      const keywordsCollection = this.db.collection('Keywords');
      this.alerts = await keywordsCollection.find({}).toArray();
      logger.info(`Loaded ${this.alerts.length} alerts from Keywords collection`);
      
      // Log alerts for debugging
      console.log('\n=== LOADED ALERTS ===');
      this.alerts.forEach((alert, index) => {
        console.log(`${index + 1}. ${alert.displayName} (${alert.name})`);
        console.log(`   ID: ${alert._id}`);
        console.log(`   Description: ${alert.description.substring(0, 100)}...`);
        console.log('   ---');
      });
      
      return this.alerts;
    } catch (error) {
      logger.error('Error loading alerts:', error);
      throw error;
    }
  }

  /**
   * Get articles that haven't been processed for alerts yet
   * Modified to process ALL unprocessed articles regardless of lastFetch filtering
   */
  async getUnprocessedArticles() {
    try {
      const articlesCollection = this.db.collection('Articles');
      
      // Get articles that have actual content and haven't been processed for alerts
      // Removed the restrictive lastFetch filtering to ensure ALL articles get processed
      const unprocessedArticles = await articlesCollection.find({
        $and: [
          // Must have title and content
          { title: { $exists: true, $ne: null, $ne: "" } },
          { content: { $exists: true, $ne: null, $ne: "" } },
          // Must not have alertMatches or have empty alertMatches
          {
            $or: [
              { alertMatches: { $exists: false } },
              { alertMatches: { $size: 0 } }
            ]
          }
        ]
      }).limit(this.maxArticles).toArray();
      
      logger.info(`Found ${unprocessedArticles.length} unprocessed articles with content (removed lastFetch filtering)`);
      
      // Log articles for debugging
      console.log('\n=== ARTICLES TO PROCESS ===');
      unprocessedArticles.forEach((article, index) => {
        const articleDate = article.isoDate ? new Date(article.isoDate) : new Date(0);
        console.log(`${index + 1}. ${article.title || 'No Title'}`);
        console.log(`   ID: ${article._id}`);
        console.log(`   Source: ${article.source || 'No Source'}`);
        console.log(`   Article Date: ${articleDate}`);
        console.log(`   Content: ${(article.content || 'No Content').substring(0, 100)}...`);
        console.log('   ---');
      });
      
      return unprocessedArticles;
    } catch (error) {
      logger.error('Error getting unprocessed articles:', error);
      throw error;
    }
  }

  /**
   * Create prompt for GPT with alerts and articles
   */
  async createPrompt(articles) {
    // Debug: Check what alerts we have
    console.log('\n=== DEBUG: ALERTS FOR GPT ===');
    console.log(`Total alerts loaded: ${this.alerts.length}`);
    if (this.alerts.length === 0) {
      console.log('⚠️  WARNING: No alerts loaded! This will cause issues.');
    } else {
      console.log('Sample alerts:');
      this.alerts.slice(0, 3).forEach((alert, index) => {
        console.log(`  ${index + 1}. ${alert.displayName || alert.name} (ID: ${alert._id})`);
      });
    }
    
    // Format alerts as JSON array for better GPT processing
    const alertsJson = JSON.stringify(this.alerts.map(alert => ({
      _id: alert._id.toString(),
      name: alert.name,
      displayName: alert.displayName || alert.name || 'Unknown',
      description: alert.description || ''
    })), null, 2);

    console.log('\n=== DEBUG: ALERTS JSON ===');
    console.log('First 500 chars of alerts JSON:');
    console.log(alertsJson.substring(0, 500) + '...');

    const articlesSection = articles.map(article => {
      return `Article ID: ${article._id}
Title: ${article.title || 'No Title'}
Content: ${article.content || 'No Content'}
Source: ${article.source || 'No Source'}
Link: ${article.link || 'No Link'}
---`;
    }).join('\n\n');

    const activePrompt = await this.loadActivePrompt();

    if (activePrompt && activePrompt.content) {
      // Use placeholders if present; otherwise append sections
      let content = activePrompt.content;
      if (content.includes('{alerts}')) {
        content = content.replace('{alerts}', alertsJson);
      } else {
        content += `\n\n## ALERTS\n${alertsJson}`;
      }
      if (content.includes('{articles}')) {
        content = content.replace('{articles}', articlesSection);
      } else {
        content += `\n\n## ARTICLES TO ANALYZE\n${articlesSection}`;
      }
      return content;
    }

    // Simplified and consistent prompt format
    return `You are a cybersecurity threat intelligence analyst. Analyze each article against the predefined alerts and return structured results.

## ALERTS:
${alertsJson}

## ARTICLES TO ANALYZE:
${articlesSection}

## INSTRUCTIONS:
For each article, analyze the title and content against each alert:

### ALERT MATCHING:
- Compare article content against each alert's "name" and "description"
- If there's a match (exact, synonym, or contextual), add the alert's "_id" to "alertMatches"
- IMPORTANT: Always return the keyword's "_id" value, NOT the description text
- Look for keyword matches, related terms, and industry-specific terminology
- Example: If article mentions "Samsung SDI", return the keyword's "_id" like "507f1f77bcf86cd799439011"

### CLASSIFICATION:
- **threatLevel**: HIGH, MEDIUM, LOW, or NONE
- **threatType**: malware, phishing, ransomware, data breach, vulnerability, APT, insider threat, or other
- **industries**: Choose from Automotive, Finance, ICS/OT, Healthcare, Technology, Government, Retail, Manufacturing
- **isSpam**: true for ads/promotional content, false for genuine news

## RESPONSE FORMAT:
Return a JSON array with exactly this structure:
[
  {
    "id": "ARTICLE_ID_HERE",
    "threatLevel": "HIGH",
    "threatType": "malware",
    "industries": ["Automotive", "Technology"],
    "alertMatches": ["KEYWORD_ID_1", "KEYWORD_ID_2"],
    "isSpam": false
  }
]

⚠️  CRITICAL: In "alertMatches", always use the keyword's "_id" value from the ALERTS section above.
⚠️  NEVER return description text, numbers, or any other value - ONLY the "_id" strings.

Only respond with the JSON array, no additional text.`;
  }

  /**
   * Send batch to GPT for analysis
   */
  async analyzeBatchWithGPT(articles) {
    try {
      console.log('\n' + '='.repeat(80));
      console.log('🚀 STARTING GPT ANALYSIS');
      console.log('='.repeat(80));
      
      const prompt = await this.createPrompt(articles);
      
      logger.info(`Sending batch of ${articles.length} articles to GPT for analysis`);
      
      console.log('\n=== SENDING TO GPT ===');
      console.log(`📊 Batch size: ${articles.length} articles`);
      console.log(`📝 Prompt length: ${prompt.length} characters`);
      console.log(`🔑 Keywords loaded: ${this.alerts.length}`);
      
      // Show the first part of the prompt for debugging
      console.log('\n📋 PROMPT PREVIEW (first 1000 chars):');
      console.log('-'.repeat(50));
      console.log(prompt.substring(0, 1000) + '...');
      console.log('-'.repeat(50));
      
      console.log('\n⏳ Calling OpenAI API...');
      
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: "You are a cybersecurity threat intelligence analyst. Analyze articles against alerts and return JSON results."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 4000
      });

      const content = response.choices[0].message.content;
      logger.info('Received response from GPT');
      
      console.log('\n✅ GPT RESPONSE RECEIVED!');
      console.log('='.repeat(80));
      console.log('📥 Raw GPT Response:');
      console.log('-'.repeat(50));
      console.log(content);
      console.log('-'.repeat(50));
      
      console.log('\n🔍 RESPONSE ANALYSIS:');
      console.log(`📊 Response length: ${content.length} characters`);
      console.log(`🤖 Model used: ${this.model}`);
      console.log(`💰 Tokens used: ${response.usage?.total_tokens || 'Unknown'}`);
      
      // Try to parse the response
      console.log('\n📋 PARSING GPT RESPONSE...');
      
      // Parse JSON response
      try {
        const results = JSON.parse(content);
        logger.info(`Successfully parsed GPT response with ${results.length} article results`);
        
                 console.log('Parsed results:');
         console.log(JSON.stringify(results, null, 2));
         
         // Debug: Show the exact keys in each result
         console.log('\n=== DEBUG: RESULT KEYS ===');
         results.forEach((result, index) => {
           console.log(`Result ${index + 1} keys:`, Object.keys(result));
           console.log(`Result ${index + 1} threatLevel (new):`, result.threatLevel);
           console.log(`Result ${index + 1} 'Threat Level' (old):`, result['Threat Level']);
           console.log(`Result ${index + 1} threatType (new):`, result.threatType);
           console.log(`Result ${index + 1} 'Threat Type' (old):`, result['Threat Type']);
           console.log(`Result ${index + 1} industries (new):`, result.industries);
           console.log(`Result ${index + 1} 'Affected Industries' (old):`, result['Affected Industries']);
           console.log(`Result ${index + 1} alertMatches (new):`, result.alertMatches);
           console.log(`Result ${index + 1} 'Matched Alerts' (old):`, result['Matched Alerts']);
           console.log(`Result ${index + 1} isSpam:`, result.isSpam);
         });
        
         // Transform results to expected format - handle both old and new field names
         const transformedResults = results.map((result, index) => {
           // Handle the new response format
           const articleId = result.id || result.articleId || articles[index]?._id?.toString();
           
           // Convert isSpam from number to boolean
           const isSpam = result.isSpam === 1 || result.isSpam === true;
           
           // Handle industries - check both old and new field names
           let industries = [];
           if (result.industries && result.industries !== "N/A") {
             industries = Array.isArray(result.industries) 
               ? result.industries 
               : [result.industries];
           } else if (result['Affected Industries'] && result['Affected Industries'] !== "N/A") {
             industries = Array.isArray(result['Affected Industries']) 
               ? result['Affected Industries'] 
               : [result['Affected Industries']];
           }
           
           // Handle alertMatches - check both old and new field names
           let matches = [];
           if (result.alertMatches && Array.isArray(result.alertMatches)) {
             matches = result.alertMatches;
           } else if (result['Matched Alerts'] && Array.isArray(result['Matched Alerts'])) {
             matches = result['Matched Alerts'];
           } else if (result.matches && Array.isArray(result.matches)) {
             matches = result.matches;
           }
           
           // Handle threatLevel - check both old and new field names
           const threatLevel = result.threatLevel || result['Threat Level'] || 'NONE';
           
           // Handle threatType - check both old and new field names
           const threatType = result.threatType || result['Threat Type'] || 'N/A';
           
           return {
             articleId: articleId,
             matches: matches,
             industries: industries,
             isSpam: isSpam,
             threatLevel: threatLevel,
             threatType: threatType
           };
         });

                 // Validate results
         console.log('\n=== VALIDATION ===');
         transformedResults.forEach((result, index) => {
           console.log(`Result ${index + 1}:`);
           console.log(`  Article ID: ${result.articleId}`);
           console.log(`  Threat Level: ${result.threatLevel}`);
           console.log(`  Threat Type: ${result.threatType}`);
           console.log(`  Alert Matches: ${result.matches?.length || 0} alerts`);
           if (result.matches && result.matches.length > 0) {
             console.log(`  Alert IDs: ${result.matches.join(', ')}`);
           }
           console.log(`  Industries: ${result.industries?.length || 0} industries`);
           if (result.industries && result.industries.length > 0) {
             console.log(`  Industry Types: ${result.industries.join(', ')}`);
           }
           console.log(`  Spam Status: ${result.isSpam ? 'SPAM' : 'Legitimate'}`);
         });
        
        return transformedResults;
      } catch (parseError) {
        logger.error('Error parsing GPT response:', parseError);
        logger.error('Raw response:', content);
        console.log('\n=== PARSE ERROR ===');
        console.log('Failed to parse JSON response:');
        console.log(parseError.message);
        console.log('Raw response was:');
        console.log(content);
        throw new Error('Failed to parse GPT response');
      }
    } catch (error) {
      logger.error('Error calling GPT API:', error);
      throw error;
    }
  }

  /**
   * Transform GPT response to expected format
   */
  transformGPTResponse(content, articles) {
    try {
      console.log('\n🔄 TRANSFORMING GPT RESPONSE...');
      console.log('='.repeat(80));
      
      // Parse JSON response
      const results = JSON.parse(content);
      logger.info(`Successfully parsed GPT response with ${results.length} article results`);
      
      console.log(`📊 Parsed ${results.length} results from GPT`);
      
      // Transform results to expected format - simplified and consistent
      const transformedResults = results.map((result, index) => {
        console.log(`\n--- Transforming Result ${index + 1} ---`);
        
        // Get article ID - GPT should return "id" field
        const articleId = result.id || articles[index]?._id?.toString();
        
        if (!articleId) {
          console.log(`   ⚠️  No article ID found, using index-based mapping`);
          console.log(`   Available fields: ${Object.keys(result).join(', ')}`);
        } else {
          console.log(`   ✅ Article ID: ${articleId}`);
        }
        
        // Extract fields with consistent names
        const threatLevel = result.threatLevel || 'NONE';
        const threatType = result.threatType || 'N/A';
        const isSpam = result.isSpam === true || result.isSpam === 1;
        
        console.log(`   Threat Level: ${threatLevel}`);
        console.log(`   Threat Type: ${threatType}`);
        console.log(`   Is Spam: ${isSpam}`);
        
        // Handle industries - ensure it's always an array
        let industries = [];
        if (result.industries) {
          industries = Array.isArray(result.industries) ? result.industries : [result.industries];
        }
        console.log(`   Industries: ${JSON.stringify(industries)}`);
        
        // Handle alertMatches - ensure it's always an array
        let matches = [];
        if (result.alertMatches) {
          matches = Array.isArray(result.alertMatches) ? result.alertMatches : [result.alertMatches];
        }
        console.log(`   Raw Alert Matches: ${JSON.stringify(result.alertMatches)}`);
        console.log(`   Processed Matches: ${JSON.stringify(matches)}`);
        
        // Validate alertMatches contain valid keyword IDs
        if (matches.length > 0) {
          console.log(`   🔍 Validating ${matches.length} alert matches...`);
          const validKeywordIds = this.alerts.map(alert => alert._id.toString());
          console.log(`   Available keyword IDs: ${validKeywordIds.slice(0, 5).join(', ')}...`);
          
          const originalMatches = [...matches];
          matches = matches.filter(matchId => {
            const isValid = validKeywordIds.includes(matchId);
            if (!isValid) {
              console.log(`      ❌ Invalid keyword ID: ${matchId}`);
            } else {
              console.log(`      ✅ Valid keyword ID: ${matchId}`);
            }
            return isValid;
          });
          
          if (matches.length !== originalMatches.length) {
            console.log(`   ⚠️  Filtered out ${originalMatches.length - matches.length} invalid keyword IDs`);
          }
        }
        
        const transformed = {
          articleId: articleId,
          matches: matches,
          industries: industries,
          isSpam: isSpam,
          threatLevel: threatLevel,
          threatType: threatType
        };
        
        console.log(`   ✅ Transformed result:`, JSON.stringify(transformed, null, 2));
        return transformed;
      });
      
      console.log(`\n🎯 TRANSFORMATION COMPLETE!`);
      console.log(`📊 Total transformed results: ${transformedResults.length}`);
      
      // Show summary of all results
      console.log('\n📋 TRANSFORMATION SUMMARY:');
      transformedResults.forEach((result, index) => {
        console.log(`   Result ${index + 1}: Article ${result.articleId}`);
        console.log(`     Threat: ${result.threatLevel} (${result.threatType})`);
        console.log(`     Industries: ${result.industries.length}`);
        console.log(`     Alert Matches: ${result.matches.length}`);
        console.log(`     Spam: ${result.isSpam}`);
      });
      
      return transformedResults;
    } catch (parseError) {
      logger.error('Error parsing GPT response:', parseError);
      console.log('\n❌ TRANSFORMATION FAILED!');
      console.log('='.repeat(80));
      console.log('Parse error:', parseError.message);
      console.log('Raw content:', content);
      console.log('='.repeat(80));
      throw new Error('Failed to parse GPT response');
    }
  }

  /**
   * Update articles with alert matches
   */
  async updateArticlesWithMatches(results) {
    try {
      const articlesCollection = this.db.collection('Articles');
      const { ObjectId } = require('mongodb');
      let updatedCount = 0;

      console.log('\n=== UPDATING ARTICLES ===');

      for (const result of results) {
        try {
                     // Convert string ID to ObjectId
           const objectId = new ObjectId(result.articleId);
           
           // Debug: Show what we're about to store
           console.log(`\n🔍 DEBUG: Storing for article ${result.articleId}:`);
           console.log(`  - matches:`, result.matches);
           console.log(`  - industries:`, result.industries);
           console.log(`  - isSpam:`, result.isSpam);
           console.log(`  - threatLevel:`, result.threatLevel);
           console.log(`  - threatType:`, result.threatType);
          
                     const updateResult = await articlesCollection.updateOne(
             { _id: objectId },
             {
               $set: {
                 alertMatches: result.matches || [],
                 industries: result.industries || [],
                 isSpam: result.isSpam || false,
                 threatLevel: result.threatLevel || 'NONE',
                 threatType: result.threatType || 'N/A',
                 alertProcessedAt: new Date(),
                 lastUpdated: new Date(),
                 // Ensure these fields are set for new articles
                 read: false,
                 saved: false,
                 processedAt: new Date()
               }
             }
           );

                     if (updateResult.modifiedCount > 0) {
             updatedCount++;
             logger.info(`Updated article ${result.articleId} with threat level: ${result.threatLevel}, type: ${result.threatType}, ${result.matches?.length || 0} alert matches, ${result.industries?.length || 0} industries, spam: ${result.isSpam}`);
             console.log(`✅ Updated article ${result.articleId} - Threat: ${result.threatLevel} (${result.threatType}), ${result.matches?.length || 0} matches, ${result.industries?.length || 0} industries, spam: ${result.isSpam}`);
           } else {
             console.log(`⚠️  No update needed for article ${result.articleId} (modifiedCount: ${updateResult.modifiedCount})`);
           }
        } catch (error) {
          logger.error(`Error updating article ${result.articleId}:`, error);
          console.log(`❌ Error updating article ${result.articleId}: ${error.message}`);
        }
      }

      logger.info(`Updated ${updatedCount} articles with alert matches, industry classification, and spam detection`);
      console.log(`\n📊 Total articles updated: ${updatedCount}`);
      return updatedCount;
    } catch (error) {
      logger.error('Error updating articles with matches:', error);
      throw error;
    }
  }

  /**
   * Process articles in batches
   */
  async processArticlesInBatches() {
    try {
      await this.connect();
      await this.loadAlerts();
      
      const articles = await this.getUnprocessedArticles();
      
      if (articles.length === 0) {
        logger.info('No unprocessed articles found');
        return { processed: 0, batches: 0 };
      }

      logger.info(`Processing ${articles.length} articles in batches of ${this.batchSize}`);
      
      let totalProcessed = 0;
      let batchCount = 0;

      // Process articles in batches
      for (let i = 0; i < articles.length; i += this.batchSize) {
        const batch = articles.slice(i, i + this.batchSize);
        batchCount++;
        
        logger.info(`Processing batch ${batchCount}/${Math.ceil(articles.length / this.batchSize)}`);
        console.log(`\n${'='.repeat(50)}`);
        console.log(`BATCH ${batchCount}/${Math.ceil(articles.length / this.batchSize)}`);
        console.log(`${'='.repeat(50)}`);
        
        try {
          // Analyze batch with GPT
          const results = await this.analyzeBatchWithGPT(batch);
          
          // Update articles with results
          const updatedCount = await this.updateArticlesWithMatches(results);
          totalProcessed += updatedCount;
          
          logger.info(`Batch ${batchCount} completed: ${updatedCount} articles updated`);
          console.log(`\n✅ Batch ${batchCount} completed: ${updatedCount} articles updated`);
          
          // Add delay between batches to avoid rate limiting
          if (i + this.batchSize < articles.length) {
            console.log('⏳ Waiting 2 seconds before next batch...');
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
          }
          
        } catch (error) {
          logger.error(`Error processing batch ${batchCount}:`, error);
          console.log(`❌ Error processing batch ${batchCount}: ${error.message}`);
          // Continue with next batch
        }
      }

      logger.info(`Completed processing: ${totalProcessed} articles updated in ${batchCount} batches`);
      return { processed: totalProcessed, batches: batchCount };
      
    } catch (error) {
      logger.error('Error in processArticlesInBatches:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

module.exports = new GPTAlertService();
