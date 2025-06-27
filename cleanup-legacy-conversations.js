// cleanup-legacy-conversations.js - Clean up broken MongoDB conversations
require('dotenv').config();
const mongoose = require('mongoose');
const LLMModel = require('./models/LLMModel');
const LLMConversation = require('./models/LLMConversation');

async function cleanupLegacyConversations() {
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

    // Find all conversations
    const allConversations = await LLMConversation.find();
    console.log(`📊 Found ${allConversations.length} conversations in MongoDB`);

    let fixedCount = 0;
    let deletedCount = 0;

    for (const conv of allConversations) {
      try {
        // Try to populate the model
        await conv.populate('llmModelId');
        
        if (!conv.llmModelId) {
          console.log(`🔧 Fixing conversation with missing model: ${conv.title}`);
          conv.llmModelId = defaultModel._id;
          await conv.save();
          fixedCount++;
        } else if (!conv.llmModelId.isActive) {
          console.log(`🔧 Fixing conversation with inactive model: ${conv.title}`);
          conv.llmModelId = defaultModel._id;
          await conv.save();
          fixedCount++;
        } else {
          console.log(`✅ Valid conversation: ${conv.title} (${conv.llmModelId.displayName})`);
        }
      } catch (error) {
        console.log(`❌ Deleting corrupted conversation: ${conv.title || 'Untitled'}`);
        await LLMConversation.findByIdAndDelete(conv._id);
        deletedCount++;
      }
    }

    console.log('\n📋 CLEANUP SUMMARY:');
    console.log(`✅ Fixed conversations: ${fixedCount}`);
    console.log(`🗑️  Deleted corrupted conversations: ${deletedCount}`);

    // Verify all conversations now have valid models
    const verifyConversations = await LLMConversation.find().populate('llmModelId');
    console.log('\n✅ VERIFIED CONVERSATIONS:');
    verifyConversations.forEach(conv => {
      console.log(`- ${conv.title} using ${conv.llmModelId?.displayName || 'STILL BROKEN'}`);
    });

    if (verifyConversations.length === 0) {
      console.log('\n🎉 All legacy conversations cleaned up!');
      console.log('💡 New conversations will be created in Mega Drive automatically.');
    } else {
      console.log('\n⚠️  Some conversations remain in MongoDB.');
      console.log('💡 They will be migrated to Mega Drive when accessed.');
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

cleanupLegacyConversations();
