// fix-conversations.js - Fix broken conversations
require('dotenv').config();
const mongoose = require('mongoose');
const LLMModel = require('./models/LLMModel');
const LLMConversation = require('./models/LLMConversation');

async function fixConversations() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get default model
    const defaultModel = await LLMModel.findOne({ isDefault: true, isActive: true });
    if (!defaultModel) {
      console.error('❌ No default model found!');
      return;
    }

    console.log(`🌟 Using default model: ${defaultModel.displayName}`);

    // Find conversations with broken model references
    const brokenConversations = await LLMConversation.find({
      $or: [
        { llmModelId: null },
        { llmModelId: { $exists: false } }
      ]
    });

    console.log(`🔍 Found ${brokenConversations.length} conversations with broken model references`);

    // Fix broken conversations
    for (const conv of brokenConversations) {
      conv.llmModelId = defaultModel._id;
      await conv.save();
      console.log(`✅ Fixed conversation: ${conv.title}`);
    }

    // Check for conversations with invalid model IDs
    const allConversations = await LLMConversation.find();
    for (const conv of allConversations) {
      try {
        const model = await LLMModel.findById(conv.llmModelId);
        if (!model) {
          console.log(`🔧 Fixing conversation with invalid model ID: ${conv.title}`);
          conv.llmModelId = defaultModel._id;
          await conv.save();
        }
      } catch (error) {
        console.log(`🔧 Fixing conversation with corrupted model ID: ${conv.title}`);
        conv.llmModelId = defaultModel._id;
        await conv.save();
      }
    }

    // Verify all conversations now have valid models
    const verifyConversations = await LLMConversation.find().populate('llmModelId');
    console.log('\n✅ VERIFIED CONVERSATIONS:');
    verifyConversations.forEach(conv => {
      console.log(`- ${conv.title} using ${conv.llmModelId?.displayName || 'STILL BROKEN'}`);
    });

    console.log('\n🎉 All conversations fixed!');

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixConversations();
