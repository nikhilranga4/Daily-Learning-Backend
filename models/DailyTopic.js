// models/DailyTopic.js
const mongoose = require('mongoose');

const dailyTopicSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, unique: true },
    topic: { type: String, required: true },
    languageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProgrammingLanguage',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DailyTopic', dailyTopicSchema);
