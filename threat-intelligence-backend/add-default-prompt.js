const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/threatly2';

async function addDefaultPrompt() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const promptsCollection = db.collection('Prompts');
    
    // Check if there's already an active prompt
    const existingActivePrompt = await promptsCollection.findOne({ isActive: true });
    
    if (existingActivePrompt) {
      console.log('Active prompt already exists:', existingActivePrompt.name);
      return;
    }
    
    // Default prompt for article analysis
    const defaultPrompt = {
      name: 'Default Article Analysis Prompt',
      description: 'Default prompt for analyzing articles and identifying security threats',
      content: `You are a cybersecurity threat intelligence analyst. Your task is to analyze the following article and determine if it contains any security threats, vulnerabilities, or relevant cybersecurity information.

Article Title: {title}
Article Content: {content}
Article Source: {source}

Please analyze this article and provide the following:

1. **Threat Level**: Rate the threat level as LOW, MEDIUM, HIGH, or CRITICAL
2. **Threat Type**: Identify the type of threat (e.g., malware, phishing, data breach, vulnerability, etc.)
3. **Affected Industries**: List any industries that might be affected
4. **Key Indicators**: Extract any relevant indicators (IPs, domains, file hashes, etc.)
5. **Summary**: Provide a brief summary of the threat
6. **Recommendations**: Suggest any immediate actions or monitoring steps

If the article does not contain any security threats or relevant cybersecurity information, respond with:
- Threat Level: NONE
- Threat Type: N/A
- Affected Industries: N/A
- Key Indicators: N/A
- Summary: No security threats identified
- Recommendations: N/A

Please provide your analysis in a structured format.`,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await promptsCollection.insertOne(defaultPrompt);
    console.log('Default prompt added successfully with ID:', result.insertedId);
    
  } catch (error) {
    console.error('Error adding default prompt:', error);
  } finally {
    await client.close();
  }
}

addDefaultPrompt();
