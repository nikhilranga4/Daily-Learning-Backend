// controllers/examController.js
const DailyTopic = require('../models/DailyTopic');
const Question = require('../models/Question');
const UserResponse = require('../models/UserResponse');
const ExamResult = require('../models/ExamResult');
const evaluateAnswers = require('../utils/evaluateAnswers');

exports.startExam = async (req, res) => {
  const { language, topic } = req.body;

  try {
    const today = new Date().toISOString().split('T')[0];
    let dailyTopic = await DailyTopic.findOne({ date: today, language });

    if (!dailyTopic) {
      dailyTopic = await DailyTopic.create({ date: today, language, topic });
    }

    const questions = await Question.find({ dailyTopicId: dailyTopic._id });
    res.json({ topic: dailyTopic.topic, questions });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.submitExam = async (req, res) => {
  const userId = req.user.id;
  const { dailyTopicId, answers } = req.body;

  try {
    const evaluated = await evaluateAnswers(dailyTopicId, answers);

    await UserResponse.create({
      userId,
      dailyTopicId,
      answers: evaluated.answers,
    });

    const result = await ExamResult.create({
      userId,
      dailyTopicId,
      score: evaluated.score,
      totalQuestions: evaluated.totalQuestions,
    });

    res.json({ msg: 'Exam submitted', score: result.score });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getUserResults = async (req, res) => {
  const userId = req.user.id;

  try {
    const results = await ExamResult.find({ userId }).populate('dailyTopicId');
    res.json(results);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};
