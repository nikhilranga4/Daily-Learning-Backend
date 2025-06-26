require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const path = require('path');
const MongoStore = require('connect-mongo');
const connectDB = require('./config/db');

// Connect to Database
connectDB();

// Passport config
require('./config/passport');

const app = express();

// CORS setup
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'a-very-strong-secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/auth', require('./routes/authRoutes'));
app.use('/admin', require('./routes/adminRoutes'));
app.use('/exam', require('./routes/examRoutes'));
app.use('/knowledge', require('./routes/knowledgeRoutes'));
app.use('/questions', require('./routes/questionRoutes'));
app.use('/api/chat', require('./routes/chat'));

// OAuth callback route for Google Drive authentication
app.get('/oauth2callback', (req, res) => {
  const { code, error } = req.query;

  if (error) {
    res.send(`
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>❌ Authentication Failed</h2>
          <p>Error: ${error}</p>
          <p>Please try again or contact support.</p>
        </body>
      </html>
    `);
    return;
  }

  if (code) {
    res.send(`
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>✅ Authorization Code Received</h2>
          <p>Copy this authorization code:</p>
          <div style="background: #f5f5f5; padding: 10px; border-radius: 5px; font-family: monospace; word-break: break-all;">
            ${code}
          </div>
          <p>Paste it into your terminal where the authentication script is running.</p>
          <p>You can close this tab after copying the code.</p>
        </body>
      </html>
    `);
  } else {
    res.send(`
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>⚠️ No Authorization Code</h2>
          <p>No authorization code was received. Please try the authentication process again.</p>
        </body>
      </html>
    `);
  }
});

// Serve uploaded chat files
app.use('/uploads/chat-files', express.static(path.join(__dirname, 'uploads/chat-files')));

// Start Cron (auto daily topic + LLM) - DISABLED
// require('./services/topicScheduler');

// Basic error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode at http://localhost:${PORT}`);
});
