// models/UserResponse.js
const mongoose = require('mongoose');

const userResponseSchema = new mongoose.Schema(
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
    answers: [
      {
        questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
        selectedOption: String,
        isCorrect: Boolean,
        correctAnswer: String,
        explanation: String,
      },
    ],
    score: {
      type: Number,
      required: true,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    completed: {
      type: Boolean,
      default: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Create compound index to ensure one response per user per daily topic
userResponseSchema.index({ userId: 1, dailyTopicId: 1 }, { unique: true });

module.exports = mongoose.model('UserResponse', userResponseSchema);
