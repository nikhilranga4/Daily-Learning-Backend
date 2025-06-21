// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sendAdminNotification = require('../utils/sendAdminNotification');

exports.register = async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    user = new User({
      email,
      password: hashedPassword,
      authProvider: 'local',
      approval_status: 'pending',
      createdAt: new Date(),
    });

    await user.save();

    // 🔔 Notify admin of approval request
    await sendAdminNotification(user);

    res.status(201).json({ msg: 'User registered, waiting for admin approval' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || user.authProvider !== 'local') {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    if (user.approval_status !== 'approved') {
      return res.status(403).json({ msg: 'Waiting for admin approval' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};
