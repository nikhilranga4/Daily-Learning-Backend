// controllers/chatController.js
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');
const googleDriveService = require('../services/googleDriveService');
const { Readable } = require('stream');

// Send a message
const sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id || req.user._id;
    const { receiverId, message, replyTo } = req.body;

    // Validate receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ msg: 'Receiver not found' });
    }

    // Create message object
    const messageData = {
      senderId,
      receiverId,
      message: message || '',
      replyTo: replyTo || null
    };

    // Handle file upload if present
    if (req.file) {
      try {
        console.log('📎 Processing file upload:', req.file.originalname);

        // Try Google Drive first, fallback to local storage
        let uploadResult;

        try {
          // Get chat files folder
          const folderId = await googleDriveService.getChatFilesFolder();

          // Upload to Google Drive using buffer directly
          uploadResult = await googleDriveService.uploadFile(
            req.file.buffer,
            `${Date.now()}_${req.file.originalname}`,
            req.file.mimetype,
            folderId
          );

          console.log('✅ File uploaded to Google Drive:', uploadResult.fileId);

          // Update message data with Google Drive info
          const isImage = req.file.mimetype.startsWith('image/');
          messageData.messageType = isImage ? 'image' : 'file';
          messageData.fileUrl = isImage ? uploadResult.imagePreviewUrl : uploadResult.downloadUrl;
          messageData.fileName = req.file.originalname;
          messageData.fileSize = req.file.size;
          messageData.fileMimeType = req.file.mimetype;
          messageData.googleDriveFileId = uploadResult.fileId;
          // For file uploads, only keep message if it's different from filename
          messageData.message = (message && message !== req.file.originalname) ? message : '';

        } catch (driveError) {
          console.log('⚠️ Google Drive upload failed, using local storage fallback');
          console.log('📁 Storing file locally...');

          // Fallback to local file storage
          const fs = require('fs');
          const path = require('path');

          // Create uploads directory if it doesn't exist
          const uploadsDir = path.join(__dirname, '../uploads/chat-files');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }

          // Generate unique filename
          const uniqueFileName = `${Date.now()}_${req.file.originalname}`;
          const filePath = path.join(uploadsDir, uniqueFileName);

          // Save file to local storage
          fs.writeFileSync(filePath, req.file.buffer);

          console.log('✅ File stored locally:', uniqueFileName);

          // Update message data with local file info
          messageData.messageType = req.file.mimetype.startsWith('image/') ? 'image' : 'file';
          messageData.fileUrl = `${process.env.SERVER_URL}/uploads/chat-files/${uniqueFileName}`;
          messageData.fileName = req.file.originalname;
          messageData.fileSize = req.file.size;
          messageData.fileMimeType = req.file.mimetype;
          messageData.localFilePath = filePath;
          // For file uploads, only keep message if it's different from filename
          messageData.message = (message && message !== req.file.originalname) ? message : '';
        }
      } catch (fileError) {
        console.error('❌ File upload error:', fileError);
        return res.status(500).json({
          msg: 'Failed to upload file',
          error: fileError.message
        });
      }
    }

    // Create and save message
    console.log('💾 Saving message data:', {
      messageType: messageData.messageType,
      message: messageData.message,
      fileName: messageData.fileName,
      hasFile: !!messageData.fileUrl
    });

    const chatMessage = new ChatMessage(messageData);
    await chatMessage.save();

    // Populate sender and receiver info
    await chatMessage.populate('senderId', 'name email profilePicture isAdmin');
    await chatMessage.populate('receiverId', 'name email profilePicture isAdmin');
    if (chatMessage.replyTo) {
      await chatMessage.populate('replyTo', 'message messageType fileName');
    }

    res.status(201).json({
      success: true,
      data: chatMessage
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// Get conversation between two users
const getConversation = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { otherUserId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Validate other user exists
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Get conversation messages
    const messages = await ChatMessage.getConversation(userId, otherUserId, parseInt(page), parseInt(limit));

    // Mark messages as read (messages received by current user)
    await ChatMessage.updateMany(
      {
        senderId: otherUserId,
        receiverId: userId,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    res.json({
      success: true,
      data: {
        messages: messages.reverse(), // Reverse to show oldest first
        otherUser: {
          _id: otherUser._id,
          name: otherUser.name,
          email: otherUser.email,
          profilePicture: otherUser.profilePicture,
          isAdmin: otherUser.isAdmin
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: messages.length === parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// Get all conversations for current user
const getUserConversations = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    const conversations = await ChatMessage.getUserConversations(userId);

    res.json({
      success: true,
      data: conversations
    });
  } catch (error) {
    console.error('Get user conversations error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// Get all users for admin (to start conversations)
const getAllUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id || req.user._id;
    const currentUser = await User.findById(currentUserId);

    // Only admins can get all users
    if (!currentUser.isAdmin) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const users = await User.find(
      { _id: { $ne: currentUserId } },
      'name email profilePicture isAdmin createdAt'
    ).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// Mark message as read
const markMessageAsRead = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { messageId } = req.params;

    const message = await ChatMessage.findOne({
      _id: messageId,
      receiverId: userId
    });

    if (!message) {
      return res.status(404).json({ msg: 'Message not found' });
    }

    await message.markAsRead();

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// Delete message
const deleteMessage = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { messageId } = req.params;

    const message = await ChatMessage.findOne({
      _id: messageId,
      senderId: userId
    });

    if (!message) {
      return res.status(404).json({ msg: 'Message not found or unauthorized' });
    }

    // If message has a file, delete from Google Drive
    if (message.googleDriveFileId) {
      try {
        await googleDriveService.deleteFile(message.googleDriveFileId);
      } catch (fileError) {
        console.error('Error deleting file from Google Drive:', fileError);
      }
    }

    // Mark as deleted instead of actually deleting
    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();

    res.json({
      success: true,
      msg: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// Get Google Drive image with proper headers
const getGoogleDriveImage = async (req, res) => {
  try {
    const { fileId } = req.params;

    // Redirect to Google Drive image URL with proper headers
    const imageUrl = `https://drive.google.com/uc?id=${fileId}`;

    // Set CORS headers
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    });

    // Redirect to the Google Drive image
    res.redirect(imageUrl);

  } catch (error) {
    console.error('Error proxying Google Drive image:', error);
    res.status(500).json({ msg: 'Failed to load image' });
  }
};

module.exports = {
  sendMessage,
  getConversation,
  getUserConversations,
  getAllUsers,
  markMessageAsRead,
  deleteMessage,
  getGoogleDriveImage
};
