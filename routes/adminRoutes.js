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
  getDailyTopics,
  addDailyTopic,
  deleteDailyTopic,
  updateDailyTopic,
  getDailyKnowledge,
  addDailyKnowledge,
  updateDailyKnowledge,
  deleteDailyKnowledge,
} = require('../controllers/adminController');

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
// Allow all authenticated users to view languages
router.get('/languages', isAuthenticated, getLanguages);
// Restrict write operations to admins only
router.post('/languages', isAuthenticated, isAdmin, createLanguage);
router.put('/languages/:id', isAuthenticated, isAdmin, updateLanguage);
router.delete('/languages/:id', isAuthenticated, isAdmin, deleteLanguage);

// 🗓️ Daily Topic CRUD
router.route('/daily-topics')
  .post(isAuthenticated, isAdmin, addDailyTopic)
  .get(isAuthenticated, isAdmin, getDailyTopics);

router.put('/daily-topics/:id', isAuthenticated, isAdmin, updateDailyTopic);
router.delete('/daily-topics/:id', isAuthenticated, isAdmin, deleteDailyTopic);

// 📚 Daily Knowledge CRUD
router.route('/daily-knowledge')
  .post(isAuthenticated, isAdmin, addDailyKnowledge)
  .get(isAuthenticated, isAdmin, getDailyKnowledge);

router.put('/daily-knowledge/:id', isAuthenticated, isAdmin, updateDailyKnowledge);
router.delete('/daily-knowledge/:id', isAuthenticated, isAdmin, deleteDailyKnowledge);

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