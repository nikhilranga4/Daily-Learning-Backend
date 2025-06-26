// controllers/adminController.js
const User = require('../models/User');
const ProgrammingLanguage = require('../models/ProgrammingLanguage');
const DailyTopic = require('../models/DailyTopic');
const DailyKnowledge = require('../models/DailyKnowledge');

// User Management
exports.getPendingUsers = async (req, res) => {
  try {
    const pendingUsers = await User.find({ approval_status: 'pending' });
    res.json(pendingUsers);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.approveUser = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findByIdAndUpdate(userId, { approval_status: 'approved' }, { new: true });
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json({ msg: 'User approved successfully' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.rejectUser = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findByIdAndUpdate(userId, { approval_status: 'rejected' }, { new: true });
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json({ msg: 'User rejected successfully' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// Language Management
exports.getLanguages = async (req, res) => {
  try {
    const languages = await ProgrammingLanguage.find();
    res.json(languages);
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

exports.addLanguage = async (req, res) => {
  const { name } = req.body;
  try {
    let language = await ProgrammingLanguage.findOne({ name });
    if (language) {
      return res.status(400).json({ msg: 'Language already exists' });
    }
    language = new ProgrammingLanguage({ name });
    await language.save();
    res.json(language);
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

// Daily Topic Management
exports.getDailyTopics = async (req, res) => {
  try {
    const topics = await DailyTopic.find({})
      .populate({
        path: 'languageId',
        select: 'name',
        model: 'ProgrammingLanguage'
      })
      .sort({ date: -1 });

    const topicsWithLanguage = topics.map(topic => {
      const languageName = topic.languageId?.name || 'Unknown';
      return {
        ...topic.toObject(),
        languageName,
        languageId: topic.languageId?._id || topic.languageId
      };
    });

    res.json(topicsWithLanguage);
  } catch (err) {
    console.error('Error getting topics:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.addDailyTopic = async (req, res) => {
  try {
    const { languageId, topic, date, questionLevel, questionCount } = req.body;

    if (!languageId || !topic || !date) {
      return res.status(400).json({ msg: 'Please provide all required fields' });
    }

    // Validate question level
    const validLevels = ['Easy', 'Medium', 'Hard'];
    if (questionLevel && !validLevels.includes(questionLevel)) {
      return res.status(400).json({ msg: 'Invalid question level. Must be Easy, Medium, or Hard' });
    }

    // Validate question count
    if (questionCount && (questionCount < 15 || questionCount > 25)) {
      return res.status(400).json({ msg: 'Question count must be between 15 and 25' });
    }



    // Store date as string in YYYY-MM-DD format (no timezone conversion)
    const newTopic = new DailyTopic({
      languageId,
      topic,
      date, // Store as string in YYYY-MM-DD format
      questionLevel: questionLevel || 'Medium',
      questionCount: questionCount || 20,
      createdBy: req.user._id
    });

    await newTopic.save();

    res.status(201).json({
      ...newTopic.toObject(),
      date // Ensure we return the string date
    });
  } catch (err) {
    console.error('Error creating topic:', err);

    // Handle duplicate key error
    if (err.code === 11000) {
      return res.status(400).json({
        msg: 'A topic already exists for this date',
        error: 'DUPLICATE_DATE'
      });
    }

    res.status(500).json({
      msg: 'Error creating topic',
      error: err.message
    });
  }
};

exports.updateDailyTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const { languageId, topic, date, questionLevel, questionCount } = req.body;

    // Validate question level if provided
    const validLevels = ['Easy', 'Medium', 'Hard'];
    if (questionLevel && !validLevels.includes(questionLevel)) {
      return res.status(400).json({ msg: 'Invalid question level. Must be Easy, Medium, or Hard' });
    }

    // Validate question count if provided
    if (questionCount && (questionCount < 15 || questionCount > 25)) {
      return res.status(400).json({ msg: 'Question count must be between 15 and 25' });
    }

    const updateData = { languageId, topic, date };
    if (questionLevel) updateData.questionLevel = questionLevel;
    if (questionCount) updateData.questionCount = questionCount;

    const updatedTopic = await DailyTopic.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('languageId', 'name');

    if (!updatedTopic) {
      return res.status(404).json({ msg: 'Topic not found' });
    }

    res.json(updatedTopic);
  } catch (err) {
    console.error('Error updating topic:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.deleteDailyTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTopic = await DailyTopic.findByIdAndDelete(id);
    if (!deletedTopic) {
      return res.status(404).json({ msg: 'Topic not found' });
    }
    res.json({ msg: 'Topic deleted successfully' });
  } catch (err) {
    console.error('Error deleting topic:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Daily Knowledge Management
exports.getDailyKnowledge = async (req, res) => {
  try {
    const knowledgeTopics = await DailyKnowledge.find({})
      .populate('createdBy', 'email')
      .sort({ date: -1, createdAt: -1 });

    res.json(knowledgeTopics);
  } catch (err) {
    console.error('Error fetching knowledge topics:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.addDailyKnowledge = async (req, res) => {
  try {
    const { knowledgeTopic, date, contentType } = req.body;
    const createdBy = req.user.id;

    // Validate required fields
    if (!knowledgeTopic || !date) {
      return res.status(400).json({ msg: 'Knowledge topic and date are required' });
    }

    // Validate content type
    const validContentTypes = ['Concept', 'Tutorial', 'Best Practice', 'Tips & Tricks', 'Deep Dive'];
    if (contentType && !validContentTypes.includes(contentType)) {
      return res.status(400).json({ msg: 'Invalid content type' });
    }

    const knowledgeData = {
      knowledgeTopic,
      date,
      contentType: contentType || 'Concept',
      createdBy
    };

    const newKnowledge = new DailyKnowledge(knowledgeData);
    await newKnowledge.save();

    // Populate the response
    const populatedKnowledge = await DailyKnowledge.findById(newKnowledge._id)
      .populate('createdBy', 'email');

    res.status(201).json(populatedKnowledge);
  } catch (err) {
    console.error('Error adding knowledge topic:', err);

    // Handle duplicate key error
    if (err.code === 11000) {
      return res.status(400).json({
        msg: 'A knowledge topic already exists for this date',
        error: 'DUPLICATE_DATE'
      });
    }

    res.status(500).json({
      msg: 'Error creating knowledge topic',
      error: err.message
    });
  }
};

exports.updateDailyKnowledge = async (req, res) => {
  try {
    const { id } = req.params;
    const { knowledgeTopic, date, contentType } = req.body;

    // Validate content type if provided
    const validContentTypes = ['Concept', 'Tutorial', 'Best Practice', 'Tips & Tricks', 'Deep Dive'];
    if (contentType && !validContentTypes.includes(contentType)) {
      return res.status(400).json({ msg: 'Invalid content type' });
    }

    const updateData = { knowledgeTopic, date };
    if (contentType) updateData.contentType = contentType;

    const updatedKnowledge = await DailyKnowledge.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('createdBy', 'email');

    if (!updatedKnowledge) {
      return res.status(404).json({ msg: 'Knowledge topic not found' });
    }

    res.json(updatedKnowledge);
  } catch (err) {
    console.error('Error updating knowledge topic:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.deleteDailyKnowledge = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedKnowledge = await DailyKnowledge.findByIdAndDelete(id);
    if (!deletedKnowledge) {
      return res.status(404).json({ msg: 'Knowledge topic not found' });
    }
    res.json({ msg: 'Knowledge topic deleted successfully' });
  } catch (err) {
    console.error('Error deleting knowledge topic:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

module.exports = exports;
