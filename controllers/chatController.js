// controllers/chatController.js
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');
const megaService = require('../services/megaService');
const { Readable } = require('stream');
const path = require('path');
const fs = require('fs');

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

        // Try MEGA first, fallback to local storage
        let uploadResult;
        try {
          // Save file temporarily
          const uploadsDir = path.join(__dirname, '../uploads/chat-files');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          const uniqueFileName = `${Date.now()}_${req.file.originalname}`;
          const tempFilePath = path.join(uploadsDir, uniqueFileName);
          fs.writeFileSync(tempFilePath, req.file.buffer);

          // Upload to MEGA and get the file node handle
          const megaUploadResult = await megaService.uploadFile(tempFilePath, uniqueFileName);

          // Optionally, delete the temp file after upload
          fs.unlinkSync(tempFilePath);

          // Update message data with MEGA info
          const isImage = req.file.mimetype.startsWith('image/');
          messageData.messageType = isImage ? 'image' : 'file';
          // Construct a URL to our own backend proxy, which is essential for previews
          messageData.fileUrl = `${process.env.SERVER_URL}/api/chat/mega-file/${megaUploadResult.nodeId}`;
          console.log('✅ Generated Proxy URL for Frontend:', messageData.fileUrl);
          messageData.fileName = req.file.originalname;
          messageData.fileSize = req.file.size;
          messageData.fileMimeType = req.file.mimetype;
          messageData.megaFileHandle = megaUploadResult && megaUploadResult.nodeId ? megaUploadResult.nodeId : null;
          // For file uploads, only keep message if it's different from filename
          messageData.message = (message && message !== req.file.originalname) ? message : '';
        } catch (uploadError) {
          console.error('❌ MEGA upload error, falling back to local storage:', uploadError);
          // Fallback to local file storage
          const uploadsDir = path.join(__dirname, '../uploads/chat-files');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          const uniqueFileName = `${Date.now()}_${req.file.originalname}`;
          const filePath = path.join(uploadsDir, uniqueFileName);
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

    // If message has a MEGA file, delete it from MEGA
    if (message.megaFileHandle) {
      try {
        await megaService.deleteFile(message.megaFileHandle);
      } catch (fileError) {
        console.error('Error deleting file from MEGA:', fileError);
      }
    }

    // If message used local file storage, optionally delete local file
    if (message.localFilePath && fs.existsSync(message.localFilePath)) {
      try {
        fs.unlinkSync(message.localFilePath);
      } catch (fileError) {
        console.error('Error deleting local file:', fileError);
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

// Get MEGA file
const getMegaFile = async (req, res) => {
  const { nodeId } = req.params;
  console.log(`
--- 🖼️  Image Preview Request Received ---`);
  console.log(`Node ID: ${nodeId}`);

  if (!nodeId) {
    console.error('❌ Error: Node ID is missing.');
    return res.status(400).json({ message: 'Node ID is required.' });
  }

  try {
    // Find the message to get the mime type, which helps the browser render it correctly.
    const message = await ChatMessage.findOne({ megaFileHandle: nodeId });

    if (message && message.fileMimeType) {
      console.log(`📄 Found message. Setting Content-Type to: ${message.fileMimeType}`);
      res.setHeader('Content-Type', message.fileMimeType);
    } else {
      console.warn(`⚠️ Warning: Could not find message for node ${nodeId}. Falling back to generic 'application/octet-stream'.`);
      res.setHeader('Content-Type', 'application/octet-stream');
    }

    console.log('☁️  Requesting file stream from MEGA...');
    const megaStream = await megaService.downloadFileAsStream(nodeId);
    console.log('✅ Received stream from MEGA. Piping to response...');

    megaStream.on('error', (error) => {
      console.error(`❌❌❌ MEGA Stream Error for node ${nodeId}:`, error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Failed to stream file from MEGA.' });
      }
    });

    megaStream.pipe(res);

  } catch (error) {
    console.error(`❌❌❌ Controller Error in getMegaFile for node ${nodeId}:`, error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error while fetching MEGA file.' });
    }
  }
};

module.exports = {
  sendMessage,
  getConversation,
  getUserConversations,
  getAllUsers,
  markMessageAsRead,
  deleteMessage,
  getMegaFile
};
