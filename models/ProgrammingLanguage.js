// models/ProgrammingLanguage.js
const mongoose = require('mongoose');

const programmingLanguageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ProgrammingLanguage', programmingLanguageSchema);
