// test-llm.js - Simple test script for LLM functionality
require('dotenv').config();
const mongoose = require('mongoose');
const LLMModel = require('./models/LLMModel');
const LLMConversation = require('./models/LLMConversation');

async function testLLMSetup() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Check if any LLM models exist
    const modelCount = await LLMModel.countDocuments();
    console.log(`📊 Found ${modelCount} LLM models in database`);

    if (modelCount === 0) {
      console.log('⚠️  No LLM models found. Creating a test model...');
      
      // Create a test model (you'll need to replace with real API key)
      const testModel = new LLMModel({
        name: 'test-gpt-3.5',
        displayName: 'Test GPT-3.5 Turbo',
        provider: 'openai',
        apiKey: 'your-api-key-here', // Replace with real API key
        modelId: 'gpt-3.5-turbo',
        maxTokens: 4000,
        temperature: 0.7,
        systemPrompt: 'You are a helpful AI assistant.',
        isActive: true,
        isDefault: true,
        description: 'Test OpenAI GPT-3.5 Turbo model',
        createdBy: new mongoose.Types.ObjectId(), // Dummy user ID
      });

      await testModel.save();
      console.log('✅ Test model created');
    }

    // List all models
    const models = await LLMModel.find().select('name displayName provider isActive isDefault');
    console.log('📋 Available models:');
    models.forEach(model => {
      console.log(`  - ${model.displayName} (${model.provider}) ${model.isDefault ? '[DEFAULT]' : ''} ${model.isActive ? '[ACTIVE]' : '[INACTIVE]'}`);
    });

    // Check conversations
    const conversationCount = await LLMConversation.countDocuments();
    console.log(`💬 Found ${conversationCount} conversations in database`);

    console.log('\n🎉 LLM setup test completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Update the test model with a real API key');
    console.log('2. Start the server: npm start');
    console.log('3. Test the LLM chat interface in the frontend');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testLLMSetup();
