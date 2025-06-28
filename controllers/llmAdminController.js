// controllers/llmAdminController.js
const llmConfigService = require('../services/llmConfigService');
const LLMConversation = require('../models/LLMConversation');

// Get all LLM models (now from environment configuration)
const getLLMModels = async (req, res) => {
  try {
    const models = llmConfigService.getAllModelsForFrontend();

    res.json({
      success: true,
      data: models,
      message: 'Models loaded from environment configuration',
    });
  } catch (error) {
    console.error('Error fetching LLM models:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch LLM models',
      error: error.message,
    });
  }
};

// Get single LLM model (from environment configuration)
const getLLMModel = async (req, res) => {
  try {
    const { id } = req.params;
    const model = llmConfigService.getModelById(id);

    if (!model) {
      return res.status(404).json({
        success: false,
        message: 'LLM model not found in environment configuration',
      });
    }

    // Format for frontend compatibility (without API key for security)
    const modelData = llmConfigService.formatModelForFrontend(model);

    res.json({
      success: true,
      data: modelData,
      message: 'Model loaded from environment configuration',
    });
  } catch (error) {
    console.error('Error fetching LLM model:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch LLM model',
      error: error.message,
    });
  }
};

// Create new LLM model (Environment-based - not supported)
const createLLMModel = async (req, res) => {
  res.status(400).json({
    success: false,
    message: 'Model creation is not supported. Models are now configured via environment variables in .env file.',
    instructions: 'Please add your API keys to the .env file and restart the server to use new models.',
  });
};

// Update LLM model (Environment-based - not supported)
const updateLLMModel = async (req, res) => {
  res.status(400).json({
    success: false,
    message: 'Model updates are not supported. Models are now configured via environment variables in .env file.',
    instructions: 'Please update your API keys in the .env file and restart the server to modify models.',
  });
};

// Delete LLM model (Environment-based - not supported)
const deleteLLMModel = async (req, res) => {
  res.status(400).json({
    success: false,
    message: 'Model deletion is not supported. Models are now configured via environment variables in .env file.',
    instructions: 'Please remove API keys from the .env file and restart the server to disable models.',
  });
};

// Set default LLM model (Environment-based - not supported)
const setDefaultLLMModel = async (req, res) => {
  res.status(400).json({
    success: false,
    message: 'Setting default model is not supported. Default models are now configured via environment variables in .env file.',
    instructions: 'Please modify the isDefault property in the llmConfigService.js file and restart the server.',
  });
};

// Get LLM usage statistics (Environment-based)
const getLLMStats = async (req, res) => {
  try {
    const models = llmConfigService.getAvailableModels();
    const totalModels = models.length;
    const activeModels = models.filter(m => m.isActive).length;
    const totalConversations = await LLMConversation.countDocuments();
    const activeConversations = await LLMConversation.countDocuments({ isActive: true });

    // Provider statistics from environment models
    const providerStats = models.reduce((acc, model) => {
      const existing = acc.find(p => p._id === model.provider);
      if (existing) {
        existing.count += 1;
      } else {
        acc.push({
          _id: model.provider,
          count: 1,
          totalUsage: 0, // Usage tracking not available for environment models
        });
      }
      return acc;
    }, []);

    // Top models (environment models don't have usage tracking)
    const topModels = models.slice(0, 5).map(model => ({
      _id: model.id,
      name: model.name,
      displayName: model.displayName,
      usageCount: 0, // Usage tracking not available
      lastUsed: null,
    }));

    res.json({
      success: true,
      data: {
        totalModels,
        activeModels,
        totalConversations,
        activeConversations,
        providerStats,
        topModels,
      },
      message: 'Statistics for environment-based models (usage tracking not available)',
    });
  } catch (error) {
    console.error('Error fetching LLM stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch LLM statistics',
      error: error.message,
    });
  }
};

module.exports = {
  getLLMModels,
  getLLMModel,
  createLLMModel,
  updateLLMModel,
  deleteLLMModel,
  setDefaultLLMModel,
  getLLMStats,
};
