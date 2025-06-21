// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const passport = require('passport');
const { register, login } = require('../controllers/authController');

// Local registration & login
router.post('/register', register);
router.post('/login', login);

// Google Auth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { session: false }), (req, res) => {
  // Send token or redirect
  res.send('Google login successful!');
});

// GitHub Auth
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
router.get('/github/callback', passport.authenticate('github', { session: false }), (req, res) => {
  // Send token or redirect
  res.send('GitHub login successful!');
});

module.exports = router;
