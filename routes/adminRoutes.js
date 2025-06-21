// routes/adminRoutes.js
const express = require('express');
const router = express.Router();

const {
  getPendingUsers,
  approveUser,
  rejectUser,
  getAllUsers,
} = require('../controllers/userApprovalController');

const {
  createTopic,
  getAllTopics,
  updateTopic,
  deleteTopic,
} = require('../controllers/dailyTopicController');

const {
  createLanguage,
  getLanguages,
  updateLanguage,
  deleteLanguage,
} = require('../controllers/programmingLanguageController');

const {
  startCron,
  stopCron,
  runJob,
} = require('../services/topicScheduler');

const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware');

// 🧠 Programming Language CRUD
router.post('/languages', isAuthenticated, isAdmin, createLanguage);
router.get('/languages', isAuthenticated, isAdmin, getLanguages);
router.put('/languages/:id', isAuthenticated, isAdmin, updateLanguage);
router.delete('/languages/:id', isAuthenticated, isAdmin, deleteLanguage);

// 🗓️ Daily Topic CRUD
router.post('/topics', isAuthenticated, isAdmin, createTopic);
router.get('/topics', isAuthenticated, isAdmin, getAllTopics);
router.put('/topics/:id', isAuthenticated, isAdmin, updateTopic);
router.delete('/topics/:id', isAuthenticated, isAdmin, deleteTopic);

// 👨‍🎓 User Approvals
router.get('/users/pending', isAuthenticated, isAdmin, getPendingUsers);
router.patch('/users/approve/:userId', isAuthenticated, isAdmin, approveUser);
router.patch('/users/reject/:userId', isAuthenticated, isAdmin, rejectUser);
router.get('/users/all', isAuthenticated, isAdmin, getAllUsers);

// 🔄 Cron Job Controls
router.post('/cron/start', isAuthenticated, isAdmin, (req, res) => {
  startCron();
  res.json({ msg: 'Cron job started' });
});

router.post('/cron/stop', isAuthenticated, isAdmin, (req, res) => {
  stopCron();
  res.json({ msg: 'Cron job stopped' });
});

router.post('/cron/run-now', isAuthenticated, isAdmin, async (req, res) => {
  await runJob();
  res.json({ msg: 'Manual cron job executed' });
});

module.exports = router;

// This code defines the admin routes for managing programming languages, daily topics, and user approvals.
// It includes CRUD operations for programming languages and daily topics, as well as user approval functionalities.
// The routes are protected by authentication and authorization middleware to ensure only admins can access them.
// The `isAuthenticated` middleware checks if the user is logged in, while `isAdmin` checks if the user has admin privileges.
// The routes are organized logically, making it easy to manage the admin functionalities of the application.
// This code defines the admin routes for managing programming languages, daily topics, and user approvals.
// It includes CRUD operations for programming languages and daily topics, as well as user approval functionalities.
// The routes are protected by authentication and authorization middleware to ensure only admins can access them.
// The `isAuthenticated` middleware checks if the user is logged in, while `isAdmin` checks if the user has admin privileges.