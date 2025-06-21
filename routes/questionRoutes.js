// routes/questionRoutes.js
const express = require('express');
const router = express.Router();
const { generateQuestions } = require('../controllers/questionController');
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware');

// 🔄 Generate & Save MCQs from LLM
router.post('/generate', isAuthenticated, isAdmin, generateQuestions);

module.exports = router;
