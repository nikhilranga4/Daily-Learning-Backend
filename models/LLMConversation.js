// models/LLMConversation.js
const mongoose = require('mongoose');

// Simplified message schema - only metadata stored in MongoDB
const llmMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  tokens: {
    type: Number,
    default: 0,
  },
  messageIndex: {
    type: Number,
    required: true, // Index in the Mega Drive conversation file
  },
  // Content is stored in Mega Drive, not MongoDB
});

const llmConversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    llmModelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LLMModel',
      required: true,
    },
    title: {
      type: String,
      default: 'New Conversation',
      trim: true,
    },
    messages: [llmMessageSchema], // Only metadata, actual content in Mega Drive
    isActive: {
      type: Boolean,
      default: true,
    },
    totalTokens: {
      type: Number,
      default: 0,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    megaDriveFolderId: {
      type: String,
      default: null, // Folder in Mega Drive for this conversation
    },
    metadata: {
      userAgent: String,
      ipAddress: String,
      sessionId: String,
    },
  },
  { 
    timestamps: true 
  }
);

// Indexes for better performance
llmConversationSchema.index({ userId: 1, lastMessageAt: -1 });
llmConversationSchema.index({ llmModelId: 1 });
llmConversationSchema.index({ isActive: 1 });

// Auto-generate title from first user message
llmConversationSchema.pre('save', function(next) {
  if (this.isNew && this.messages.length > 0) {
    const firstUserMessage = this.messages.find(msg => msg.role === 'user');
    if (firstUserMessage && this.title === 'New Conversation') {
      // Take first 50 characters of the first user message as title
      this.title = firstUserMessage.content.substring(0, 50).trim() + 
                   (firstUserMessage.content.length > 50 ? '...' : '');
    }
  }
  
  // Update lastMessageAt when new messages are added
  if (this.messages.length > 0) {
    this.lastMessageAt = this.messages[this.messages.length - 1].timestamp;
  }
  
  next();
});

// Static method to get user conversations with pagination
llmConversationSchema.statics.getUserConversations = async function(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  return this.find({ userId, isActive: true })
    .populate('llmModelId', 'name displayName provider')
    .sort({ lastMessageAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// Instance method to add message
llmConversationSchema.methods.addMessage = function(role, content, tokens = 0) {
  this.messages.push({
    role,
    content,
    tokens,
    timestamp: new Date(),
  });
  
  this.totalTokens += tokens;
  this.lastMessageAt = new Date();
  
  return this.save();
};

module.exports = mongoose.model('LLMConversation', llmConversationSchema);
