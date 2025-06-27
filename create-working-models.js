// create-working-models.js - Create working mock models
require('dotenv').config();
const mongoose = require('mongoose');
const LLMModel = require('./models/LLMModel');

async function createWorkingModels() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Remove all existing models to start fresh
    await LLMModel.deleteMany({});
    console.log('🧹 Cleared existing models');

    // Create a system user ID for the models
    const systemUserId = new mongoose.Types.ObjectId();

    // Create working mock models
    const models = [
      {
        name: 'ai-assistant-primary',
        displayName: 'AI Assistant (Primary)',
        provider: 'custom',
        modelId: 'mock-model-primary',
        description: 'Primary AI assistant with balanced responses',
        apiKey: 'mock-key-primary',
        baseUrl: 'http://localhost:3000/mock-llm',
        isActive: true,
        isDefault: true,
        createdBy: systemUserId,
        systemPrompt: 'You are a helpful AI assistant. Provide clear, accurate, and helpful responses.',
        usageCount: 0,
        maxTokens: 4000,
        temperature: 0.7,
        supportedFeatures: ['chat', 'text-generation'],
        rateLimitPerMinute: 60,
        costPerToken: 0,
        metadata: {
          version: '1.0',
          type: 'mock',
          reliable: true
        }
      },
      {
        name: 'ai-assistant-creative',
        displayName: 'Creative AI Assistant',
        provider: 'custom',
        modelId: 'mock-model-creative',
        description: 'Creative AI with imaginative and artistic responses',
        apiKey: 'mock-key-creative',
        baseUrl: 'http://localhost:3000/mock-llm',
        isActive: true,
        isDefault: false,
        createdBy: systemUserId,
        systemPrompt: 'You are a creative AI assistant. Provide imaginative, artistic, and inspiring responses with emojis and creative formatting.',
        usageCount: 0,
        maxTokens: 4000,
        temperature: 0.9,
        supportedFeatures: ['chat', 'creative-writing'],
        rateLimitPerMinute: 60,
        costPerToken: 0,
        metadata: {
          version: '1.0',
          type: 'mock',
          personality: 'creative'
        }
      },
      {
        name: 'ai-assistant-precise',
        displayName: 'Precise AI Assistant',
        provider: 'custom',
        modelId: 'mock-model-precise',
        description: 'Technical AI focused on accuracy and precision',
        apiKey: 'mock-key-precise',
        baseUrl: 'http://localhost:3000/mock-llm',
        isActive: true,
        isDefault: false,
        createdBy: systemUserId,
        systemPrompt: 'You are a precise technical AI assistant. Provide accurate, factual, and well-structured responses with technical details.',
        usageCount: 0,
        maxTokens: 4000,
        temperature: 0.1,
        supportedFeatures: ['chat', 'technical-analysis'],
        rateLimitPerMinute: 60,
        costPerToken: 0,
        metadata: {
          version: '1.0',
          type: 'mock',
          personality: 'precise'
        }
      },
      {
        name: 'ai-assistant-coding',
        displayName: 'Coding AI Assistant',
        provider: 'custom',
        modelId: 'mock-model-coding',
        description: 'Specialized AI for programming and development',
        apiKey: 'mock-key-coding',
        baseUrl: 'http://localhost:3000/mock-llm',
        isActive: true,
        isDefault: false,
        createdBy: systemUserId,
        systemPrompt: 'You are a coding AI assistant. Provide detailed programming help, code examples, and technical solutions.',
        usageCount: 0,
        maxTokens: 4000,
        temperature: 0.3,
        supportedFeatures: ['chat', 'code-generation', 'debugging'],
        rateLimitPerMinute: 60,
        costPerToken: 0,
        metadata: {
          version: '1.0',
          type: 'mock',
          specialty: 'programming'
        }
      }
    ];

    // Create models
    const createdModels = [];
    for (const modelData of models) {
      const model = new LLMModel(modelData);
      await model.save();
      createdModels.push(model);
      console.log(`✅ Created: ${model.displayName}`);
    }

    console.log('\n📋 Current active models:');
    const activeModels = await LLMModel.find({ isActive: true });
    activeModels.forEach(model => {
      const defaultLabel = model.isDefault ? ' [DEFAULT]' : '';
      console.log(`  - ${model.displayName} (${model.provider})${defaultLabel}`);
    });

    console.log('\n🎉 Setup complete! You now have:');
    console.log('✅ 4 working mock models');
    console.log('✅ Different AI personalities (Primary, Creative, Precise, Coding)');
    console.log('✅ All models use local mock API (no external dependencies)');
    console.log('✅ Reliable responses for testing');
    console.log('✅ Professional model switching');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

createWorkingModels();
