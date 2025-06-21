// controllers/programmingLanguageController.js
const ProgrammingLanguage = require('../models/ProgrammingLanguage');

exports.createLanguage = async (req, res) => {
  try {
    const language = new ProgrammingLanguage(req.body);
    await language.save();
    res.status(201).json(language);
  } catch (err) {
    res.status(400).json({ msg: 'Failed to create language', error: err.message });
  }
};

exports.getLanguages = async (req, res) => {
  try {
    const languages = await ProgrammingLanguage.find();
    res.json(languages);
  } catch (err) {
    res.status(500).json({ msg: 'Error fetching languages' });
  }
};

exports.updateLanguage = async (req, res) => {
  try {
    const language = await ProgrammingLanguage.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(language);
  } catch (err) {
    res.status(400).json({ msg: 'Failed to update language' });
  }
};

exports.deleteLanguage = async (req, res) => {
  try {
    await ProgrammingLanguage.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Language deleted' });
  } catch (err) {
    res.status(400).json({ msg: 'Failed to delete language' });
  }
};
