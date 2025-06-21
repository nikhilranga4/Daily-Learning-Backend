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
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('UserResponse', userResponseSchema);
