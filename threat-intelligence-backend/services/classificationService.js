const OpenAI = require('openai');
const logger = require('../utils/logger');
const threatly2DatabaseService = require('./threatly2DatabaseService');

class ClassificationService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.batchSize = parseInt(process.env.BATCH_SIZE) || 5;
    this.batchDelay = parseInt(process.env.BATCH_DELAY_MS) || 2000;
  }

  /**
   * Get active keywords for classification
   * @returns {Promise<Array>} Array of active keywords
   */
  async getActiveKeywords() {
    try {
      const keywords = await threatly2DatabaseService.getKeywords();
      return keywords;
    } catch (error) {
      logger.error('Error fetching keywords:', error);
      return [];
    }
  }

  /**
   * Get active prompt for classification
   * @returns {Promise<Object|null>} Active prompt or null
   */
  async getActivePrompt() {
    try {
      const db = await threatly2DatabaseService.connect();
      const activePrompt = await db.collection('Prompts').findOne({ isActive: true });
      return activePrompt;
    } catch (error) {
      logger.error('Error fetching active prompt:', error);
      return null;
    }
  }

  /**
   * Classify a single article using keywords
   * @param {string} content - Article content to classify
   * @param {Array} keywords - Keywords to match against
   * @returns {Promise<Object>} Classification result
   */
  async classifyArticle(content, keywords) {
    if (!content || !keywords || keywords.length === 0) {
      return {
        industries: ['Other'],
        matchedKeywords: []
      };
    }

    try {
      const prompt = this.buildClassificationPrompt(content, keywords);
      
      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-nano',
        messages: [
          {
            role: 'system',
            content: 'You are a cybersecurity threat intelligence analyst. Analyze the content and determine which keywords match and what industries are relevant.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 500,
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.1
      });

      const result = response.choices[0].message.content;
      return this.parseClassificationResult(result, keywords);

    } catch (error) {
      logger.error('OpenAI API error:', error);
      return {
        industries: ['Other'],
        matchedKeywords: []
      };
    }
  }

  /**
   * Classify articles using active prompt from database
   * @param {Array} articles - Array of articles to classify
   * @returns {Promise<Object>} Classification result with GPT output
   */
  async classifyArticlesWithPrompt(articles) {
    try {
      const activePrompt = await this.getActivePrompt();
      const keywords = await this.getActiveKeywords();
      
      if (!activePrompt) {
        throw new Error('No active prompt found in database');
      }

      // Format alerts for the prompt
      const alertsText = keywords.map(keyword => 
        `- ${keyword.displayName} (${keyword._id}): ${keyword.description}`
      ).join('\n');

      // Format articles for the prompt
      const articlesText = articles.map((article, index) => 
        `Article ${index + 1}:
Title: ${article.title}
Content: ${article.content || ''}
Source: ${article.source || ''}
Link: ${article.link || ''}
---`
      ).join('\n\n');

      // Replace placeholders in the prompt
      let promptContent = activePrompt.content
        .replace('{alerts}', alertsText)
        .replace('{articles}', articlesText);

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-nano',
        messages: [
          {
            role: 'user',
            content: promptContent
          }
        ],
        max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 2000,
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.1
      });

      const gptOutput = response.choices[0].message.content;
      
      // Parse the GPT output to extract matched keywords
      const matchedKeywords = this.extractMatchedKeywords(gptOutput, keywords);
      
      return {
        gptOutput,
        matchedKeywords,
        industries: ['Other'] // Default, can be enhanced later
      };

    } catch (error) {
      logger.error('Error classifying articles with prompt:', error);
      return {
        gptOutput: 'Error: ' + error.message,
        matchedKeywords: [],
        industries: ['Other']
      };
    }
  }

  /**
   * Extract matched keywords from GPT output
   * @param {string} gptOutput - Output from GPT
   * @param {Array} keywords - Available keywords
   * @returns {Array} Array of matched keyword IDs
   */
  extractMatchedKeywords(gptOutput, keywords) {
    const matchedKeywords = [];
    
    for (const keyword of keywords) {
      // Check if keyword ID or name appears in GPT output
      if (gptOutput.includes(keyword._id.toString()) || 
          gptOutput.includes(keyword.name) ||
          gptOutput.includes(keyword.displayName)) {
        matchedKeywords.push(keyword._id.toString());
      }
    }
    
    return matchedKeywords;
  }

  /**
   * Build the classification prompt for OpenAI
   * @param {string} content - Content to classify
   * @param {Array} keywords - Keywords to match against
   * @returns {string} Classification prompt
   */
  buildClassificationPrompt(content, keywords) {
    const industries = [
      'Finance', 'Automotive', 'Industrial Control Systems', 'Healthcare', 
      'Energy', 'Transportation', 'Telecommunications', 'Government', 
      'Education', 'Retail', 'Manufacturing', 'Other'
    ];

    const keywordDescriptions = keywords.map(keyword => 
      `- ${keyword.displayName} (${keyword.name}): ${keyword.description}`
    ).join('\n');

    return `
Analyze the following content and determine:

1. Which industries are relevant (select from: ${industries.join(', ')})
2. Which keywords match the content (return the keyword IDs)

Content: ${content.substring(0, 2000)}...

Keywords to check:
${keywordDescriptions}

Return a JSON object with:
- industries: array of relevant industries
- matchedKeywords: array of keyword IDs that match

Example response:
{
  "industries": ["Finance", "Government"],
  "matchedKeywords": ["keyword_id_1", "keyword_id_2"]
}
`;
  }

  /**
   * Parse the classification result from OpenAI
   * @param {string} result - Raw result from OpenAI
   * @param {Array} keywords - Keywords used for classification
   * @returns {Object} Parsed classification result
   */
  parseClassificationResult(result, keywords) {
    try {
      // Extract JSON from the response
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }

      const classification = JSON.parse(jsonMatch[0]);
      
      // Validate industries
      const validIndustries = [
        'Finance', 'Automotive', 'Industrial Control Systems', 'Healthcare', 
        'Energy', 'Transportation', 'Telecommunications', 'Government', 
        'Education', 'Retail', 'Manufacturing', 'Other'
      ];

      const validatedIndustries = classification.industries?.filter(industry => 
        validIndustries.includes(industry)
      ) || ['Other'];

      // Validate matched keywords
      const keywordIds = keywords.map(k => k._id.toString());
      const validatedMatchedKeywords = classification.matchedKeywords?.filter(id => 
        keywordIds.includes(id)
      ) || [];

      return {
        industries: validatedIndustries,
        matchedKeywords: validatedMatchedKeywords
      };

    } catch (error) {
      logger.error('Error parsing classification result:', error);
      logger.error('Raw result:', result);
      
      return {
        industries: ['Other'],
        matchedKeywords: []
      };
    }
  }

  /**
   * Classify a batch of articles using OpenAI
   * @param {Array} articles - Array of articles to classify
   * @returns {Promise<Array>} Array of classified articles
   */
  async classifyArticles(articles) {
    if (!articles || articles.length === 0) {
      return [];
    }

    const keywords = await this.getActiveKeywords();
    const classifiedArticles = [];

    // Process articles in batches
    for (let i = 0; i < articles.length; i += this.batchSize) {
      const batch = articles.slice(i, i + this.batchSize);
      
      try {
        const batchResults = await this.classifyBatch(batch, keywords);
        classifiedArticles.push(...batchResults);
        
        // Wait between batches to respect API limits
        if (i + this.batchSize < articles.length) {
          await this.delay(this.batchDelay);
        }
      } catch (error) {
        logger.error(`Error classifying batch ${i / this.batchSize + 1}:`, error);
        // Add unclassified articles with defaults
        batch.forEach(article => {
          classifiedArticles.push({
            _id: article._id || article.link,
            industries: ['Other'],
            alertMatches: []
          });
        });
      }
    }

    return classifiedArticles;
  }

  /**
   * Classify a single batch of articles
   * @param {Array} batch - Batch of articles
   * @param {Array} keywords - Keywords to match against
   * @returns {Promise<Array>} Classified articles
   */
  async classifyBatch(batch, keywords) {
    const classifiedArticles = [];

    for (const article of batch) {
      try {
        const content = `${article.title} ${article.content}`;
        const classification = await this.classifyArticle(content, keywords);
        
        classifiedArticles.push({
          _id: article._id || article.link,
          industries: classification.industries,
          alertMatches: classification.matchedKeywords
        });
      } catch (error) {
        logger.error(`Error classifying article ${article.title}:`, error);
        classifiedArticles.push({
          _id: article._id || article.link,
          industries: ['Other'],
          alertMatches: []
        });
      }
    }

    return classifiedArticles;
  }

  /**
   * Delay function for batch processing
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new ClassificationService();
