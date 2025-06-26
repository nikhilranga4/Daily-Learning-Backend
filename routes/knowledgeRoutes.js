// routes/knowledgeRoutes.js
const express = require('express');
const router = express.Router();
const {
  getTodaysKnowledge,
  generateAndGetKnowledge,
  getUserKnowledgeHistory,
  getKnowledgeContent
} = require('../controllers/knowledgeController');
const { isAuthenticated, isApprovedUser } = require('../middleware/authMiddleware');

// 📚 Get today's available knowledge topics
router.get('/today', isAuthenticated, isApprovedUser, getTodaysKnowledge);

// 🧠 Generate and get knowledge content (once per day per topic)
router.post('/generate/:knowledgeId', isAuthenticated, isApprovedUser, generateAndGetKnowledge);

// 📖 Get specific knowledge content (for history viewing)
router.get('/content/:knowledgeId', isAuthenticated, isApprovedUser, getKnowledgeContent);

// 📋 Get user's knowledge viewing history
router.get('/history', isAuthenticated, isApprovedUser, getUserKnowledgeHistory);

module.exports = router;
