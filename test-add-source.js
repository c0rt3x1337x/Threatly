const threatly2DatabaseService = require('./services/threatly2DatabaseService');

async function testAddSource() {
  try {
    console.log('Testing add source functionality...');
    
    const testFeed = {
      name: 'Test Source',
      url: 'https://example.com/feed',
      description: 'Test description',
      category: 'general',
      type: 'news',
      status: 'active',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      fetchCount: 0,
      errorCount: 0
    };

    console.log('Test feed object:', testFeed);
    
    const result = await threatly2DatabaseService.insertFeed(testFeed);
    console.log('Insert result:', result);
    
    if (result.insertedId) {
      console.log('✅ Source added successfully with ID:', result.insertedId);
    } else {
      console.log('❌ Failed to add source');
    }
    
  } catch (error) {
    console.error('❌ Error testing add source:', error);
  } finally {
    process.exit(0);
  }
}

testAddSource();
