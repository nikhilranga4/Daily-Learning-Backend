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
      const fileName = `conversation_data.json`; // Standard filename for each conversation folder
      const fileContent = JSON.stringify(conversation, null, 2);
      const fileBuffer = Buffer.from(fileContent, 'utf8');
      
      // Upload to conversation-specific folder: users/userid/userdata_files/conversationid
      const uploadResult = await megaService.uploadToConversationFolder(
        fileBuffer,
        fileName,
        userId,
        conversationId
      );

      if (uploadResult && uploadResult.success) {
        conversation.megaFileId = uploadResult.nodeId;
        conversation.folderPath = uploadResult.folderPath;

        // Check if public URL was generated during upload
        if (uploadResult.publicUrl) {
          conversation.publicUrl = uploadResult.publicUrl;
          console.log(`✅ Conversation created in Mega Drive with public access: ${conversationId}`);
          console.log(`🔗 Public URL: ${uploadResult.publicUrl}`);
        } else {
          console.warn('⚠️  Public URL not generated during upload');
        }

        // Log folder path information
        if (uploadResult.fallback) {
          console.log(`📁 Saved to: ${uploadResult.folderPath} (fallback mode)`);
          if (uploadResult.warning) {
            console.warn(`⚠️  ${uploadResult.warning}`);
          }
        } else {
          console.log(`📁 Saved to: ${uploadResult.folderPath}`);
        }

        console.log(`✅ Conversation created in Mega Drive: ${conversationId}`);
      } else {
        console.warn('⚠️  Failed to save to Mega Drive, using memory cache only');
        conversation.fallbackMode = true;
      }

      // Cache the conversation immediately
      this.conversationCache.set(conversationId, conversation);

      // Log cache status for debugging
      console.log(`📋 Conversation ${conversationId} cached. Cache size: ${this.conversationCache.size}`);

      return conversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  /**
   * Add a message to a conversation (with optional save)
   */
  async addMessage(conversationId, role, content, tokens = 0, saveToMega = true) {
    try {
      let conversation = this.conversationCache.get(conversationId);

      if (!conversation) {
        // Try to load from Mega Drive
        conversation = await this.loadConversationFromMega(conversationId);
        if (!conversation) {
          console.error(`❌ Conversation ${conversationId} not found in cache or Mega Drive`);
          throw new Error('Conversation not found');
        }
        console.log(`📁 Loaded conversation ${conversationId} from Mega Drive for message addition`);
      } else {
        console.log(`📋 Using cached conversation ${conversationId} for message addition`);
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

      // Update conversation title with first user message content
      if (role === 'user' && conversation.messages.length === 1) {
        // This is the first user message, update the title
        const titleContent = content.length > 50 ? content.substring(0, 50) + '...' : content;
        conversation.title = titleContent;
        console.log(`📝 Updated conversation title to: "${titleContent}"`);
      }

      // Update cache
      this.conversationCache.set(conversationId, conversation);

      // Save to Mega Drive (if requested and available)
      if (saveToMega) {
        try {
          await this.saveConversationToMega(conversation);
        } catch (error) {
          console.warn('⚠️  Failed to save message to Mega Drive, keeping in memory cache:', error.message);
          conversation.fallbackMode = true;
        }
      } else {
        console.log(`📝 Message added to cache only (save skipped): ${role} message`);
      }

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

      if (conversation) {
        // Verify user ownership for cached conversation
        if (conversation.userId !== userId) {
          throw new Error('Access denied');
        }
        console.log(`📋 Retrieved conversation from cache: ${conversationId}`);
        return conversation;
      }

      // Try to load from Mega Drive
      conversation = await this.loadConversationFromMega(conversationId, userId);
      if (conversation) {
        // Verify user ownership
        if (conversation.userId !== userId) {
          throw new Error('Access denied');
        }

        // Cache it
        this.conversationCache.set(conversationId, conversation);
        console.log(`📁 Retrieved conversation from Mega Drive: ${conversationId}`);
        return conversation;
      }

      // If not found anywhere, throw error
      throw new Error('Conversation not found');
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
      // Get list of conversation folders from user-specific folder
      const conversationFolders = await megaService.listUserConversations(userId);

      if (!conversationFolders || conversationFolders.length === 0) {
        return [];
      }

      // Sort by timestamp (newest first)
      const sortedFolders = conversationFolders
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Paginate
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedFolders = sortedFolders.slice(startIndex, endIndex);

      // Load conversation metadata from each conversation folder
      const conversations = [];
      for (const folder of paginatedFolders) {
        try {
          // Get conversation data from the conversation folder
          const conversationFiles = await megaService.listConversationFiles(userId, folder.conversationId);

          if (conversationFiles.length > 0) {
            const conversationFile = conversationFiles.find(file => file.name === 'conversation_data.json');

            if (conversationFile) {
              const conversationData = await megaService.downloadAsJSON(conversationFile.nodeId);

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
                isActive: conversationData.isActive,
                folderPath: folder.folderPath
              });
            }
          }
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

      const fileName = `conversation_data.json`; // Standard filename for each conversation folder

      // Check if Mega Drive is available
      try {
        const conversationFiles = await megaService.listConversationFiles(userId, conversationId);

        const conversationFile = conversationFiles.find(file => file.name === fileName);
        if (!conversationFile) {
          console.log(`📁 Conversation file ${fileName} not found in Mega Drive`);
          return null;
        }

        const conversationData = await megaService.downloadAsJSON(conversationFile.nodeId);
        console.log(`📁 Successfully loaded conversation ${conversationId} from Mega Drive`);
        return conversationData;
      } catch (megaError) {
        console.warn(`⚠️  Mega Drive access failed for conversation ${conversationId}:`, megaError.message);

        // If Mega Drive is not available, check if we have a cached version
        const cachedConv = this.conversationCache.get(conversationId);
        if (cachedConv && cachedConv.userId === userId) {
          console.log(`📋 Using cached conversation as fallback: ${conversationId}`);
          return cachedConv;
        }

        return null;
      }
    } catch (error) {
      console.warn(`Failed to load conversation ${conversationId}:`, error.message);
      return null;
    }
  }

  /**
   * Save conversation to Mega Drive (update existing or create new)
   */
  async saveConversationToMega(conversation) {
    try {
      const fileName = `conversation_data.json`; // Standard filename for each conversation folder
      const fileContent = JSON.stringify(conversation, null, 2);
      const fileBuffer = Buffer.from(fileContent, 'utf8');

      // Check if conversation already has a megaFileId (existing file)
      if (conversation.megaFileId) {
        console.log(`🔄 Updating existing conversation file: ${fileName}`);

        // Try to update the existing file in conversation folder
        const updateResult = await megaService.updateConversationFile(
          fileBuffer,
          fileName,
          conversation.userId,
          conversation.id,
          conversation.megaFileId
        );

        if (updateResult && updateResult.success) {
          console.log(`✅ Successfully updated existing conversation: ${conversation.id}`);
          return conversation.megaFileId;
        } else {
          console.warn(`⚠️  Failed to update existing file, creating new one`);
          // Fall through to create new file
        }
      }

      // Create new file (first time or update failed)
      console.log(`📄 Creating new conversation file: ${fileName}`);
      const uploadResult = await megaService.uploadToConversationFolder(
        fileBuffer,
        fileName,
        conversation.userId,
        conversation.id
      );

      if (uploadResult && uploadResult.success) {
        conversation.megaFileId = uploadResult.nodeId;
        conversation.folderPath = uploadResult.folderPath;

        // Update public URL if generated
        if (uploadResult.publicUrl) {
          conversation.publicUrl = uploadResult.publicUrl;
          console.log(`✅ Conversation saved to Mega Drive with public URL: ${conversation.id}`);
        } else {
          console.log(`✅ Conversation saved to Mega Drive: ${conversation.id}`);
        }

        // Log folder path information
        if (uploadResult.fallback) {
          console.log(`📁 Updated in: ${uploadResult.folderPath} (fallback mode)`);
          if (uploadResult.warning) {
            console.warn(`⚠️  ${uploadResult.warning}`);
          }
        } else {
          console.log(`📁 Updated in: ${uploadResult.folderPath}`);
        }
      } else {
        console.warn(`⚠️  Failed to save conversation ${conversation.id} to Mega Drive`);
      }

      return conversation.megaFileId;
    } catch (error) {
      console.warn(`Failed to save conversation ${conversation.id} to Mega Drive:`, error.message);
      return null;
    }
  }

  /**
   * Generate or retrieve public URL for a conversation
   */
  async getConversationPublicUrl(conversationId, userId) {
    try {
      const conversation = await this.getConversation(conversationId, userId);

      // If public URL already exists, return it
      if (conversation.publicUrl) {
        console.log(`🔗 Existing public URL: ${conversation.publicUrl}`);
        return conversation.publicUrl;
      }

      // If no public URL but has megaFileId, try to generate one
      if (conversation.megaFileId) {
        try {
          const publicUrl = await megaService.generatePublicLink(conversation.megaFileId);
          if (publicUrl) {
            conversation.publicUrl = publicUrl;

            // Update the conversation with the new public URL
            this.conversationCache.set(conversationId, conversation);
            await this.saveConversationToMega(conversation);

            console.log(`🔗 Generated new public URL: ${publicUrl}`);
            return publicUrl;
          }
        } catch (error) {
          console.warn('⚠️  Failed to generate public URL:', error.message);
        }
      }

      console.warn('⚠️  No public URL available for conversation');
      return null;
    } catch (error) {
      console.error('Error getting public URL:', error);
      throw error;
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
