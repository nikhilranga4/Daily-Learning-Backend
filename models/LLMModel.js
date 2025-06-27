// models/LLMModel.js
const mongoose = require('mongoose');

const llmModelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    provider: {
      type: String,
      required: true,
      enum: ['openai', 'anthropic', 'openrouter', 'deepseek', 'gemini', 'custom'],
    },
    apiKey: {
      type: String,
      required: true,
    },
    baseUrl: {
      type: String,
      default: null, // For custom providers
    },
    modelId: {
      type: String,
      required: true, // e.g., 'gpt-4', 'claude-3-sonnet', 'deepseek/deepseek-chat'
    },
    maxTokens: {
      type: Number,
      default: 4000,
    },
    temperature: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 2,
    },
    systemPrompt: {
      type: String,
      default: 'You are a helpful AI assistant.',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastUsed: {
      type: Date,
      default: null,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
  },
  { 
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        // Hide API key in JSON responses for security
        delete ret.apiKey;
        return ret;
      }
    }
  }
);

// Index for faster queries
llmModelSchema.index({ isActive: 1, isDefault: 1 });
llmModelSchema.index({ provider: 1 });
llmModelSchema.index({ createdBy: 1 });

// Ensure only one default model at a time
llmModelSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

module.exports = mongoose.model('LLMModel', llmModelSchema);
