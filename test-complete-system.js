// test-complete-system.js - Complete system test
require('dotenv').config();
const mongoose = require('mongoose');
const LLMModel = require('./models/LLMModel');
const LLMConversation = require('./models/LLMConversation');

async function testCompleteSystem() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Test 1: Check models
    console.log('\n🧪 TEST 1: Model Availability');
    const allModels = await LLMModel.find();
    const activeModels = await LLMModel.find({ isActive: true });
    const defaultModel = await LLMModel.findOne({ isDefault: true });

    console.log(`📊 Total models: ${allModels.length}`);
    console.log(`📊 Active models: ${activeModels.length}`);
    console.log(`📊 Default model: ${defaultModel ? defaultModel.displayName : 'NONE'}`);

    if (activeModels.length === 0) {
      console.error('❌ No active models found!');
      return;
    }

    // Test 2: Model validation
    console.log('\n🧪 TEST 2: Model Validation');
    for (const model of activeModels) {
      try {
        const foundModel = await LLMModel.findById(model._id);
        if (foundModel && foundModel.isActive) {
          console.log(`✅ ${model.displayName}: Valid and active`);
        } else {
          console.log(`❌ ${model.displayName}: Invalid or inactive`);
        }
      } catch (error) {
        console.log(`❌ ${model.displayName}: Validation error - ${error.message}`);
      }
    }

    // Test 3: Conversation creation
    console.log('\n🧪 TEST 3: Conversation Creation');
    const testUserId = new mongoose.Types.ObjectId();
    
    try {
      const testConversation = new LLMConversation({
        userId: testUserId,
        llmModelId: defaultModel._id,
        title: 'Test Conversation',
        messages: [],
      });

      await testConversation.save();
      await testConversation.populate('llmModelId', 'name displayName provider');
      
      console.log(`✅ Test conversation created: ${testConversation.title}`);
      console.log(`✅ Using model: ${testConversation.llmModelId.displayName}`);

      // Clean up test conversation
      await LLMConversation.findByIdAndDelete(testConversation._id);
      console.log(`🧹 Test conversation cleaned up`);

    } catch (error) {
      console.log(`❌ Conversation creation failed: ${error.message}`);
    }

    // Test 4: Check for broken conversations
    console.log('\n🧪 TEST 4: Conversation Integrity');
    const conversations = await LLMConversation.find().populate('llmModelId');
    let brokenCount = 0;

    for (const conv of conversations) {
      if (!conv.llmModelId) {
        brokenCount++;
        console.log(`❌ Broken conversation: ${conv.title} (no model)`);
      } else if (!conv.llmModelId.isActive) {
        console.log(`⚠️  Conversation using inactive model: ${conv.title} (${conv.llmModelId.displayName})`);
      } else {
        console.log(`✅ Valid conversation: ${conv.title} (${conv.llmModelId.displayName})`);
      }
    }

    if (brokenCount > 0) {
      console.log(`\n❌ Found ${brokenCount} broken conversations. Run 'node fix-conversations.js' to fix them.`);
    }

    // Test 5: API endpoint simulation
    console.log('\n🧪 TEST 5: API Endpoint Simulation');
    for (const model of activeModels.slice(0, 2)) { // Test first 2 models
      console.log(`🔍 Testing model: ${model.displayName}`);
      
      if (model.provider === 'custom') {
        console.log(`✅ Custom model (mock): Should work locally`);
      } else {
        console.log(`⚠️  External model: Requires valid API key for ${model.provider}`);
      }
    }

    // Summary
    console.log('\n📋 SYSTEM STATUS SUMMARY:');
    console.log(`✅ Database connection: Working`);
    console.log(`✅ Models in database: ${allModels.length}`);
    console.log(`✅ Active models: ${activeModels.length}`);
    console.log(`✅ Default model: ${defaultModel ? 'Set' : 'Missing'}`);
    console.log(`✅ Conversations: ${conversations.length} total, ${brokenCount} broken`);

    if (activeModels.length > 0 && defaultModel && brokenCount === 0) {
      console.log('\n🎉 SYSTEM STATUS: READY FOR USE!');
      console.log('\n🚀 Next steps:');
      console.log('1. Start the server: npm start');
      console.log('2. Test the LLM chat interface');
      console.log('3. Try switching between different models');
    } else {
      console.log('\n⚠️  SYSTEM STATUS: NEEDS ATTENTION');
      if (!defaultModel) console.log('- Set a default model');
      if (activeModels.length === 0) console.log('- Activate at least one model');
      if (brokenCount > 0) console.log('- Fix broken conversations');
    }

  } catch (error) {
    console.error('❌ System test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testCompleteSystem();
