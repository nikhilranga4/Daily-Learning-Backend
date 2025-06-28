// controllers/llmChatController.js
const llmChatService = require('../services/llmChatService');
const llmConfigService = require('../services/llmConfigService');
const LLMConversation = require('../models/LLMConversation');
const mongoose = require('mongoose');

// Get available LLM models for users
const getAvailableModels = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const models = await llmChatService.getAvailableModels(userId);

    res.json({
      success: true,
      data: models,
    });
  } catch (error) {
    console.error('Error fetching available models:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available models',
      error: error.message,
    });
  }
};

// Create new conversation
const createConversation = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { modelId, title } = req.body;

    if (!modelId) {
      return res.status(400).json({
        success: false,
        message: 'Model ID is required',
      });
    }

    const conversation = await llmChatService.createConversation(userId, modelId, title);

    res.status(201).json({
      success: true,
      message: 'Conversation created successfully',
      data: conversation,
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create conversation',
      error: error.message,
    });
  }
};

// Send message in conversation
const sendMessage = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { conversationId } = req.params;
    const { message, modelId } = req.body;

    console.log(`📨 Send message request:`, {
      userId,
      conversationId,
      messageLength: message?.length,
      modelId,
      hasModelId: !!modelId
    });

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required',
      });
    }

    const result = await llmChatService.sendMessage(conversationId, message.trim(), userId, modelId);

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: {
        conversation: result.conversation,
        response: result.response,
        tokens: result.tokens,
      },
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message,
    });
  }
};

// Get user conversations
const getUserConversations = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const conversations = await llmChatService.getUserConversations(
      userId,
      parseInt(page),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: conversations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: conversations.length,
      },
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations',
      error: error.message,
    });
  }
};

// Get specific conversation
const getConversation = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { conversationId } = req.params;

    const conversation = await llmChatService.getConversation(conversationId, userId);

    res.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(404).json({
      success: false,
      message: 'Conversation not found',
      error: error.message,
    });
  }
};

// Delete conversation
const deleteConversation = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { conversationId } = req.params;

    await llmChatService.deleteConversation(conversationId, userId);

    res.json({
      success: true,
      message: 'Conversation deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete conversation',
      error: error.message,
    });
  }
};

// Update conversation title
const updateConversationTitle = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { conversationId } = req.params;
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Title is required',
      });
    }

    const conversation = await LLMConversation.findOneAndUpdate(
      { _id: conversationId, userId },
      { title: title.trim() },
      { new: true }
    ).populate('llmModelId', 'name displayName provider');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    res.json({
      success: true,
      message: 'Conversation title updated successfully',
      data: conversation,
    });
  } catch (error) {
    console.error('Error updating conversation title:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update conversation title',
      error: error.message,
    });
  }
};

// Get conversation statistics for user
const getUserStats = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const totalConversations = await LLMConversation.countDocuments({ userId, isActive: true });
    const totalMessages = await LLMConversation.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), isActive: true } },
      { $project: { messageCount: { $size: '$messages' } } },
      { $group: { _id: null, total: { $sum: '$messageCount' } } },
    ]);

    const recentConversations = await LLMConversation.find({ userId, isActive: true })
      .sort({ lastMessageAt: -1 })
      .limit(5)
      .populate('llmModelId', 'name displayName')
      .select('title lastMessageAt llmModelId');

    res.json({
      success: true,
      data: {
        totalConversations,
        totalMessages: totalMessages[0]?.total || 0,
        recentConversations,
      },
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics',
      error: error.message,
    });
  }
};

// Get conversation history from Mega Drive
const getConversationHistory = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { conversationId } = req.params;

    // Get conversation from database first
    const conversation = await LLMConversation.findOne({
      _id: conversationId,
      userId,
    }).populate('llmModelId', 'name displayName provider');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    // Get all conversation files from Mega Drive
    const megaService = require('../services/megaService');
    const megaFiles = await megaService.listFiles(`user_${userId}/llm_conversations`);
    const conversationFiles = megaFiles
      .filter(file => file.name.includes(conversationId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const history = [];
    for (const file of conversationFiles) {
      try {
        const data = await megaService.downloadAsJSON(file.nodeId);
        history.push({
          fileId: file.nodeId,
          fileName: file.name,
          savedAt: data.metadata?.savedAt || file.createdAt,
          messageCount: data.messages?.length || 0,
          totalTokens: data.totalTokens || 0,
          version: data.metadata?.version || '1.0',
        });
      } catch (error) {
        console.warn(`Failed to load file ${file.name}:`, error.message);
      }
    }

    res.json({
      success: true,
      data: {
        conversation: {
          _id: conversation._id,
          title: conversation.title,
          llmModelId: conversation.llmModelId,
          createdAt: conversation.createdAt,
          lastMessageAt: conversation.lastMessageAt,
        },
        history,
      },
    });
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversation history',
      error: error.message,
    });
  }
};

// Restore conversation from a specific Mega Drive backup
const restoreConversation = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { conversationId, fileId } = req.params;

    // Verify conversation ownership
    const conversation = await LLMConversation.findOne({
      _id: conversationId,
      userId,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    // Load data from Mega Drive
    const megaService = require('../services/megaService');
    const backupData = await megaService.downloadAsJSON(fileId);

    // Update conversation with backup data
    conversation.messages = backupData.messages || [];
    conversation.totalTokens = backupData.totalTokens || 0;
    conversation.lastMessageAt = backupData.lastMessageAt || new Date();

    await conversation.save();

    res.json({
      success: true,
      message: 'Conversation restored successfully',
      data: conversation,
    });
  } catch (error) {
    console.error('Error restoring conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore conversation',
      error: error.message,
    });
  }
};

// Validate model availability
const validateModel = async (req, res) => {
  try {
    const { modelId } = req.params;

    console.log(`🔍 Validating model: ${modelId}`);

    const model = llmConfigService.getModelById(modelId);

    if (!model) {
      console.error(`❌ Model not found: ${modelId}`);
      return res.status(404).json({
        success: false,
        message: 'Model not found',
        modelId,
      });
    }

    if (!model.isActive) {
      console.error(`❌ Model inactive: ${model.displayName}`);
      return res.status(400).json({
        success: false,
        message: 'Model is not active',
        modelId,
      });
    }

    console.log(`✅ Model validated: ${model.displayName}`);

    res.json({
      success: true,
      data: {
        id: model.id,
        name: model.name,
        displayName: model.displayName,
        provider: model.provider,
        isActive: model.isActive,
        isDefault: model.isDefault,
      },
    });
  } catch (error) {
    console.error('Error validating model:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate model',
      error: error.message,
    });
  }
};

// Get public URL for a conversation
const getConversationPublicUrl = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id || req.user.id;

    console.log(`🔗 Getting public URL for conversation: ${conversationId}`);

    const publicUrl = await llmChatService.getConversationPublicUrl(conversationId, userId);

    if (publicUrl) {
      res.json({
        success: true,
        data: {
          conversationId,
          publicUrl,
        },
      });
    } else {
      res.json({
        success: false,
        message: 'Public URL not available for this conversation',
        data: {
          conversationId,
          publicUrl: null,
        },
      });
    }
  } catch (error) {
    console.error('Error getting conversation public URL:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversation public URL',
      error: error.message,
    });
  }
};

module.exports = {
  getAvailableModels,
  createConversation,
  sendMessage,
  getUserConversations,
  getConversation,
  deleteConversation,
  updateConversationTitle,
  getUserStats,
  getConversationHistory,
  restoreConversation,
  validateModel,
  getConversationPublicUrl,
};
