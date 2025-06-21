// utils/evaluateAnswers.js
const Question = require('../models/Question');

const evaluateAnswers = async (dailyTopicId, submittedAnswers) => {
  const questionIds = submittedAnswers.map((ans) => ans.questionId);
  const correctQuestions = await Question.find({ _id: { $in: questionIds }, dailyTopicId });

  let score = 0;
  const answers = submittedAnswers.map((ans) => {
    const question = correctQuestions.find((q) => q._id.toString() === ans.questionId);
    const isCorrect = question && question.correctAnswer === ans.selectedOption;
    if (isCorrect) score += 1;

    return {
      questionId: ans.questionId,
      selectedOption: ans.selectedOption,
      isCorrect,
    };
  });

  return {
    answers,
    score,
    totalQuestions: correctQuestions.length,
  };
};

module.exports = evaluateAnswers;
