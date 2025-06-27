// setup-test-models.js - Script to create test LLM models
require('dotenv').config();
const mongoose = require('mongoose');
const LLMModel = require('./models/LLMModel');

async function setupTestModels() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing test models
    await LLMModel.deleteMany({ name: { $regex: /^test-/ } });
    console.log('🧹 Cleared existing test models');

    // Create a dummy user ID for testing
    const dummyUserId = new mongoose.Types.ObjectId();

    // Test models with different configurations
    const testModels = [
      {
        name: 'test-openrouter-free',
        displayName: 'OpenRouter Free Model',
        provider: 'openrouter',
        apiKey: process.env.OPENROUTER_API_KEY || 'your-openrouter-api-key-here',
        modelId: 'nousresearch/hermes-3-llama-3.1-405b:free', // More reliable free model
        maxTokens: 4000,
        temperature: 0.7,
        systemPrompt: 'You are a helpful AI assistant.',
        isActive: true,
        isDefault: true,
        description: 'Free OpenRouter model for testing',
        createdBy: dummyUserId,
      },
      {
        name: 'test-openai-gpt35',
        displayName: 'OpenAI GPT-3.5 Turbo',
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key-here',
        modelId: 'gpt-3.5-turbo',
        maxTokens: 4000,
        temperature: 0.7,
        systemPrompt: 'You are a helpful AI assistant.',
        isActive: false, // Disabled by default since it requires paid API
        isDefault: false,
        description: 'OpenAI GPT-3.5 Turbo (requires API key)',
        createdBy: dummyUserId,
      },
      {
        name: 'test-mock-model',
        displayName: 'Mock AI Model (Testing)',
        provider: 'custom',
        apiKey: 'mock-api-key',
        baseUrl: 'http://localhost:3000/mock-llm', // We'll create this endpoint
        modelId: 'mock-model',
        maxTokens: 2000,
        temperature: 0.5,
        systemPrompt: 'You are a mock AI assistant for testing purposes.',
        isActive: true,
        isDefault: false,
        description: 'Mock model for testing without external API calls',
        createdBy: dummyUserId,
      },
    ];

    // Create test models
    for (const modelData of testModels) {
      const model = new LLMModel(modelData);
      await model.save();
      console.log(`✅ Created test model: ${model.displayName}`);
    }

    console.log('\n🎉 Test models setup completed!');
    console.log('\nAvailable models:');
    
    const models = await LLMModel.find().select('name displayName provider isActive isDefault');
    models.forEach(model => {
      console.log(`  - ${model.displayName} (${model.provider}) ${model.isDefault ? '[DEFAULT]' : ''} ${model.isActive ? '[ACTIVE]' : '[INACTIVE]'}`);
    });

    console.log('\n📝 Next steps:');
    console.log('1. Add your real API keys to the .env file:');
    console.log('   OPENROUTER_API_KEY=your_actual_key');
    console.log('   OPENAI_API_KEY=your_actual_key');
    console.log('2. Update the API keys in the admin panel');
    console.log('3. Test the LLM chat interface');
    console.log('4. Check OpenRouter privacy settings: https://openrouter.ai/settings/privacy');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the setup
setupTestModels();
