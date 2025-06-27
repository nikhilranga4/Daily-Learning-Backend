# LLM Integration Troubleshooting Guide

## 🚨 Common Issues and Solutions

### 1. OpenRouter Data Policy Error
**Error**: `No endpoints found matching your data policy`

**Cause**: OpenRouter requires specific privacy settings for free models.

**Solutions**:
```bash
# Option A: Fix the model configuration
node fix-openrouter-model.js

# Option B: Update privacy settings
# Go to https://openrouter.ai/settings/privacy
# Enable "Allow training on my data" for free models
```

**Alternative Models**:
- Use `nousresearch/hermes-3-llama-3.1-405b:free` instead of DeepSeek
- Use the mock model for testing: `test-mock-model`
- Use paid models which don't have data policy restrictions

### 2. API Authentication Errors
**Error**: `API authentication failed`

**Solutions**:
1. Check your API keys in `.env` file:
```env
OPENROUTER_API_KEY=your_actual_openrouter_key
OPENAI_API_KEY=your_actual_openai_key
```

2. Update API keys in the admin panel:
   - Go to Admin Dashboard → LLM Models
   - Edit the model and update the API key
   - Save changes

### 3. Model Not Available Errors
**Error**: `The selected model is not available`

**Solutions**:
```bash
# Check available models
node test-llm.js

# Setup test models
node setup-test-models.js
```

### 4. Connection Errors
**Error**: `Unable to connect to the AI service`

**Causes & Solutions**:
- **Internet connection**: Check your network
- **API endpoint down**: Try a different provider
- **Firewall blocking**: Check firewall settings
- **Invalid base URL**: Verify custom provider URLs

### 5. Quota/Credit Errors
**Error**: `API quota exceeded` or `insufficient credits`

**Solutions**:
- Check your API provider dashboard for usage limits
- Upgrade your API plan if needed
- Switch to a different model or provider
- Use the mock model for testing

## 🛠️ Quick Fixes

### Reset to Working Configuration
```bash
# 1. Setup reliable test models
node setup-test-models.js

# 2. Fix OpenRouter issues
node fix-openrouter-model.js

# 3. Test the setup
node test-llm.js

# 4. Start the server
npm start
```

### Enable Mock Model for Testing
The mock model works without external API calls:
1. Go to Admin Dashboard → LLM Models
2. Find "Mock AI Model (Testing)"
3. Set it as active and default
4. Test the chat interface

### Check Model Status
```bash
# Connect to MongoDB and check models
node -e "
require('dotenv').config();
const mongoose = require('mongoose');
const LLMModel = require('./models/LLMModel');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const models = await LLMModel.find();
  console.log('Available models:');
  models.forEach(m => console.log(\`- \${m.displayName} (\${m.provider}) - \${m.isActive ? 'ACTIVE' : 'INACTIVE'}\`));
  process.exit(0);
});
"
```

## 🔧 Configuration Examples

### Working OpenRouter Model
```javascript
{
  name: 'openrouter-hermes',
  displayName: 'Hermes 3 Llama 3.1 405B',
  provider: 'openrouter',
  apiKey: 'your-openrouter-key',
  modelId: 'nousresearch/hermes-3-llama-3.1-405b:free',
  maxTokens: 4000,
  temperature: 0.7,
  isActive: true,
  isDefault: true
}
```

### Working OpenAI Model
```javascript
{
  name: 'openai-gpt35',
  displayName: 'GPT-3.5 Turbo',
  provider: 'openai',
  apiKey: 'your-openai-key',
  modelId: 'gpt-3.5-turbo',
  maxTokens: 4000,
  temperature: 0.7,
  isActive: true,
  isDefault: false
}
```

### Mock Model for Testing
```javascript
{
  name: 'test-mock-model',
  displayName: 'Mock AI Model',
  provider: 'custom',
  apiKey: 'mock-key',
  baseUrl: 'http://localhost:3000/mock-llm',
  modelId: 'mock-model',
  maxTokens: 2000,
  temperature: 0.5,
  isActive: true,
  isDefault: false
}
```

## 📋 Debugging Steps

### 1. Check Server Logs
Look for these patterns in the console:
- `🤖 Calling [provider] API:` - API call initiated
- `LLM API Error:` - API call failed
- `✅ Successfully uploaded` - Mega Drive working
- `Error sending message:` - Message processing failed

### 2. Test Individual Components
```bash
# Test database connection
node -e "require('dotenv').config(); require('mongoose').connect(process.env.MONGO_URI).then(() => console.log('DB OK')).catch(console.error)"

# Test Mega Drive
node -e "require('dotenv').config(); const mega = require('./services/megaService'); mega.listFiles('').then(console.log).catch(console.error)"

# Test models
node test-llm.js
```

### 3. Frontend Debugging
Open browser console and look for:
- Network errors (500, 404, etc.)
- JavaScript errors in components
- API response errors

## 🎯 Best Practices

### For Development
1. Use the mock model for initial testing
2. Keep one reliable model as default
3. Test with small messages first
4. Check API quotas regularly

### For Production
1. Use paid API keys for reliability
2. Set up multiple fallback models
3. Monitor API usage and costs
4. Implement rate limiting

### For OpenRouter
1. Configure privacy settings properly
2. Use models without data policy restrictions for free tier
3. Consider paid models for production use
4. Check model availability regularly

## 📞 Getting Help

If issues persist:
1. Check the server console for detailed error messages
2. Verify your API keys are valid and have sufficient credits
3. Test with the mock model to isolate API issues
4. Check the provider's status page for service outages
5. Review the model's specific requirements and limitations

## 🔄 Recovery Commands

```bash
# Complete reset and setup
npm install
node setup-test-models.js
node fix-openrouter-model.js
npm start

# Quick test
node test-llm.js
```
