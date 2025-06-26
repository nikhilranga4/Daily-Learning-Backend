const mongoose = require('mongoose');

const dailyKnowledgeSchema = new mongoose.Schema({
  knowledgeTopic: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: String, // Store as string YYYY-MM-DD
    required: true
  },
  contentType: {
    type: String,
    enum: ['Concept', 'Tutorial', 'Best Practice', 'Tips & Tricks', 'Deep Dive'],
    default: 'Concept',
    required: true
  },
  generatedContent: {
    type: String,
    default: null // Will be populated when LLM generates content
  },
  isGenerated: {
    type: Boolean,
    default: false
  },
  generatedAt: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index to ensure one knowledge topic per date
dailyKnowledgeSchema.index({ date: 1 }, { unique: true });

module.exports = mongoose.model('DailyKnowledge', dailyKnowledgeSchema);
