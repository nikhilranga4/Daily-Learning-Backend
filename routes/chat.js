// routes/chat.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/authMiddleware');
const chatController = require('../controllers/chatController');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv',
      'application/zip', 'application/x-rar-compressed'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

// Middleware for handling file uploads
const uploadFile = (req, res, next) => {
  const uploadMiddleware = upload.single('file');
  uploadMiddleware(req, res, (err) => {
    if (err) {
      // Handle multer errors (e.g., file type not allowed)
      return res.status(400).json({ msg: err.message });
    }
    next();
  });
};

// @route   POST /api/chat/send
// @desc    Send a message (with optional file)
// @access  Private
router.post('/send', auth.isAuthenticated, uploadFile, chatController.sendMessage);

// @route   GET /api/chat/conversation/:otherUserId
// @desc    Get conversation between current user and another user
// @access  Private
router.get('/conversation/:otherUserId', auth.isAuthenticated, chatController.getConversation);

// @route   GET /api/chat/conversations
// @desc    Get all conversations for current user
// @access  Private
router.get('/conversations', auth.isAuthenticated, chatController.getUserConversations);

// @route   GET /api/chat/users
// @desc    Get all users (for admin to start conversations)
// @access  Private (Admin only)
router.get('/users', auth.isAuthenticated, chatController.getAllUsers);

// @route   PUT /api/chat/read/:messageId
// @desc    Mark message as read
// @access  Private
router.put('/read/:messageId', auth.isAuthenticated, chatController.markMessageAsRead);

// @route   DELETE /api/chat/message/:messageId
// @desc    Delete a message
// @access  Private
router.delete('/message/:messageId', auth.isAuthenticated, chatController.deleteMessage);

// @route   GET /api/chat/image/:fileId
// @desc    Proxy Google Drive images to handle CORS
// @access  Private
router.get('/image/:fileId', auth.isAuthenticated, chatController.getGoogleDriveImage);

module.exports = router;
