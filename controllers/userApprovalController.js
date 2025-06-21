// controllers/userApprovalController.js
const User = require('../models/User');

exports.getPendingUsers = async (req, res) => {
  try {
    const pending = await User.find({ approval_status: 'pending', authProvider: 'local' });
    res.json(pending);
  } catch (err) {
    res.status(500).json({ msg: 'Failed to fetch pending users' });
  }
};

exports.approveUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.userId, { approval_status: 'approved' }, { new: true });
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json({ msg: 'User approved', user });
  } catch (err) {
    res.status(500).json({ msg: 'Approval failed' });
  }
};

exports.rejectUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.userId, { approval_status: 'rejected' }, { new: true });
    res.json({ msg: 'User rejected', user });
  } catch (err) {
    res.status(500).json({ msg: 'Rejection failed' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ msg: 'Failed to fetch users' });
  }
};
