// services/llmConfigService.js
require('dotenv').config();

class LLMConfigService {
  constructor() {
    this.models = this.initializeModels();
  }

  initializeModels() {
    const models = [];

    // OpenAI Models
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
      models.push(
        {
          id: 'openai-gpt-4',
          name: 'gpt-4',
          displayName: 'GPT-4',
          provider: 'openai',
          apiKey: process.env.OPENAI_API_KEY,
          modelId: 'gpt-4',
          maxTokens: 8000,
          temperature: 0.7,
          systemPrompt: 'You are a helpful AI assistant.',
          isActive: true,
          isDefault: false,
          description: 'OpenAI GPT-4 - Most capable model for complex tasks'
        },
        {
          id: 'openai-gpt-4-turbo',
          name: 'gpt-4-turbo',
          displayName: 'GPT-4 Turbo',
          provider: 'openai',
          apiKey: process.env.OPENAI_API_KEY,
          modelId: 'gpt-4-turbo-preview',
          maxTokens: 4000,
          temperature: 0.7,
          systemPrompt: 'You are a helpful AI assistant.',
          isActive: true,
          isDefault: false,
          description: 'OpenAI GPT-4 Turbo - Faster and more efficient'
        },
        {
          id: 'openai-gpt-3.5-turbo',
          name: 'gpt-3.5-turbo',
          displayName: 'GPT-3.5 Turbo',
          provider: 'openai',
          apiKey: process.env.OPENAI_API_KEY,
          modelId: 'gpt-3.5-turbo',
          maxTokens: 4000,
          temperature: 0.7,
          systemPrompt: 'You are a helpful AI assistant.',
          isActive: true,
          isDefault: false,
          description: 'OpenAI GPT-3.5 Turbo - Fast and cost-effective'
        }
      );
    }

    // Anthropic Models
    if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here') {
      models.push(
        {
          id: 'anthropic-claude-3-opus',
          name: 'claude-3-opus',
          displayName: 'Claude 3 Opus',
          provider: 'anthropic',
          apiKey: process.env.ANTHROPIC_API_KEY,
          modelId: 'claude-3-opus-20240229',
          maxTokens: 4000,
          temperature: 0.7,
          systemPrompt: 'You are a helpful AI assistant.',
          isActive: true,
          isDefault: false,
          description: 'Anthropic Claude 3 Opus - Most powerful Claude model'
        },
        {
          id: 'anthropic-claude-3-sonnet',
          name: 'claude-3-sonnet',
          displayName: 'Claude 3 Sonnet',
          provider: 'anthropic',
          apiKey: process.env.ANTHROPIC_API_KEY,
          modelId: 'claude-3-sonnet-20240229',
          maxTokens: 4000,
          temperature: 0.7,
          systemPrompt: 'You are a helpful AI assistant.',
          isActive: true,
          isDefault: false,
          description: 'Anthropic Claude 3 Sonnet - Balanced performance and speed'
        },
        {
          id: 'anthropic-claude-3-haiku',
          name: 'claude-3-haiku',
          displayName: 'Claude 3 Haiku',
          provider: 'anthropic',
          apiKey: process.env.ANTHROPIC_API_KEY,
          modelId: 'claude-3-haiku-20240307',
          maxTokens: 4000,
          temperature: 0.7,
          systemPrompt: 'You are a helpful AI assistant.',
          isActive: true,
          isDefault: false,
          description: 'Anthropic Claude 3 Haiku - Fast and efficient'
        }
      );
    }

    // OpenRouter Models
    if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== 'your_openrouter_api_key_here') {
      models.push(
        {
          id: 'openrouter-llama-3.1-8b',
          name: 'meta-llama/llama-3.1-8b-instruct',
          displayName: 'Llama 3.1 8B (OpenRouter)',
          provider: 'openrouter',
          apiKey: process.env.OPENROUTER_API_KEY,
          modelId: 'meta-llama/llama-3.1-8b-instruct:free',
          maxTokens: 4000,
          temperature: 0.7,
          systemPrompt: 'You are a helpful AI assistant. Provide complete and detailed responses.',
          isActive: true,
          isDefault: false, // GPT-4o Mini is more reliable
          description: 'Meta Llama 3.1 8B Instruct via OpenRouter - Free tier'
        },
        {
          id: 'openrouter-gpt-4',
          name: 'openrouter/openai/gpt-4',
          displayName: 'GPT-4o Mini (OpenRouter)',
          provider: 'openrouter',
          apiKey: process.env.OPENROUTER_API_KEY,
          modelId: 'openai/gpt-4o-mini',
          maxTokens: 4000,
          temperature: 0.7,
          systemPrompt: 'You are a helpful AI assistant. Provide complete and detailed responses.',
          isActive: true,
          isDefault: true, // Set as default - most reliable
          description: 'OpenAI GPT-4o Mini via OpenRouter - Fast, reliable, and complete responses'
        },
        {
          id: 'openrouter-claude-3-opus',
          name: 'openrouter/anthropic/claude-3-opus',
          displayName: 'Claude 3 Opus (OpenRouter)',
          provider: 'openrouter',
          apiKey: process.env.OPENROUTER_API_KEY,
          modelId: 'anthropic/claude-3-opus',
          maxTokens: 4000,
          temperature: 0.7,
          systemPrompt: 'You are a helpful AI assistant.',
          isActive: true,
          isDefault: false,
          description: 'Anthropic Claude 3 Opus via OpenRouter'
        }
      );
    }

    // DeepSeek Models
    if (process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY !== 'your_deepseek_api_key_here') {
      models.push(
        {
          id: 'deepseek-chat',
          name: 'deepseek-chat',
          displayName: 'DeepSeek Chat',
          provider: 'deepseek',
          apiKey: process.env.DEEPSEEK_API_KEY,
          modelId: 'deepseek-chat',
          maxTokens: 4000,
          temperature: 0.7,
          systemPrompt: 'You are a helpful AI assistant.',
          isActive: true,
          isDefault: false,
          description: 'DeepSeek Chat - Advanced reasoning model'
        }
      );
    }

    // Google Gemini Models
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
      models.push(
        {
          id: 'gemini-pro',
          name: 'gemini-pro',
          displayName: 'Gemini Pro',
          provider: 'gemini',
          apiKey: process.env.GEMINI_API_KEY,
          modelId: 'gemini-pro',
          maxTokens: 4000,
          temperature: 0.7,
          systemPrompt: 'You are a helpful AI assistant.',
          isActive: true,
          isDefault: false,
          description: 'Google Gemini Pro - Multimodal AI model'
        }
      );
    }

    // Custom/Mock Models for testing
    if (process.env.CUSTOM_API_KEY) {
      models.push(
        {
          id: 'custom-test',
          name: 'custom-test',
          displayName: 'Test Model',
          provider: 'custom',
          apiKey: process.env.CUSTOM_API_KEY,
          baseUrl: process.env.CUSTOM_BASE_URL,
          modelId: 'test-model',
          maxTokens: 4000,
          temperature: 0.7,
          systemPrompt: 'You are a helpful AI assistant.',
          isActive: true,
          isDefault: false,
          description: 'Custom test model for development'
        }
      );
    }

    // If no models are configured, add a fallback
    if (models.length === 0) {
      console.warn('⚠️  No LLM API keys configured. Adding mock model for testing.');
      models.push(
        {
          id: 'mock-model',
          name: 'mock-model',
          displayName: 'Mock AI Model',
          provider: 'custom',
          apiKey: 'mock-key',
          baseUrl: 'http://localhost:8080/v1',
          modelId: 'mock-model',
          maxTokens: 4000,
          temperature: 0.7,
          systemPrompt: 'You are a helpful AI assistant.',
          isActive: true,
          isDefault: true,
          description: 'Mock model for testing (configure real API keys in .env)'
        }
      );
    }

    console.log(`✅ Initialized ${models.length} LLM models from environment configuration`);
    models.forEach(model => {
      console.log(`   - ${model.displayName} (${model.provider}) ${model.isDefault ? '[DEFAULT]' : ''}`);
    });

    return models;
  }

  getAvailableModels() {
    return this.models.filter(model => model.isActive);
  }

  getModelById(id) {
    return this.models.find(model => model.id === id);
  }

  getDefaultModel() {
    return this.models.find(model => model.isDefault && model.isActive) || this.models.find(model => model.isActive);
  }

  getModelsByProvider(provider) {
    return this.models.filter(model => model.provider === provider && model.isActive);
  }

  validateModel(id) {
    const model = this.getModelById(id);
    if (!model) {
      throw new Error(`Model with ID ${id} not found`);
    }
    if (!model.isActive) {
      throw new Error(`Model ${model.displayName} is not active`);
    }
    return model;
  }

  // Format model for frontend compatibility
  formatModelForFrontend(model) {
    return {
      _id: model.id,
      name: model.name,
      displayName: model.displayName,
      provider: model.provider,
      description: model.description,
      isDefault: model.isDefault,
      isActive: model.isActive,
      maxTokens: model.maxTokens,
      temperature: model.temperature
    };
  }

  getAllModelsForFrontend() {
    return this.getAvailableModels().map(model => this.formatModelForFrontend(model));
  }
}

module.exports = new LLMConfigService();
