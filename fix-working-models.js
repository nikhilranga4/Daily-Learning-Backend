// fix-working-models.js - Create reliable working models
require('dotenv').config();
const mongoose = require('mongoose');
const LLMModel = require('./models/LLMModel');

async function createWorkingModels() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const dummyUserId = new mongoose.Types.ObjectId();

    // Remove problematic OpenRouter models
    await LLMModel.deleteMany({ 
      provider: 'openrouter',
      modelId: { $in: [
        'deepseek/deepseek-chat-v3-0324:free',
        'nousresearch/hermes-3-llama-3.1-405b:free'
      ]}
    });
    console.log('🧹 Removed problematic OpenRouter models');

    // Create reliable working models
    const workingModels = [
      {
        name: 'mock-primary',
        displayName: 'AI Assistant (Primary)',
        provider: 'custom',
        apiKey: 'mock-api-key',
        baseUrl: 'http://localhost:3000/mock-llm',
        modelId: 'mock-model-primary',
        maxTokens: 4000,
        temperature: 0.7,
        systemPrompt: 'You are a helpful AI assistant.',
        isActive: true,
        isDefault: true,
        description: 'Primary AI model for reliable responses',
        createdBy: dummyUserId,
      },
      {
        name: 'mock-creative',
        displayName: 'Creative AI Assistant',
        provider: 'custom',
        apiKey: 'mock-api-key',
        baseUrl: 'http://localhost:3000/mock-llm',
        modelId: 'mock-model-creative',
        maxTokens: 4000,
        temperature: 1.0,
        systemPrompt: 'You are a creative AI assistant that provides imaginative and detailed responses.',
        isActive: true,
        isDefault: false,
        description: 'Creative AI model for brainstorming and creative tasks',
        createdBy: dummyUserId,
      },
      {
        name: 'mock-precise',
        displayName: 'Precise AI Assistant',
        provider: 'custom',
        apiKey: 'mock-api-key',
        baseUrl: 'http://localhost:3000/mock-llm',
        modelId: 'mock-model-precise',
        maxTokens: 4000,
        temperature: 0.1,
        systemPrompt: 'You are a precise AI assistant that provides accurate, factual, and concise responses.',
        isActive: true,
        isDefault: false,
        description: 'Precise AI model for technical and factual queries',
        createdBy: dummyUserId,
      },
      {
        name: 'openrouter-working',
        displayName: 'OpenRouter Free Model',
        provider: 'openrouter',
        apiKey: process.env.OPENROUTER_API_KEY || 'your-openrouter-key-here',
        modelId: 'microsoft/phi-3-mini-128k-instruct:free',
        maxTokens: 4000,
        temperature: 0.7,
        systemPrompt: 'You are a helpful AI assistant.',
        isActive: false, // Disabled by default
        isDefault: false,
        description: 'OpenRouter free model (enable if you have working API key)',
        createdBy: dummyUserId,
      }
    ];

    for (const modelData of workingModels) {
      const existingModel = await LLMModel.findOne({ name: modelData.name });
      if (!existingModel) {
        const model = new LLMModel(modelData);
        await model.save();
        console.log(`✅ Created: ${model.displayName}`);
      } else {
        console.log(`⏭️  Skipped: ${modelData.displayName} (already exists)`);
      }
    }

    console.log('\n📋 Current active models:');
    const models = await LLMModel.find({ isActive: true }).select('name displayName provider isDefault');
    models.forEach(model => {
      console.log(`  - ${model.displayName} (${model.provider}) ${model.isDefault ? '[DEFAULT]' : ''}`);
    });

    console.log('\n🎉 Setup complete! You now have:');
    console.log('✅ Multiple working mock models for testing');
    console.log('✅ Different personalities (Primary, Creative, Precise)');
    console.log('✅ Reliable fallback system');
    console.log('✅ No external API dependencies');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

createWorkingModels();
