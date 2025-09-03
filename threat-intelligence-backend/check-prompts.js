require('dotenv').config();
const { MongoClient } = require('mongodb');

async function checkPrompts() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('threatly2');
    const prompts = await db.collection('Prompts').find({}).toArray();
    
    console.log('\n=== CURRENT PROMPTS ===');
    if (prompts.length === 0) {
      console.log('No prompts found in database');
    } else {
      prompts.forEach((p, i) => {
        console.log(`${i + 1}. ${p.name} (${p.isActive ? 'ACTIVE' : 'INACTIVE'})`);
        console.log(`   ID: ${p._id}`);
        console.log(`   Description: ${p.description || 'No description'}`);
        console.log(`   Created: ${p.createdAt}`);
        console.log('   ---');
      });
      
      const active = prompts.find(p => p.isActive);
      if (active) {
        console.log('\n=== ACTIVE PROMPT CONTENT ===');
        console.log(active.content);
      }
    }
    
  } catch (error) {
    console.error('Error checking prompts:', error);
  } finally {
    await client.close();
  }
}

checkPrompts();
