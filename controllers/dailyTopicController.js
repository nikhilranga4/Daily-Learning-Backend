// controllers/dailyTopicController.js
const DailyTopic = require('../models/DailyTopic');

exports.createTopic = async (req, res) => {
  try {
    const topic = new DailyTopic({
      ...req.body,
      createdBy: req.user._id,
    });
    await topic.save();
    res.status(201).json(topic);
  } catch (err) {
    res.status(400).json({ msg: 'Failed to create topic', error: err.message });
  }
};

exports.getAllTopics = async (req, res) => {
  try {
    const topics = await DailyTopic.find()
      .populate('languageId', 'name')
      .populate('createdBy', 'email')
      .sort({ date: -1 });
    res.json(topics);
  } catch (err) {
    res.status(500).json({ msg: 'Error fetching topics' });
  }
};

exports.updateTopic = async (req, res) => {
  try {
    const topic = await DailyTopic.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(topic);
  } catch (err) {
    res.status(400).json({ msg: 'Failed to update topic' });
  }
};

exports.deleteTopic = async (req, res) => {
  try {
    await DailyTopic.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Topic deleted' });
  } catch (err) {
    res.status(400).json({ msg: 'Failed to delete topic' });
  }
};
