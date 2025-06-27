// fix-openrouter-model.js - Script to fix OpenRouter model configuration
require('dotenv').config();
const mongoose = require('mongoose');
const LLMModel = require('./models/LLMModel');

async function fixOpenRouterModel() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find the problematic DeepSeek model
    const problematicModel = await LLMModel.findOne({
      modelId: 'deepseek/deepseek-chat-v3-0324:free'
    });

    if (problematicModel) {
      console.log('🔍 Found problematic DeepSeek model');
      
      // Update to a more reliable free model
      problematicModel.modelId = 'nousresearch/hermes-3-llama-3.1-405b:free';
      problematicModel.displayName = 'Hermes 3 Llama 3.1 405B (Free)';
      problematicModel.description = 'Free OpenRouter model - more reliable than DeepSeek';
      problematicModel.maxTokens = 4000;
      
      await problematicModel.save();
      console.log('✅ Updated model to use Hermes 3 Llama 3.1 405B');
    }

    // Create a mock model as backup
    const mockModel = await LLMModel.findOne({ name: 'test-mock-model' });
    if (!mockModel) {
      const newMockModel = new LLMModel({
        name: 'test-mock-model',
        displayName: 'Mock AI Model (Testing)',
        provider: 'custom',
        apiKey: 'mock-api-key',
        baseUrl: 'http://localhost:3000/mock-llm',
        modelId: 'mock-model',
        maxTokens: 2000,
        temperature: 0.5,
        systemPrompt: 'You are a mock AI assistant for testing purposes.',
        isActive: true,
        isDefault: false,
        description: 'Mock model for testing without external API calls',
        createdBy: new mongoose.Types.ObjectId(),
      });

      await newMockModel.save();
      console.log('✅ Created mock model as backup');
    }

    // List all models
    console.log('\n📋 Current models:');
    const models = await LLMModel.find().select('name displayName provider modelId isActive isDefault');
    models.forEach(model => {
      console.log(`  - ${model.displayName}`);
      console.log(`    Provider: ${model.provider}`);
      console.log(`    Model ID: ${model.modelId}`);
      console.log(`    Status: ${model.isActive ? 'ACTIVE' : 'INACTIVE'} ${model.isDefault ? '(DEFAULT)' : ''}`);
      console.log('');
    });

    console.log('🎯 Recommendations:');
    console.log('1. For OpenRouter models, check your privacy settings at: https://openrouter.ai/settings/privacy');
    console.log('2. Enable "Allow training on my data" if you want to use free models');
    console.log('3. Or use paid models which don\'t have data policy restrictions');
    console.log('4. The mock model will work for testing without external API calls');
    console.log('5. Consider using OpenAI GPT-3.5-turbo with a valid API key for production');

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixOpenRouterModel();
