// routes/llmRoutes.js
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/authMiddleware');
const llmChatController = require('../controllers/llmChatController');
const llmAdminController = require('../controllers/llmAdminController');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }
  next();
};

// ===== USER ROUTES =====

// @route   GET /api/llm/models
// @desc    Get available LLM models for users
// @access  Private
router.get('/models', isAuthenticated, llmChatController.getAvailableModels);

// @route   POST /api/llm/conversations
// @desc    Create new conversation
// @access  Private
router.post('/conversations', isAuthenticated, llmChatController.createConversation);

// @route   GET /api/llm/conversations
// @desc    Get user conversations
// @access  Private
router.get('/conversations', isAuthenticated, llmChatController.getUserConversations);

// @route   GET /api/llm/conversations/:conversationId
// @desc    Get specific conversation
// @access  Private
router.get('/conversations/:conversationId', isAuthenticated, llmChatController.getConversation);

// @route   POST /api/llm/conversations/:conversationId/messages
// @desc    Send message in conversation
// @access  Private
router.post('/conversations/:conversationId/messages', isAuthenticated, llmChatController.sendMessage);

// @route   PUT /api/llm/conversations/:conversationId/title
// @desc    Update conversation title
// @access  Private
router.put('/conversations/:conversationId/title', isAuthenticated, llmChatController.updateConversationTitle);

// @route   DELETE /api/llm/conversations/:conversationId
// @desc    Delete conversation
// @access  Private
router.delete('/conversations/:conversationId', isAuthenticated, llmChatController.deleteConversation);

// @route   GET /api/llm/stats
// @desc    Get user LLM statistics
// @access  Private
router.get('/stats', isAuthenticated, llmChatController.getUserStats);

// @route   GET /api/llm/conversations/:conversationId/history
// @desc    Get conversation history from Mega Drive
// @access  Private
router.get('/conversations/:conversationId/history', isAuthenticated, llmChatController.getConversationHistory);

// @route   POST /api/llm/conversations/:conversationId/restore/:fileId
// @desc    Restore conversation from Mega Drive backup
// @access  Private
router.post('/conversations/:conversationId/restore/:fileId', isAuthenticated, llmChatController.restoreConversation);

// @route   GET /api/llm/validate/:modelId
// @desc    Validate model availability
// @access  Private
router.get('/validate/:modelId', isAuthenticated, llmChatController.validateModel);

// ===== ADMIN ROUTES =====

// @route   GET /api/llm/admin/models
// @desc    Get all LLM models (admin)
// @access  Private (Admin only)
router.get('/admin/models', isAuthenticated, isAdmin, llmAdminController.getLLMModels);

// @route   GET /api/llm/admin/models/:id
// @desc    Get single LLM model with API key (admin)
// @access  Private (Admin only)
router.get('/admin/models/:id', isAuthenticated, isAdmin, llmAdminController.getLLMModel);

// @route   POST /api/llm/admin/models
// @desc    Create new LLM model (admin)
// @access  Private (Admin only)
router.post('/admin/models', isAuthenticated, isAdmin, llmAdminController.createLLMModel);

// @route   PUT /api/llm/admin/models/:id
// @desc    Update LLM model (admin)
// @access  Private (Admin only)
router.put('/admin/models/:id', isAuthenticated, isAdmin, llmAdminController.updateLLMModel);

// @route   DELETE /api/llm/admin/models/:id
// @desc    Delete LLM model (admin)
// @access  Private (Admin only)
router.delete('/admin/models/:id', isAuthenticated, isAdmin, llmAdminController.deleteLLMModel);

// @route   PUT /api/llm/admin/models/:id/default
// @desc    Set default LLM model (admin)
// @access  Private (Admin only)
router.put('/admin/models/:id/default', isAuthenticated, isAdmin, llmAdminController.setDefaultLLMModel);

// @route   GET /api/llm/admin/stats
// @desc    Get LLM usage statistics (admin)
// @access  Private (Admin only)
router.get('/admin/stats', isAuthenticated, isAdmin, llmAdminController.getLLMStats);

module.exports = router;
