// controllers/questionController.js
const Question = require('../models/Question');
const DailyTopic = require('../models/DailyTopic');
const llmService = require('../services/llmService');

exports.generateQuestions = async (req, res) => {
  const { language, topic } = req.body;
  const today = new Date().toISOString().split('T')[0];

  try {
    let dailyTopic = await DailyTopic.findOne({ date: today, language });

    if (!dailyTopic) {
      dailyTopic = await DailyTopic.create({ date: today, language, topic });
    }

    const questionsFromLLM = await llmService.generateMCQs(language, topic);

    const questionDocs = questionsFromLLM.map((q) => ({
      dailyTopicId: dailyTopic._id,
      questionText: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    }));

    await Question.insertMany(questionDocs);

    res.status(201).json({ msg: 'Questions saved successfully' });
  } catch (err) {
    res.status(500).json({ msg: 'Failed to generate questions' });
  }
};
