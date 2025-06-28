// services/llmChatService.js
const axios = require('axios');
const llmConfigService = require('./llmConfigService');
const megaService = require('./megaService');
const megaConversationService = require('./megaConversationService');

class LLMChatService {
  constructor() {
    this.providerConfigs = {
      openai: {
        baseUrl: 'https://api.openai.com/v1',
        headers: (apiKey) => ({
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        }),
      },
      anthropic: {
        baseUrl: 'https://api.anthropic.com/v1',
        headers: (apiKey) => ({
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        }),
      },
      openrouter: {
        baseUrl: 'https://openrouter.ai/api/v1',
        headers: (apiKey) => ({
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        }),
      },
      deepseek: {
        baseUrl: 'https://api.deepseek.com/v1',
        headers: (apiKey) => ({
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        }),
      },
      gemini: {
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        headers: () => ({
          'Content-Type': 'application/json',
        }),
      },
    };
  }

  async getAvailableModels() {
    try {
      const models = llmConfigService.getAllModelsForFrontend();
      return models;
    } catch (error) {
      console.error('Error fetching available models:', error);
      throw new Error('Failed to fetch available models');
    }
  }

  async createConversation(userId, modelId, title = 'New Conversation') {
    try {
      console.log(`🔍 Creating conversation with modelId: ${modelId}`);

      // If no modelId provided, try to get the default model
      if (!modelId || modelId === '') {
        console.log('🔍 No modelId provided, looking for default model');
        const defaultModel = llmConfigService.getDefaultModel();
        if (!defaultModel) {
          throw new Error('No active LLM models available. Please contact administrator.');
        }
        modelId = defaultModel.id;
        console.log(`✅ Using default model: ${defaultModel.displayName}`);
      }

      // Validate the model
      const model = llmConfigService.validateModel(modelId);
      console.log(`✅ Model validated: ${model.displayName}`);

      console.log(`✅ Creating conversation with model: ${model.displayName}`);

      // Create conversation in Mega Drive instead of MongoDB
      const userIdString = userId.toString();
      const conversation = await megaConversationService.createConversation(userIdString, modelId, title);

      // Format for compatibility with existing code
      const formattedConversation = {
        _id: conversation.id,
        userId: conversation.userId,
        title: conversation.title,
        messages: conversation.messages,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        llmModelId: {
          _id: model.id,
          name: model.name,
          displayName: model.displayName,
          provider: model.provider
        }
      };

      console.log(`✅ Conversation created in Mega Drive: ${conversation.id}`);
      return formattedConversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  async sendMessage(conversationId, userMessage, userId, newModelId = null) {
    try {
      console.log(`🔍 Processing message for conversation: ${conversationId}`);

      // Try to get conversation from Mega Drive first
      let conversation;
      let actualConversationId = conversationId;

      // Ensure userId is a string for consistency
      const userIdString = userId.toString();

      try {
        conversation = await megaConversationService.getConversation(conversationId, userIdString);
        console.log(`✅ Found conversation in Mega Drive: ${conversation.id}`);
      } catch (error) {
        console.log(`⚠️  Conversation not found in Mega Drive, checking MongoDB: ${error.message}`);

        // Try to get from MongoDB (legacy conversations) - only if conversationId is a valid ObjectId
        const LLMConversation = require('../models/LLMConversation');
        const mongoose = require('mongoose');
        let legacyConv = null;

        if (mongoose.Types.ObjectId.isValid(conversationId)) {
          try {
            legacyConv = await LLMConversation.findOne({
              _id: conversationId,
              userId,
            }).populate('llmModelId');
          } catch (error) {
            console.log(`⚠️  Failed to query MongoDB for conversation: ${error.message}`);
          }
        } else {
          console.log(`⚠️  Conversation ID ${conversationId} is not a valid MongoDB ObjectId, skipping legacy lookup`);
        }

        if (legacyConv) {
          console.log(`🔄 Found legacy conversation in MongoDB, migrating to Mega Drive`);

          // Find a compatible model for migration
          let migrationModelId = newModelId;
          if (!migrationModelId) {
            // Try to find a model that matches the legacy model's provider
            const legacyProvider = legacyConv.llmModelId?.provider;
            const compatibleModel = llmConfigService.getModelsByProvider(legacyProvider)[0] ||
                                   llmConfigService.getDefaultModel();
            migrationModelId = compatibleModel?.id;
          }

          if (!migrationModelId) {
            throw new Error('No compatible model found for conversation migration');
          }

          conversation = await megaConversationService.createConversation(
            userIdString,
            migrationModelId,
            legacyConv.title
          );

          // Update the conversation ID to use the new Mega Drive ID
          actualConversationId = conversation.id;

          // Migrate existing messages
          for (const msg of legacyConv.messages) {
            await megaConversationService.addMessage(
              conversation.id,
              msg.role,
              msg.content,
              msg.tokens || 0
            );
          }

          console.log(`✅ Migrated conversation to Mega Drive: ${conversation.id}`);
        } else {
          throw new Error('Conversation not found in either Mega Drive or MongoDB');
        }
      }

      // Get model information
      let modelId = newModelId || conversation.modelId;
      let model = llmConfigService.getModelById(modelId);

      if (!model) {
        console.error(`❌ Model not found: ${modelId}`);
        throw new Error(`Model with ID ${modelId} not found`);
      }

      // If a new model is specified, use it and update the conversation
      if (newModelId && newModelId !== modelId) {
        console.log(`🔍 Attempting to switch to model: ${newModelId}`);

        try {
          const newModel = llmConfigService.validateModel(newModelId);

          // Update conversation to use new model
          conversation.modelId = newModelId;
          model = newModel;
          modelId = newModelId;

          console.log(`🔄 Conversation ${conversationId} model changed to ${model.displayName}`);
        } catch (error) {
          console.error(`❌ Model validation failed:`, error.message);

          // Try to fall back to default model
          const fallbackModel = llmConfigService.getDefaultModel();
          if (fallbackModel && fallbackModel.id !== modelId) {
            console.log(`🔄 Falling back to default model: ${fallbackModel.displayName}`);
            conversation.modelId = fallbackModel.id;
            model = fallbackModel;
            modelId = fallbackModel.id;
          } else {
            throw new Error(`Model validation failed: ${error.message}`);
          }
        }
      }

      if (!model || !model.isActive) {
        throw new Error('LLM model is not available');
      }

      // Add user message to conversation (cache only, don't save yet)
      await megaConversationService.addMessage(actualConversationId, 'user', userMessage, 0, false);

      // Get updated conversation
      const updatedConversation = await megaConversationService.getConversation(actualConversationId, userIdString);

      // Prepare messages for API call
      const messages = this.prepareMessages(updatedConversation.messages, model.systemPrompt);

      // Call LLM API with fallback mechanism
      let response;
      try {
        response = await this.callLLMAPI(model, messages);
      } catch (apiError) {
        console.warn(`Primary model ${model.displayName} failed:`, apiError.message);

        // Try to find a fallback model (prefer OpenRouter models)
        const openrouterModels = llmConfigService.getModelsByProvider('openrouter');
        const fallbackModel = openrouterModels.find(m => m.id !== model.id) ||
                             llmConfigService.getModelsByProvider('custom').find(m => m.id !== model.id);

        if (fallbackModel) {
          console.log(`🔄 Trying fallback model: ${fallbackModel.displayName}`);
          try {
            response = await this.callLLMAPI(fallbackModel, messages);

            // Update conversation to use fallback model
            conversation.modelId = fallbackModel.id;
            model = fallbackModel;

            console.log(`✅ Successfully used fallback model: ${fallbackModel.displayName}`);
          } catch (fallbackError) {
            console.error('Fallback model also failed:', fallbackError.message);
            throw apiError; // Throw original error
          }
        } else {
          throw apiError; // No fallback available
        }
      }

      // Add assistant response to conversation in Mega Drive
      await megaConversationService.addMessage(actualConversationId, 'assistant', response.content, response.tokens || 0);

      // Note: Model usage tracking is no longer needed since models are environment-based

      // Get final updated conversation from cache/Mega Drive
      const finalConversation = await megaConversationService.getConversation(actualConversationId, userIdString);

      // Add model information for compatibility
      finalConversation.llmModelId = {
        _id: model.id,
        name: model.name,
        displayName: model.displayName,
        provider: model.provider
      };

      // Ensure the conversation has the correct ID format for frontend compatibility
      finalConversation._id = actualConversationId;

      return {
        conversation: finalConversation,
        response: response.content,
        tokens: response.tokens,
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  prepareMessages(conversationMessages, systemPrompt) {
    const messages = [];

    // Add system prompt if provided
    if (systemPrompt && systemPrompt.trim()) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    // Add conversation messages (limit to last 20 to avoid token limits)
    const recentMessages = conversationMessages.slice(-20);
    messages.push(...recentMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
    })));

    return messages;
  }

  async callLLMAPI(model, messages) {
    try {
      const config = this.providerConfigs[model.provider];
      if (!config && !model.baseUrl) {
        throw new Error(`Unsupported provider: ${model.provider}`);
      }

      const baseUrl = model.baseUrl || config.baseUrl;
      const headers = config ? config.headers(model.apiKey) : {
        'Authorization': `Bearer ${model.apiKey}`,
        'Content-Type': 'application/json',
      };

      let requestData;
      let endpoint;

      // Handle different provider formats
      switch (model.provider) {
        case 'anthropic':
          endpoint = `${baseUrl}/messages`;
          requestData = {
            model: model.modelId,
            max_tokens: model.maxTokens,
            temperature: model.temperature,
            messages: messages.filter(m => m.role !== 'system'),
            system: messages.find(m => m.role === 'system')?.content,
          };
          break;

        case 'gemini':
          endpoint = `${baseUrl}/models/${model.modelId}:generateContent?key=${model.apiKey}`;
          requestData = {
            contents: messages.map(m => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }],
            })),
            generationConfig: {
              temperature: model.temperature,
              maxOutputTokens: model.maxTokens,
            },
          };
          break;

        default: // OpenAI-compatible APIs
          endpoint = `${baseUrl}/chat/completions`;
          requestData = {
            model: model.modelId,
            messages,
            max_tokens: model.maxTokens,
            temperature: model.temperature,
          };
          break;
      }

      console.log(`🤖 Calling ${model.provider} API:`, {
        model: model.modelId,
        messageCount: messages.length,
        maxTokens: model.maxTokens,
        temperature: model.temperature,
      });

      console.log('📤 Request data:', JSON.stringify(requestData, null, 2));

      const response = await axios.post(endpoint, requestData, { headers });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response data:', JSON.stringify(response.data, null, 2));

      // Parse response based on provider
      let content, tokens;
      switch (model.provider) {
        case 'anthropic':
          content = response.data.content[0].text;
          tokens = response.data.usage?.output_tokens || 0;
          break;

        case 'gemini':
          content = response.data.candidates[0].content.parts[0].text;
          tokens = response.data.usageMetadata?.candidatesTokenCount || 0;
          break;

        default: // OpenAI-compatible
          content = response.data.choices[0].message.content;
          tokens = response.data.usage?.completion_tokens || 0;
          break;
      }

      return { content, tokens };
    } catch (error) {
      console.error('LLM API Error:', error.response?.data || error.message);

      // Handle specific error types
      const errorData = error.response?.data;
      let errorMessage = 'LLM API call failed';

      if (errorData?.error?.message) {
        const apiError = errorData.error.message;

        if (apiError.includes('data policy')) {
          errorMessage = 'Model requires data policy configuration. Please check your OpenRouter privacy settings or try a different model.';
        } else if (apiError.includes('insufficient credits') || apiError.includes('quota')) {
          errorMessage = 'API quota exceeded. Please check your API credits or try a different model.';
        } else if (apiError.includes('invalid model') || apiError.includes('not found')) {
          errorMessage = 'The selected model is not available. Please try a different model.';
        } else if (apiError.includes('authentication') || apiError.includes('unauthorized')) {
          errorMessage = 'API authentication failed. Please check your API key configuration.';
        } else {
          errorMessage = `API Error: ${apiError}`;
        }
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        errorMessage = 'Unable to connect to the AI service. Please try again later.';
      } else {
        errorMessage = `Connection error: ${error.message}`;
      }

      throw new Error(errorMessage);
    }
  }

  async saveToMegaDrive(conversation, userId) {
    try {
      // Create a comprehensive conversation file
      const conversationData = {
        id: conversation._id,
        userId: userId,
        title: conversation.title,
        model: {
          id: conversation.llmModelId._id,
          name: conversation.llmModelId.name,
          displayName: conversation.llmModelId.displayName,
          provider: conversation.llmModelId.provider,
        },
        createdAt: conversation.createdAt,
        updatedAt: new Date().toISOString(),
        lastMessageAt: conversation.lastMessageAt,
        totalTokens: conversation.totalTokens,
        isActive: conversation.isActive,
        messages: conversation.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          tokens: msg.tokens || 0,
        })),
        metadata: {
          messageCount: conversation.messages.length,
          savedAt: new Date().toISOString(),
          version: '1.0',
        },
      };

      const fileName = `llm_conversation_${conversation._id}_${Date.now()}.json`;
      const fileContent = JSON.stringify(conversationData, null, 2);

      // Upload to Mega Drive
      const fileBuffer = Buffer.from(fileContent, 'utf8');
      const megaFileId = await megaService.uploadBuffer(
        fileBuffer,
        fileName,
        `user_${userId}/llm_conversations`
      );

      // Update conversation with Mega Drive file ID if this is the first save
      if (megaFileId && !conversation.megaDriveFolderId) {
        conversation.megaDriveFolderId = megaFileId;
        await conversation.save();
      }

      console.log(`✅ Conversation ${conversation._id} saved to Mega Drive: ${fileName}`);
      return megaFileId;
    } catch (error) {
      console.error('Error saving to Mega Drive:', error);
      // Don't throw error here as it's not critical for the main functionality
      return null;
    }
  }

  async getUserConversations(userId, page = 1, limit = 20) {
    try {
      // Get conversations from Mega Drive
      const userIdString = userId.toString();
      const conversations = await megaConversationService.getUserConversations(userIdString, page, limit);

      // Enrich with model information
      const enrichedConversations = conversations.map((conv) => {
        try {
          const model = llmConfigService.getModelById(conv.modelId);
          if (model) {
            return {
              _id: conv.id,
              title: conv.title,
              llmModelId: {
                _id: model.id,
                name: model.name,
                displayName: model.displayName,
                provider: model.provider
              },
              createdAt: conv.createdAt,
              updatedAt: conv.updatedAt,
              lastMessageAt: conv.lastMessageAt,
              messageCount: conv.messageCount,
              totalTokens: conv.totalTokens,
              isActive: conv.isActive,
              messages: [] // Don't load full messages for list view
            };
          } else {
            console.warn(`Model not found for conversation ${conv.id}: ${conv.modelId}`);
            return null;
          }
        } catch (error) {
          console.warn(`Failed to enrich conversation ${conv.id}:`, error.message);
          return null;
        }
      });

      // Filter out null entries
      return enrichedConversations.filter(conv => conv !== null);
    } catch (error) {
      console.error('Error fetching user conversations:', error);
      // Return empty array instead of throwing to gracefully handle Mega Drive issues
      return [];
    }
  }

  async getConversation(conversationId, userId) {
    try {
      // Get conversation from Mega Drive
      const userIdString = userId.toString();
      const conversation = await megaConversationService.getConversation(conversationId, userIdString);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Get model information
      const model = llmConfigService.getModelById(conversation.modelId);
      if (!model) {
        throw new Error('Model not found for this conversation');
      }

      // Format for compatibility with existing code
      const formattedConversation = {
        _id: conversation.id,
        userId: conversation.userId,
        title: conversation.title,
        messages: conversation.messages,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        lastMessageAt: conversation.lastMessageAt,
        totalTokens: conversation.totalTokens,
        isActive: conversation.isActive,
        llmModelId: {
          _id: model.id,
          name: model.name,
          displayName: model.displayName,
          provider: model.provider
        }
      };

      return formattedConversation;
    } catch (error) {
      console.error('Error fetching conversation:', error);
      throw error;
    }
  }

  async deleteConversation(conversationId, userId) {
    try {
      const userIdString = userId.toString();
      const conversation = await megaConversationService.deleteConversation(conversationId, userIdString);

      // Format for compatibility
      return {
        _id: conversation.id,
        isActive: conversation.isActive,
        updatedAt: conversation.updatedAt
      };
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }

  async updateConversationTitle(conversationId, userId, newTitle) {
    try {
      const userIdString = userId.toString();
      const conversation = await megaConversationService.updateConversationTitle(conversationId, userIdString, newTitle);

      // Get model information for compatibility
      const model = llmConfigService.getModelById(conversation.modelId);

      // Format for compatibility
      return {
        _id: conversation.id,
        title: conversation.title,
        updatedAt: conversation.updatedAt,
        llmModelId: model ? {
          _id: model.id,
          name: model.name,
          displayName: model.displayName,
          provider: model.provider
        } : null
      };
    } catch (error) {
      console.error('Error updating conversation title:', error);
      throw error;
    }
  }

  async getConversationPublicUrl(conversationId, userId) {
    try {
      const userIdString = userId.toString();
      const publicUrl = await megaConversationService.getConversationPublicUrl(conversationId, userIdString);
      return publicUrl;
    } catch (error) {
      console.error('Error getting conversation public URL:', error);
      throw new Error('Failed to get conversation public URL');
    }
  }
}

module.exports = new LLMChatService();
