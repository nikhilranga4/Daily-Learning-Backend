const DailyKnowledge = require('../models/DailyKnowledge');
const UserKnowledgeView = require('../models/UserKnowledgeView');
const { generateKnowledgeContent } = require('../services/llmService');

// Get all available knowledge for user (including past generated content)
const getAllKnowledge = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    console.log('Getting all knowledge for user:', userId);

    // Find all knowledge topics (both scheduled and generated)
    const knowledgeTopics = await DailyKnowledge.find({})
      .sort({ date: -1, createdAt: -1 }); // Most recent first

    if (knowledgeTopics.length === 0) {
      return res.json({
        message: 'No knowledge topics available',
        data: []
      });
    }

    // Check which topics user has already viewed
    const viewedTopics = await UserKnowledgeView.find({
      userId,
      dailyKnowledgeId: { $in: knowledgeTopics.map(k => k._id) }
    });

    const viewedTopicIds = viewedTopics.map(v => v.dailyKnowledgeId.toString());

    // Format response with additional metadata
    const formattedTopics = knowledgeTopics.map(topic => {
      const isViewed = viewedTopicIds.includes(topic._id.toString());
      const topicDate = new Date(topic.date);
      const todayDate = new Date(today);

      // Fix date comparison - normalize to start of day
      topicDate.setHours(0, 0, 0, 0);
      todayDate.setHours(0, 0, 0, 0);

      const isToday = topicDate.getTime() === todayDate.getTime();
      const isPast = topicDate.getTime() < todayDate.getTime();
      const isFuture = topicDate.getTime() > todayDate.getTime();

      console.log(`Topic: ${topic.knowledgeTopic}, Date: ${topic.date}, Today: ${today}, isToday: ${isToday}, isPast: ${isPast}, isFuture: ${isFuture}, isGenerated: ${topic.isGenerated}`);

      return {
        _id: topic._id,
        knowledgeTopic: topic.knowledgeTopic,
        contentType: topic.contentType,
        date: topic.date,
        isGenerated: topic.isGenerated,
        isViewed: isViewed,
        generatedAt: topic.generatedAt,
        isToday: isToday,
        isPast: isPast,
        isFuture: isFuture,
        canGenerate: topic.isGenerated && !isViewed, // Can view if generated but not viewed
        canViewToday: isToday && !isViewed, // Can generate today if not viewed
        canGenerateMissed: isPast && !topic.isGenerated, // Can generate missed topics anytime
        showInPast: isPast && topic.isGenerated, // Show in past section if generated
        showAsMissed: isPast && !topic.isGenerated // Show past ungenerated topics as "missed"
      };
    });

    res.json({ data: formattedTopics });
  } catch (error) {
    console.error('Error getting all knowledge:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Generate and get knowledge content
const generateAndGetKnowledge = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { knowledgeId } = req.params;

    console.log('Generating knowledge for user:', userId, 'knowledgeId:', knowledgeId);

    // Find the knowledge topic
    const knowledgeTopic = await DailyKnowledge.findById(knowledgeId);

    if (!knowledgeTopic) {
      return res.status(404).json({ msg: 'Knowledge topic not found' });
    }

    // Check if user has already viewed this today
    const existingView = await UserKnowledgeView.findOne({
      userId,
      dailyKnowledgeId: knowledgeId
    });

    if (existingView) {
      return res.status(400).json({
        msg: 'You have already viewed this knowledge topic today',
        data: {
          content: knowledgeTopic.generatedContent,
          viewedAt: existingView.viewedAt
        }
      });
    }

    // Generate content if not already generated
    if (!knowledgeTopic.isGenerated) {
      console.log('Generating new content...');

      const generatedContent = await generateKnowledgeContent({
        knowledgeTopic: knowledgeTopic.knowledgeTopic,
        contentType: knowledgeTopic.contentType
      });

      // Update the knowledge topic with generated content
      knowledgeTopic.generatedContent = generatedContent;
      knowledgeTopic.isGenerated = true;
      knowledgeTopic.generatedAt = new Date();
      await knowledgeTopic.save();
    }

    // Record user view
    const userView = new UserKnowledgeView({
      userId,
      dailyKnowledgeId: knowledgeId,
      viewedAt: new Date()
    });
    await userView.save();

    // Return the content
    res.json({
      data: {
        _id: knowledgeTopic._id,
        knowledgeTopic: knowledgeTopic.knowledgeTopic,
        contentType: knowledgeTopic.contentType,
        content: knowledgeTopic.generatedContent,
        generatedAt: knowledgeTopic.generatedAt,
        viewedAt: userView.viewedAt
      }
    });

  } catch (error) {
    console.error('Error generating knowledge:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Get user's knowledge history
const getUserKnowledgeHistory = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    const knowledgeHistory = await UserKnowledgeView.find({ userId })
      .populate('dailyKnowledgeId')
      .sort({ viewedAt: -1 })
      .limit(50);

    const formattedHistory = knowledgeHistory.map(view => ({
      _id: view._id,
      knowledgeId: view.dailyKnowledgeId._id,
      knowledgeTopic: view.dailyKnowledgeId.knowledgeTopic,
      contentType: view.dailyKnowledgeId.contentType,
      viewedAt: view.viewedAt,
      readingTime: view.readingTime
    }));

    res.json({ data: formattedHistory });
  } catch (error) {
    console.error('Error getting knowledge history:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Get specific knowledge content (for history viewing)
const getKnowledgeContent = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { knowledgeId } = req.params;

    // Check if user has viewed this knowledge
    const userView = await UserKnowledgeView.findOne({
      userId,
      dailyKnowledgeId: knowledgeId
    });

    if (!userView) {
      return res.status(403).json({ msg: 'You have not viewed this knowledge topic' });
    }

    // Get the knowledge content
    const knowledgeTopic = await DailyKnowledge.findById(knowledgeId);

    if (!knowledgeTopic || !knowledgeTopic.isGenerated) {
      return res.status(404).json({ msg: 'Knowledge content not found' });
    }

    res.json({
      data: {
        _id: knowledgeTopic._id,
        knowledgeTopic: knowledgeTopic.knowledgeTopic,
        contentType: knowledgeTopic.contentType,
        content: knowledgeTopic.generatedContent,
        generatedAt: knowledgeTopic.generatedAt,
        viewedAt: userView.viewedAt
      }
    });

  } catch (error) {
    console.error('Error getting knowledge content:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

module.exports = {
  getTodaysKnowledge: getAllKnowledge, // Renamed but keeping same endpoint
  generateAndGetKnowledge,
  getUserKnowledgeHistory,
  getKnowledgeContent
};
