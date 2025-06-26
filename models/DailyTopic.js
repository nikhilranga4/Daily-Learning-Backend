// models/DailyTopic.js
const mongoose = require('mongoose');

const dailyTopicSchema = new mongoose.Schema({
  languageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProgrammingLanguage',
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  date: {
    type: String, // Store as string YYYY-MM-DD
    required: true
  },
  questionLevel: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium',
    required: true
  },
  questionCount: {
    type: Number,
    min: 15,
    max: 25,
    default: 20,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Remove any existing index on date field
dailyTopicSchema.index({ date: 1 }, { unique: false });

module.exports = mongoose.model('DailyTopic', dailyTopicSchema);
