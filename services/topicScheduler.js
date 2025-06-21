// services/topicScheduler.js
const cron = require('node-cron');
const DailyTopic = require('../models/DailyTopic');
const Question = require('../models/Question');
const ProgrammingLanguage = require('../models/ProgrammingLanguage');
const llmService = require('./llmService');

let job; // Global job reference

// Function to get today's date in YYYY-MM-DD format
const todayDate = () => new Date().toISOString().split('T')[0];

// Run LLM generation job
const runJob = async () => {
  const today = todayDate();
  console.log(`[CRON] Checking topic for ${today}`);

  try {
    const topic = await DailyTopic.findOne({ date: today }).populate('languageId');

    if (!topic) {
      console.log('[CRON] No daily topic set for today.');
      return;
    }

    const existing = await Question.find({ dailyTopicId: topic._id });
    if (existing.length > 0) {
      console.log('[CRON] Questions already exist for today.');
      return;
    }

    const languageName = topic.languageId?.name || 'Python';
    const generatedQuestions = await llmService.generateMCQs(languageName, topic.topic);

    const questionDocs = generatedQuestions.map((q) => ({
      dailyTopicId: topic._id,
      questionText: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    }));

    await Question.insertMany(questionDocs);
    console.log(`[CRON] Inserted ${questionDocs.length} questions for "${topic.topic}" in ${languageName}`);
  } catch (err) {
    console.error('[CRON ERROR]', err.message);
  }
};

// Start cron (runs at 6 AM daily)
const startCron = () => {
  if (!job) {
    job = cron.schedule('0 6 * * *', runJob, {
      scheduled: true,
      timezone: 'Asia/Kolkata',
    });
    console.log('[CRON] Daily topic cron started (6 AM)');
  }
};

// Stop cron job
const stopCron = () => {
  if (job) {
    job.stop();
    job = null;
    console.log('[CRON] Daily topic cron stopped.');
  }
};

module.exports = {
  startCron,
  stopCron,
  runJob, // Allow admin to trigger manually
};
