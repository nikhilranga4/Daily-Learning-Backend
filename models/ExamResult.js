// models/ExamResult.js
const mongoose = require('mongoose');

const examResultSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dailyTopicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DailyTopic',
      required: true,
    },
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ExamResult', examResultSchema);
