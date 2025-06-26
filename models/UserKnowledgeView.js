const mongoose = require('mongoose');

const userKnowledgeViewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dailyKnowledgeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DailyKnowledge',
    required: true
  },
  viewedAt: {
    type: Date,
    default: Date.now
  },
  readingTime: {
    type: Number, // in seconds
    default: 0
  }
}, {
  timestamps: true
});

// Compound index to ensure one view per user per knowledge topic
userKnowledgeViewSchema.index({ userId: 1, dailyKnowledgeId: 1 }, { unique: true });

module.exports = mongoose.model('UserKnowledgeView', userKnowledgeViewSchema);
