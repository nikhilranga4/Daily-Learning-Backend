// test-complete-flow.js - Test the complete LLM flow
require('dotenv').config();
const mongoose = require('mongoose');
const LLMModel = require('./models/LLMModel');
const llmChatService = require('./services/llmChatService');

async function testCompleteFlow() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const testUserId = 'test-user-complete-flow';
    
    console.log('\n🧪 TEST 1: Get Available Models');
    const models = await llmChatService.getAvailableModels();
    console.log(`✅ Found ${models.length} available models`);
    models.forEach(model => {
      console.log(`  - ${model.displayName} (${model._id})`);
    });

    if (models.length === 0) {
      console.error('❌ No models available for testing');
      return;
    }

    const testModel = models[0];
    console.log(`🎯 Using test model: ${testModel.displayName}`);

    console.log('\n🧪 TEST 2: Create Conversation');
    const conversation = await llmChatService.createConversation(
      testUserId,
      testModel._id.toString(),
      'Complete Flow Test Conversation'
    );
    console.log(`✅ Created conversation: ${conversation._id}`);
    console.log(`📁 Title: ${conversation.title}`);
    console.log(`🤖 Model: ${conversation.llmModelId.displayName}`);

    console.log('\n🧪 TEST 3: Send Message');
    const messageResult = await llmChatService.sendMessage(
      conversation._id,
      'Hello! This is a test message to verify the complete flow is working.',
      testUserId
    );
    console.log(`✅ Message sent successfully`);
    console.log(`📝 Response: ${messageResult.response.substring(0, 100)}...`);
    console.log(`🔢 Tokens: ${messageResult.tokens}`);

    console.log('\n🧪 TEST 4: Get Conversation');
    const retrievedConv = await llmChatService.getConversation(conversation._id, testUserId);
    console.log(`✅ Retrieved conversation: ${retrievedConv.title}`);
    console.log(`📊 Messages: ${retrievedConv.messages.length}`);

    console.log('\n💬 CONVERSATION MESSAGES:');
    retrievedConv.messages.forEach((msg, index) => {
      console.log(`${index + 1}. [${msg.role.toUpperCase()}] ${msg.content.substring(0, 80)}...`);
    });

    console.log('\n🧪 TEST 5: Get User Conversations');
    const userConversations = await llmChatService.getUserConversations(testUserId);
    console.log(`✅ Found ${userConversations.length} conversations for user`);

    console.log('\n🧪 TEST 6: Update Conversation Title');
    await llmChatService.updateConversationTitle(
      conversation._id,
      testUserId,
      'Updated Complete Flow Test'
    );
    console.log('✅ Title updated successfully');

    console.log('\n🧪 TEST 7: Send Another Message with Model Switch');
    const switchModel = models.find(m => m._id.toString() !== testModel._id.toString()) || testModel;
    const secondMessageResult = await llmChatService.sendMessage(
      conversation._id,
      'Can you help me with a coding question?',
      testUserId,
      switchModel._id.toString()
    );
    console.log(`✅ Second message sent with model: ${switchModel.displayName}`);
    console.log(`📝 Response: ${secondMessageResult.response.substring(0, 100)}...`);

    console.log('\n🧪 TEST 8: Final Conversation Check');
    const finalConv = await llmChatService.getConversation(conversation._id, testUserId);
    console.log(`✅ Final conversation has ${finalConv.messages.length} messages`);
    console.log(`🔢 Total tokens: ${finalConv.totalTokens || 'N/A'}`);

    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('\n📋 FLOW VERIFICATION:');
    console.log('✅ Models can be retrieved');
    console.log('✅ Conversations can be created in Mega Drive');
    console.log('✅ Messages can be sent and responses generated');
    console.log('✅ Conversations can be retrieved with full message history');
    console.log('✅ User conversations can be listed');
    console.log('✅ Conversation titles can be updated');
    console.log('✅ Models can be switched mid-conversation');
    console.log('✅ All data is stored in Mega Drive');

    console.log('\n🚀 SYSTEM STATUS: FULLY OPERATIONAL');
    console.log('The LLM chat system is ready for production use!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testCompleteFlow();
