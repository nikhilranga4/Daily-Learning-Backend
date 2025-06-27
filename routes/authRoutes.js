// routes/authRoutes.js
const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { register, login, getProfile } = require('../controllers/authController');
const { isAuthenticated } = require('../middleware/authMiddleware');

const router = express.Router();

// Local Register/Login
router.post('/register', register);
router.post('/login', login);

// Get user profile (protected route)
router.get('/profile', isAuthenticated, getProfile);

// Google Auth Start
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google Auth Callback
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/failure' }),
  (req, res) => {
    // Successful login - issue JWT token
    const token = jwt.sign({ userId: req.user._id, isAdmin: req.user.isAdmin }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Redirect to frontend with token
    const redirectUrl = `${process.env.FRONTEND_URL}/auth-success?token=${token}`;
    res.redirect(redirectUrl);
  }
);

// GitHub Auth Start
router.get('/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

// GitHub Auth Callback
router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: '/auth/failure' }),
  (req, res) => {
    const token = jwt.sign({ userId: req.user._id, isAdmin: req.user.isAdmin }, process.env.JWT_SECRET, { expiresIn: '7d' });

    const redirectUrl = `${process.env.FRONTEND_URL}/auth-success?token=${token}`;
    res.redirect(redirectUrl);
  }
);

// Failure route (optional)
router.get('/failure', (req, res) => {
  res.status(401).json({ msg: 'OAuth login failed' });
});

module.exports = router;
