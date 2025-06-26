// routes/examRoutes.js
const express = require('express');
const router = express.Router();
const {
  startExam,
  submitExam,
  getUserResults,
  getDailyTopics,
  getAssessmentDetails,
  getUserCompletedAssessments,
} = require('../controllers/examController');
const { isAuthenticated, isApprovedUser } = require('../middleware/authMiddleware');

// 🧪 Start Exam
router.post('/start', isAuthenticated, isApprovedUser, startExam);

// ✅ Submit Exam
router.post('/submit', isAuthenticated, isApprovedUser, submitExam);

// 📊 View Result History
router.get('/results', isAuthenticated, isApprovedUser, getUserResults);

// 📅 Get Daily Topics with completion status
router.get('/daily-topics', isAuthenticated, isApprovedUser, getDailyTopics);

// 📋 Get detailed assessment results
router.get('/assessment/:dailyTopicId', isAuthenticated, isApprovedUser, getAssessmentDetails);

// 📚 Get user's completed assessments
router.get('/user-completed-assessments', isAuthenticated, isApprovedUser, getUserCompletedAssessments);

module.exports = router;
