// controllers/dailyTopicController.js
const DailyTopic = require('../models/DailyTopic');

exports.createTopic = async (req, res) => {
  try {
    const { languageId, topic, date: dateStr } = req.body;
    
    // Validate required fields
    if (!languageId || !topic || !dateStr) {
      throw new Error('All fields are required');
    }
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new Error('Invalid date format. Expected YYYY-MM-DD');
    }
    
    // Parse date
    const [year, month, day] = dateStr.split('-').map(Number);
    const scheduledDate = new Date(Date.UTC(year, month - 1, day));
    
    // Check for existing topic using string date
    const existing = await DailyTopic.findOne({ date: dateStr });
    
    if (existing) {
      return res.status(400).json({
        msg: 'A topic already exists for this date',
        error: 'DUPLICATE_DATE'
      });
    }
    
    // Create and save topic
    const newTopic = new DailyTopic({
      languageId,
      topic,
      date: dateStr, // Store as string
      scheduledDate, // Store as Date for sorting
      createdBy: req.user._id
    });
    
    await newTopic.save();
    
    res.status(201).json({
      ...newTopic.toObject(),
      date: dateStr // Return original date string
    });
    
  } catch (err) {
    console.error('Error creating topic:', err);
    res.status(400).json({
      msg: 'Failed to create topic',
      error: err.message,
      code: err.code
    });
  }
};

exports.getTopics = async (req, res) => {
  try {
    const topics = await DailyTopic.find()
      .populate('languageId', 'name')
      .populate('createdBy', 'email')
      .sort({ scheduledDate: -1 });
    
    // Map to ensure date is returned as string
    const formattedTopics = topics.map(topic => ({
      ...topic.toObject(),
      date: topic.date // Ensure we return the string date
    }));
    
    res.json(formattedTopics);
  } catch (err) {
    console.error('Error fetching topics:', err);
    res.status(500).json({ 
      msg: 'Error fetching topics',
      error: err.message 
    });
  }
};

exports.updateTopic = async (req, res) => {
  try {
    const topic = await DailyTopic.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(topic);
  } catch (err) {
    res.status(400).json({ ...err, msg: 'Failed to update topic' });
  }
};

exports.deleteTopic = async (req, res) => {
  try {
    await DailyTopic.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Topic deleted' });
  } catch (err) {
    res.status(400).json({ ...err, msg: 'Failed to delete topic' });
  }
};
