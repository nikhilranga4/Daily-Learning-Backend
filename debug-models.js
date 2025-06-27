// debug-models.js - Debug current models in database
require('dotenv').config();
const mongoose = require('mongoose');
const LLMModel = require('./models/LLMModel');
const LLMConversation = require('./models/LLMConversation');

async function debugModels() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get all models
    const allModels = await LLMModel.find();
    console.log('\n📋 ALL MODELS IN DATABASE:');
    allModels.forEach(model => {
      console.log(`ID: ${model._id}`);
      console.log(`Name: ${model.name}`);
      console.log(`Display: ${model.displayName}`);
      console.log(`Provider: ${model.provider}`);
      console.log(`Model ID: ${model.modelId}`);
      console.log(`Active: ${model.isActive}`);
      console.log(`Default: ${model.isDefault}`);
      console.log('---');
    });

    // Get active models
    const activeModels = await LLMModel.find({ isActive: true });
    console.log('\n✅ ACTIVE MODELS:');
    activeModels.forEach(model => {
      console.log(`- ${model.displayName} (${model._id})`);
    });

    // Get default model
    const defaultModel = await LLMModel.findOne({ isDefault: true });
    console.log('\n🌟 DEFAULT MODEL:');
    if (defaultModel) {
      console.log(`- ${defaultModel.displayName} (${defaultModel._id})`);
    } else {
      console.log('- No default model set!');
    }

    // Check conversations
    const conversations = await LLMConversation.find().populate('llmModelId');
    console.log('\n💬 EXISTING CONVERSATIONS:');
    conversations.forEach(conv => {
      console.log(`- ${conv.title} using ${conv.llmModelId?.displayName || 'UNKNOWN MODEL'}`);
    });

    // Test model lookup
    console.log('\n🔍 TESTING MODEL LOOKUP:');
    for (const model of activeModels) {
      const foundModel = await LLMModel.findById(model._id);
      console.log(`✅ Model ${model._id} lookup: ${foundModel ? 'SUCCESS' : 'FAILED'}`);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

debugModels();
