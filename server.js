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
app.use('/api/llm', require('./routes/llmRoutes'));

// Mock LLM endpoint for testing
app.post('/mock-llm/chat/completions', (req, res) => {
  const { messages, model, temperature = 0.7 } = req.body;

  // Simulate processing delay
  setTimeout(() => {
    const lastMessage = messages[messages.length - 1];
    const userInput = lastMessage.content.toLowerCase();

    // Generate dynamic responses based on input and model type
    let response = '';

    if (model.includes('creative')) {
      response = generateCreativeResponse(userInput, lastMessage.content);
    } else if (model.includes('precise')) {
      response = generatePreciseResponse(userInput, lastMessage.content);
    } else {
      response = generateStandardResponse(userInput, lastMessage.content);
    }

    const mockResponse = {
      choices: [{
        message: {
          content: response
        }
      }],
      usage: {
        completion_tokens: Math.floor(response.length / 4),
        prompt_tokens: Math.floor(lastMessage.content.length / 4),
        total_tokens: Math.floor((response.length + lastMessage.content.length) / 4)
      }
    };

    res.json(mockResponse);
  }, Math.random() * 1000 + 500); // Random delay 0.5-1.5 seconds
});

// Helper functions for different response types
function generateCreativeResponse(userInput, originalInput) {
  if (userInput.includes('hello') || userInput.includes('hi')) {
    return `🌟 **Greetings, creative soul!** 🌟\n\nWhat an exciting moment to connect! I'm your **Creative AI Assistant**, ready to dive into the realms of imagination and innovation.\n\n✨ *Let's explore ideas together!* ✨\n\nWhat creative challenge shall we tackle today? Perhaps:\n- 🎨 Brainstorming unique solutions\n- 📝 Crafting compelling narratives  \n- 💡 Generating innovative concepts\n- 🚀 Designing something extraordinary\n\nThe canvas of possibility awaits! 🎭`;
  }

  if (userInput.includes('code') || userInput.includes('program')) {
    return `🎨 **Creative Coding Inspiration!** 🎨\n\nLet's approach programming as an art form! Here's a creative solution:\n\n\`\`\`javascript\n// ✨ Magical Code Creation ✨\nclass CreativeAssistant {\n  constructor() {\n    this.imagination = Infinity;\n    this.inspiration = '🌈';\n  }\n  \n  generateIdea(prompt) {\n    return \`💡 \${prompt} + creativity = amazing results!\`;\n  }\n  \n  sparkJoy() {\n    return '✨ Code can be poetry in motion! ✨';\n  }\n}\n\nconst assistant = new CreativeAssistant();\nconsole.log(assistant.sparkJoy());\n\`\`\`\n\n*Remember: Every line of code is a brushstroke on the digital canvas!* 🎭`;
  }

  return `🎨 **Creative Response Activated!** 🎨\n\nYou said: *"${originalInput}"*\n\nLet me paint you a response with words! Your query sparks these creative thoughts:\n\n🌟 **Imaginative Perspective**: Every question is a doorway to infinite possibilities!\n\n💫 **Creative Elements**:\n- **Bold innovations** waiting to be discovered\n- *Flowing ideas* like rivers of inspiration\n- \`creative.solutions()\` in every challenge\n\n\`\`\`javascript\n// Creative problem-solving approach\nfunction exploreIdeas(input) {\n  const creativity = input.split('').map(char => \n    char + '✨'\n  ).join('');\n  \n  return \`Transformed: \${creativity}\`;\n}\n\nconsole.log(exploreIdeas('${originalInput.slice(0, 10)}'));\n\`\`\`\n\n*The creative AI is dancing with your ideas!* 🎭✨`;
}

function generatePreciseResponse(userInput, originalInput) {
  if (userInput.includes('hello') || userInput.includes('hi')) {
    return `**Precise AI Assistant - Status: Active**\n\nGreeting acknowledged. I am your Precise AI Assistant, optimized for:\n\n- Accurate information delivery\n- Factual responses\n- Technical precision\n- Concise communication\n\n**Current session parameters:**\n- Temperature: 0.1 (low variability)\n- Focus: Maximum accuracy\n- Response style: Direct and factual\n\nHow may I assist you with precise information today?`;
  }

  if (userInput.includes('code') || userInput.includes('program')) {
    return `**Technical Analysis: Code Request Detected**\n\n**Optimal coding approach:**\n\n\`\`\`javascript\n// Precise, efficient implementation\nclass PreciseAssistant {\n  constructor() {\n    this.accuracy = 99.9;\n    this.responseTime = 'optimized';\n  }\n  \n  processQuery(input) {\n    // Validate input\n    if (!input || typeof input !== 'string') {\n      throw new Error('Invalid input parameter');\n    }\n    \n    // Process with precision\n    return {\n      result: input.trim().toLowerCase(),\n      confidence: this.accuracy,\n      timestamp: Date.now()\n    };\n  }\n}\n\n// Usage example\nconst assistant = new PreciseAssistant();\nconst result = assistant.processQuery('${originalInput}');\nconsole.log(result);\n\`\`\`\n\n**Key characteristics:**\n- Error handling implemented\n- Type validation included\n- Performance optimized\n- Documentation complete`;
  }

  return `**Precise Analysis Complete**\n\n**Input received:** "${originalInput}"\n**Processing status:** Successful\n**Response type:** Factual\n\n**Analysis results:**\n- Character count: ${originalInput.length}\n- Word count: ${originalInput.split(' ').length}\n- Classification: User query\n\n**Technical specifications:**\n- Model: Precise AI Assistant\n- Temperature: 0.1\n- Max tokens: 4000\n- Response accuracy: High\n\n**Recommended actions:**\n1. Provide specific, factual information\n2. Minimize ambiguity\n3. Include relevant technical details\n4. Maintain professional tone\n\n**Status:** Ready for next query`;
}

function generateStandardResponse(userInput, originalInput) {
  if (userInput.includes('hello') || userInput.includes('hi')) {
    return `Hello! 👋 I'm your AI Assistant, and I'm here to help!\n\nI can assist you with:\n- **Programming questions** and code examples\n- **Problem solving** and explanations\n- **Creative tasks** and brainstorming\n- **Technical guidance** and best practices\n\nWhat would you like to work on today? Feel free to ask me anything! 😊`;
  }

  if (userInput.includes('help')) {
    return `I'm here to help! 🤝\n\nHere are some things I can assist you with:\n\n**💻 Programming & Development:**\n- Code examples and explanations\n- Debugging assistance\n- Best practices and patterns\n- Framework guidance\n\n**🧠 Problem Solving:**\n- Breaking down complex problems\n- Algorithm suggestions\n- Logic and reasoning\n- Step-by-step solutions\n\n**📚 Learning & Education:**\n- Concept explanations\n- Learning resources\n- Practice exercises\n- Knowledge verification\n\nJust ask me a specific question, and I'll do my best to provide a helpful response!`;
  }

  if (userInput.includes('code') || userInput.includes('program')) {
    return `Great! I love helping with programming! 💻\n\nHere's a helpful code example related to your query:\n\n\`\`\`javascript\n// AI Assistant Helper Functions\nclass AIAssistant {\n  constructor(name = 'AI Helper') {\n    this.name = name;\n    this.capabilities = [\n      'code generation',\n      'problem solving', \n      'explanations',\n      'debugging help'\n    ];\n  }\n  \n  async processRequest(userInput) {\n    console.log(\`Processing: \${userInput}\`);\n    \n    // Analyze the request\n    const analysis = this.analyzeInput(userInput);\n    \n    // Generate appropriate response\n    return this.generateResponse(analysis);\n  }\n  \n  analyzeInput(input) {\n    return {\n      type: 'user_query',\n      content: input,\n      timestamp: new Date().toISOString()\n    };\n  }\n  \n  generateResponse(analysis) {\n    return \`Here's my response to: \${analysis.content}\`;\n  }\n}\n\n// Usage\nconst assistant = new AIAssistant();\nassistant.processRequest('${originalInput}').then(console.log);\n\`\`\`\n\n**Key features:**\n- ✅ Modular design\n- ✅ Async/await support\n- ✅ Error handling ready\n- ✅ Extensible architecture\n\nNeed help with a specific programming concept or problem? Just ask! 🚀`;
  }

  return `Thanks for your message! 😊\n\nYou said: *"${originalInput}"*\n\nI'm processing your request and here's my response:\n\n**Understanding your query:**\nI can see you're looking for assistance, and I'm here to help! Whether you need:\n\n- 🔧 **Technical solutions**\n- 💡 **Creative ideas** \n- 📖 **Explanations and learning**\n- 🚀 **Project guidance**\n\n**Here's a helpful code snippet:**\n\`\`\`javascript\n// Response generator\nfunction generateHelpfulResponse(userQuery) {\n  const response = {\n    understood: true,\n    helpful: true,\n    query: userQuery,\n    assistance: 'provided'\n  };\n  \n  return \`AI Assistant: \${response.assistance}\`;\n}\n\nconsole.log(generateHelpfulResponse('${originalInput.slice(0, 20)}...'));\n\`\`\`\n\nFeel free to ask me anything more specific, and I'll provide detailed assistance! 🎯`;
}

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
