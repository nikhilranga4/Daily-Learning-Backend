# LLM Integration System

## Overview
This system provides a comprehensive LLM (Large Language Model) integration with admin management, user chat interface, and Mega Drive storage for conversation history.

## Features Implemented

### 1. Database Models
- **LLMModel**: Stores LLM configurations (API keys, providers, settings)
- **LLMConversation**: Stores conversation metadata and messages
- **Mega Drive Integration**: Automatic backup of conversations as JSON files

### 2. Backend API Endpoints

#### User Endpoints
- `GET /api/llm/models` - Get available models
- `POST /api/llm/conversations` - Create new conversation
- `GET /api/llm/conversations` - Get user conversations
- `GET /api/llm/conversations/:id` - Get specific conversation
- `POST /api/llm/conversations/:id/messages` - Send message
- `PUT /api/llm/conversations/:id/title` - Update conversation title
- `DELETE /api/llm/conversations/:id` - Delete conversation
- `GET /api/llm/conversations/:id/history` - Get Mega Drive history
- `POST /api/llm/conversations/:id/restore/:fileId` - Restore from backup

#### Admin Endpoints
- `GET /api/llm/admin/models` - Get all models (admin)
- `POST /api/llm/admin/models` - Create new model (admin)
- `PUT /api/llm/admin/models/:id` - Update model (admin)
- `DELETE /api/llm/admin/models/:id` - Delete model (admin)
- `PUT /api/llm/admin/models/:id/default` - Set default model (admin)
- `GET /api/llm/admin/stats` - Get usage statistics (admin)

### 3. Frontend Components
- **LLMChat**: Main chat interface with ChatGPT-style UI
- **LLMSidebar**: Conversation history sidebar
- **LLMMessageComponent**: Message display with code highlighting
- **LLMModelSelector**: Model selection modal
- **LLMManagement**: Admin panel for managing models
- **LLMModelForm**: Admin form for adding/editing models

### 4. Supported Providers
- OpenAI (GPT models)
- Anthropic (Claude models)
- OpenRouter (Multiple models)
- DeepSeek
- Google Gemini
- Custom providers

### 5. Mega Drive Integration
- Automatic conversation backup as JSON files
- User-specific folder structure: `user_{userId}/llm_conversations/`
- Conversation history and restore functionality
- Professional JSON format with metadata

## Setup Instructions

### 1. Environment Variables
Add to your `.env` file:
```env
# Mega Drive credentials (for conversation storage)
MEGA_EMAIL=your_mega_email@example.com
MEGA_PASSWORD=your_mega_password

# Example API keys for LLM providers
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

### 2. Test the Setup
Run the test script to verify everything is working:
```bash
node test-llm.js
```

### 3. Start the Server
```bash
npm start
```

### 4. Access the Features

#### For Admins:
1. Login as admin
2. Go to Admin Dashboard → LLM Models tab
3. Add your first LLM model with real API credentials
4. Set it as default and active

#### For Users:
1. Login as regular user
2. Click the "AI Chat" button in the navigation bar
3. Start a new conversation
4. Chat with the AI assistant

## File Structure

### Backend Files
```
Daily-Learning-Backend/
├── models/
│   ├── LLMModel.js              # LLM model configuration
│   └── LLMConversation.js       # Conversation storage
├── controllers/
│   ├── llmAdminController.js    # Admin management
│   └── llmChatController.js     # User chat functionality
├── services/
│   ├── llmChatService.js        # Core LLM logic
│   └── megaService.js           # Enhanced Mega Drive integration
├── routes/
│   └── llmRoutes.js             # API routes
└── test-llm.js                  # Test script
```

### Frontend Files
```
Daily-Learning-Frontend/src/
├── components/
│   ├── llm/
│   │   ├── LLMChat.tsx          # Main chat interface
│   │   ├── LLMSidebar.tsx       # Conversation sidebar
│   │   ├── LLMMessageComponent.tsx # Message display
│   │   └── LLMModelSelector.tsx # Model selection
│   └── admin/
│       ├── LLMManagement.tsx    # Admin model management
│       └── LLMModelForm.tsx     # Model add/edit form
├── lib/
│   └── llmApi.ts                # API client
└── pages/
    └── App.tsx                  # Updated with LLM route
```

## Key Features

### Professional UI
- ChatGPT-style interface with sidebar
- Code syntax highlighting with copy buttons
- Markdown rendering for AI responses
- Professional styling with animations
- Mobile-responsive design

### Mega Drive Storage
- Automatic conversation backup
- JSON format with full metadata
- User-specific folder organization
- History and restore functionality
- Professional data structure

### Admin Management
- Complete model lifecycle management
- Usage statistics and monitoring
- Provider-specific configurations
- Security (API keys hidden in responses)

### Error Handling
- Comprehensive error messages
- Graceful fallbacks
- User-friendly notifications
- Automatic model selection

## Security Notes
- API keys are never exposed in frontend responses
- User-specific data isolation
- Admin-only access to sensitive operations
- Secure Mega Drive integration

## Next Steps
1. Configure real API keys for your preferred LLM providers
2. Test with actual AI models
3. Customize system prompts and model parameters
4. Monitor usage and costs
5. Add additional providers as needed

## Troubleshooting
- Check MongoDB connection
- Verify API keys are valid
- Ensure Mega Drive credentials are correct
- Check server logs for detailed error messages
- Use the test script to verify setup
