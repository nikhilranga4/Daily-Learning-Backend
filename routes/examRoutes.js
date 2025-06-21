// routes/examRoutes.js
const express = require('express');
const router = express.Router();
const {
  startExam,
  submitExam,
  getUserResults,
} = require('../controllers/examController');
const { isAuthenticated, isApprovedUser } = require('../middleware/authMiddleware');

// 🧪 Start Exam
router.post('/start', isAuthenticated, isApprovedUser, startExam);

// ✅ Submit Exam
router.post('/submit', isAuthenticated, isApprovedUser, submitExam);

// 📊 View Result History
router.get('/results', isAuthenticated, isApprovedUser, getUserResults);

module.exports = router;
