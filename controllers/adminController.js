// controllers/adminController.js
const User = require('../models/User');

exports.getPendingUsers = async (req, res) => {
  try {
    const pendingUsers = await User.find({ approval_status: 'pending', authProvider: 'local' });
    res.json(pendingUsers);
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
