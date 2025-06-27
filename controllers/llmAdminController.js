// controllers/llmAdminController.js
const LLMModel = require('../models/LLMModel');
const LLMConversation = require('../models/LLMConversation');

// Get all LLM models
const getLLMModels = async (req, res) => {
  try {
    const models = await LLMModel.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: models,
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

// Get single LLM model (with API key for editing)
const getLLMModel = async (req, res) => {
  try {
    const { id } = req.params;
    const model = await LLMModel.findById(id)
      .populate('createdBy', 'name email');

    if (!model) {
      return res.status(404).json({
        success: false,
        message: 'LLM model not found',
      });
    }

    // Include API key for admin editing (override toJSON transform)
    const modelData = model.toObject();
    modelData.apiKey = model.apiKey;

    res.json({
      success: true,
      data: modelData,
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

// Create new LLM model
const createLLMModel = async (req, res) => {
  try {
    const {
      name,
      displayName,
      provider,
      apiKey,
      baseUrl,
      modelId,
      maxTokens,
      temperature,
      systemPrompt,
      isActive,
      isDefault,
      description,
    } = req.body;

    // Validate required fields
    if (!name || !displayName || !provider || !apiKey || !modelId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, displayName, provider, apiKey, modelId',
      });
    }

    // Check if name already exists
    const existingModel = await LLMModel.findOne({ name });
    if (existingModel) {
      return res.status(400).json({
        success: false,
        message: 'Model name already exists',
      });
    }

    const newModel = new LLMModel({
      name,
      displayName,
      provider,
      apiKey,
      baseUrl,
      modelId,
      maxTokens: maxTokens || 4000,
      temperature: temperature || 0.7,
      systemPrompt: systemPrompt || 'You are a helpful AI assistant.',
      isActive: isActive !== undefined ? isActive : true,
      isDefault: isDefault || false,
      description: description || '',
      createdBy: req.user._id || req.user.id,
    });

    await newModel.save();

    // Populate creator info for response
    await newModel.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'LLM model created successfully',
      data: newModel,
    });
  } catch (error) {
    console.error('Error creating LLM model:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create LLM model',
      error: error.message,
    });
  }
};

// Update LLM model
const updateLLMModel = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.createdBy;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const model = await LLMModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!model) {
      return res.status(404).json({
        success: false,
        message: 'LLM model not found',
      });
    }

    res.json({
      success: true,
      message: 'LLM model updated successfully',
      data: model,
    });
  } catch (error) {
    console.error('Error updating LLM model:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update LLM model',
      error: error.message,
    });
  }
};

// Delete LLM model
const deleteLLMModel = async (req, res) => {
  try {
    const { id } = req.params;

    const model = await LLMModel.findById(id);
    if (!model) {
      return res.status(404).json({
        success: false,
        message: 'LLM model not found',
      });
    }

    // Check if model is being used in conversations
    const conversationCount = await LLMConversation.countDocuments({ llmModelId: id });
    if (conversationCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete model. It is being used in ${conversationCount} conversation(s).`,
      });
    }

    await LLMModel.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'LLM model deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting LLM model:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete LLM model',
      error: error.message,
    });
  }
};

// Set default LLM model
const setDefaultLLMModel = async (req, res) => {
  try {
    const { id } = req.params;

    const model = await LLMModel.findById(id);
    if (!model) {
      return res.status(404).json({
        success: false,
        message: 'LLM model not found',
      });
    }

    // Set this model as default (pre-save hook will handle unsetting others)
    model.isDefault = true;
    await model.save();

    res.json({
      success: true,
      message: 'Default LLM model set successfully',
      data: model,
    });
  } catch (error) {
    console.error('Error setting default LLM model:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set default LLM model',
      error: error.message,
    });
  }
};

// Get LLM usage statistics
const getLLMStats = async (req, res) => {
  try {
    const totalModels = await LLMModel.countDocuments();
    const activeModels = await LLMModel.countDocuments({ isActive: true });
    const totalConversations = await LLMConversation.countDocuments();
    const activeConversations = await LLMConversation.countDocuments({ isActive: true });

    // Get usage by provider
    const providerStats = await LLMModel.aggregate([
      {
        $group: {
          _id: '$provider',
          count: { $sum: 1 },
          totalUsage: { $sum: '$usageCount' },
        },
      },
    ]);

    // Get most used models
    const topModels = await LLMModel.find()
      .sort({ usageCount: -1 })
      .limit(5)
      .select('name displayName usageCount lastUsed');

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
