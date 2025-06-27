// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sendAdminNotification = require('../utils/sendAdminNotification');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: `${process.env.GITHUB_CALLBACK_URL}/auth/github/callback`,
  scope: ['user:email']
},
async (accessToken, refreshToken, profile, done) => {
  // Your auth logic here
}));

// Google Strategy Configuration
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.GOOGLE_CALLBACK_URL}/auth/google/callback`,
  scope: ['profile', 'email']
},
async (accessToken, refreshToken, profile, done) => {
  // Your auth logic here
}));

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

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    // User is already attached to req by the auth middleware
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        approval_status: user.approval_status,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};
