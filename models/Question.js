// models/Question.js
const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    dailyTopicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DailyTopic',
      required: true,
    },
    questionText: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswer: { type: String, required: true },
    explanation: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Question', questionSchema);
