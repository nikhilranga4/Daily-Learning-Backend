// services/megaConversationService.js - Store conversations in Mega Drive
const megaService = require('./megaService');
const { v4: uuidv4 } = require('uuid');

class MegaConversationService {
  constructor() {
    this.conversationCache = new Map(); // In-memory cache for active conversations
  }

  /**
   * Create a new conversation stored in Mega Drive
   */
  async createConversation(userId, modelId, title = 'New Conversation') {
    try {
      const conversationId = uuidv4();
      const conversation = {
        id: conversationId,
        userId: userId,
        modelId: modelId,
        title: title,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastMessageAt: null,
        totalTokens: 0,
        isActive: true,
        metadata: {
          version: '1.0',
          source: 'mega-drive-storage'
        }
      };

      // Save to Mega Drive
      const fileName = `conversation_${conversationId}.json`;
      const fileContent = JSON.stringify(conversation, null, 2);
      const fileBuffer = Buffer.from(fileContent, 'utf8');
      
      const megaFileId = await megaService.uploadBuffer(
        fileBuffer,
        fileName,
        `user_${userId}/conversations`
      );

      if (megaFileId) {
        conversation.megaFileId = megaFileId;
        console.log(`✅ Conversation created in Mega Drive: ${conversationId}`);
      } else {
        console.warn('⚠️  Failed to save to Mega Drive, using memory cache only');
      }

      // Cache the conversation
      this.conversationCache.set(conversationId, conversation);

      return conversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(conversationId, role, content, tokens = 0) {
    try {
      let conversation = this.conversationCache.get(conversationId);
      
      if (!conversation) {
        // Try to load from Mega Drive
        conversation = await this.loadConversationFromMega(conversationId);
        if (!conversation) {
          throw new Error('Conversation not found');
        }
      }

      const message = {
        id: uuidv4(),
        role: role,
        content: content,
        timestamp: new Date().toISOString(),
        tokens: tokens
      };

      conversation.messages.push(message);
      conversation.totalTokens += tokens;
      conversation.lastMessageAt = message.timestamp;
      conversation.updatedAt = new Date().toISOString();

      // Update cache
      this.conversationCache.set(conversationId, conversation);

      // Save to Mega Drive
      await this.saveConversationToMega(conversation);

      return conversation;
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  }

  /**
   * Get a conversation by ID
   */
  async getConversation(conversationId, userId) {
    try {
      // Check cache first
      let conversation = this.conversationCache.get(conversationId);
      
      if (!conversation) {
        // Load from Mega Drive
        conversation = await this.loadConversationFromMega(conversationId, userId);
        if (!conversation) {
          throw new Error('Conversation not found');
        }
        
        // Cache it
        this.conversationCache.set(conversationId, conversation);
      }

      // Verify user ownership
      if (conversation.userId !== userId) {
        throw new Error('Access denied');
      }

      return conversation;
    } catch (error) {
      console.error('Error getting conversation:', error);
      throw error;
    }
  }

  /**
   * Get all conversations for a user
   */
  async getUserConversations(userId, page = 1, limit = 20) {
    try {
      // Get list of conversation files from Mega Drive
      const files = await megaService.listFiles(`user_${userId}/conversations`);
      
      if (!files || files.length === 0) {
        return [];
      }

      // Sort by creation date (newest first)
      const sortedFiles = files
        .filter(file => file.name.startsWith('conversation_') && file.name.endsWith('.json'))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Paginate
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedFiles = sortedFiles.slice(startIndex, endIndex);

      // Load conversation metadata (without full messages for performance)
      const conversations = [];
      for (const file of paginatedFiles) {
        try {
          const conversationData = await megaService.downloadAsJSON(file.nodeId);
          
          // Return summary without full messages for list view
          conversations.push({
            id: conversationData.id,
            title: conversationData.title,
            modelId: conversationData.modelId,
            createdAt: conversationData.createdAt,
            updatedAt: conversationData.updatedAt,
            lastMessageAt: conversationData.lastMessageAt,
            messageCount: conversationData.messages?.length || 0,
            totalTokens: conversationData.totalTokens || 0,
            isActive: conversationData.isActive
          });
        } catch (error) {
          console.warn(`Failed to load conversation file ${file.name}:`, error.message);
        }
      }

      return conversations;
    } catch (error) {
      console.error('Error getting user conversations:', error);
      // Return empty array instead of throwing to gracefully handle Mega Drive issues
      return [];
    }
  }

  /**
   * Update conversation title
   */
  async updateConversationTitle(conversationId, userId, newTitle) {
    try {
      const conversation = await this.getConversation(conversationId, userId);
      conversation.title = newTitle;
      conversation.updatedAt = new Date().toISOString();

      // Update cache
      this.conversationCache.set(conversationId, conversation);

      // Save to Mega Drive
      await this.saveConversationToMega(conversation);

      return conversation;
    } catch (error) {
      console.error('Error updating conversation title:', error);
      throw error;
    }
  }

  /**
   * Delete (deactivate) a conversation
   */
  async deleteConversation(conversationId, userId) {
    try {
      const conversation = await this.getConversation(conversationId, userId);
      conversation.isActive = false;
      conversation.updatedAt = new Date().toISOString();

      // Update cache
      this.conversationCache.set(conversationId, conversation);

      // Save to Mega Drive
      await this.saveConversationToMega(conversation);

      return conversation;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }

  /**
   * Load conversation from Mega Drive
   */
  async loadConversationFromMega(conversationId, userId = null) {
    try {
      if (!userId) {
        // Extract userId from cached conversation or search all user folders
        const cachedConv = this.conversationCache.get(conversationId);
        if (cachedConv) {
          userId = cachedConv.userId;
        } else {
          throw new Error('User ID required to load conversation from Mega Drive');
        }
      }

      const fileName = `conversation_${conversationId}.json`;
      const files = await megaService.listFiles(`user_${userId}/conversations`);
      
      const conversationFile = files.find(file => file.name === fileName);
      if (!conversationFile) {
        return null;
      }

      const conversationData = await megaService.downloadAsJSON(conversationFile.nodeId);
      return conversationData;
    } catch (error) {
      console.warn(`Failed to load conversation ${conversationId} from Mega Drive:`, error.message);
      return null;
    }
  }

  /**
   * Save conversation to Mega Drive
   */
  async saveConversationToMega(conversation) {
    try {
      const fileName = `conversation_${conversation.id}.json`;
      const fileContent = JSON.stringify(conversation, null, 2);
      const fileBuffer = Buffer.from(fileContent, 'utf8');
      
      const megaFileId = await megaService.uploadBuffer(
        fileBuffer,
        fileName,
        `user_${conversation.userId}/conversations`
      );

      if (megaFileId) {
        conversation.megaFileId = megaFileId;
        console.log(`✅ Conversation saved to Mega Drive: ${conversation.id}`);
      } else {
        console.warn(`⚠️  Failed to save conversation ${conversation.id} to Mega Drive`);
      }

      return megaFileId;
    } catch (error) {
      console.warn(`Failed to save conversation ${conversation.id} to Mega Drive:`, error.message);
      return null;
    }
  }

  /**
   * Clear cache (useful for memory management)
   */
  clearCache() {
    this.conversationCache.clear();
    console.log('🧹 Conversation cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cachedConversations: this.conversationCache.size,
      cacheKeys: Array.from(this.conversationCache.keys())
    };
  }
}

module.exports = new MegaConversationService();
