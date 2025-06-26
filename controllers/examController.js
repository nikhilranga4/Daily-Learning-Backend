// controllers/examController.js
const DailyTopic = require('../models/DailyTopic');
const Question = require('../models/Question');
const UserResponse = require('../models/UserResponse');
const ExamResult = require('../models/ExamResult');
const evaluateAnswers = require('../utils/evaluateAnswers');
const mongoose = require('mongoose'); // mongoose is required for ObjectId validation
const { generateQuestions } = require('../services/llmService');

exports.startExam = async (req, res) => {
  try {
    const { dailyTopicId } = req.body;
    const userId = req.user.id;

    // Validate daily topic ID
    if (!mongoose.Types.ObjectId.isValid(dailyTopicId)) {
      return res.status(400).json({ msg: 'Invalid daily topic ID format' });
    }

    // Check if user has already attempted this exam
    const existingResponse = await UserResponse.findOne({
      userId,
      dailyTopicId: new mongoose.Types.ObjectId(dailyTopicId)
    });

    if (existingResponse) {
      return res.status(400).json({
        msg: 'You have already attempted this assessment',
        completed: true
      });
    }

    // Get the daily topic
    const dailyTopic = await DailyTopic.findById(dailyTopicId).populate('languageId', 'name');

    if (!dailyTopic) {
      return res.status(404).json({ msg: 'Daily topic not found' });
    }

    // Check if it's the current date or past pending date (using local timezone)
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const topicDate = dailyTopic.date;

    if (topicDate > today) {
      return res.status(400).json({ msg: 'This assessment is not yet available' });
    }

    // Check if questions already exist for this topic
    let questions = await Question.find({ dailyTopicId });

    // If no questions exist, generate them
    if (questions.length === 0) {
      try {
        console.log('Generating questions for topic:', dailyTopic.topic);
        console.log('Requested question count:', dailyTopic.questionCount || 20);

        const generatedQuestions = await generateQuestions({
          language: dailyTopic.languageId.name,
          topic: dailyTopic.topic,
          difficulty: dailyTopic.questionLevel ? dailyTopic.questionLevel.toLowerCase() : 'medium',
          count: dailyTopic.questionCount || 20
        });

        console.log('Generated questions count:', generatedQuestions.length);

        // Ensure we don't exceed the requested count
        const limitedQuestions = generatedQuestions.slice(0, dailyTopic.questionCount || 20);
        console.log('Limited questions count:', limitedQuestions.length);

        questions = await Question.insertMany(
          limitedQuestions.map(q => ({
            ...q,
            dailyTopicId: dailyTopic._id
          }))
        );

        console.log('Saved questions count:', questions.length);
      } catch (err) {
        console.error('Failed to generate questions:', err);
        return res.status(500).json({
          msg: 'Failed to generate exam questions',
          error: err.message
        });
      }
    } else {
      console.log('Found existing questions count:', questions.length);
    }

    // Ensure we only return the expected number of questions
    const expectedCount = dailyTopic.questionCount || 20;
    const finalQuestions = questions.slice(0, expectedCount);

    console.log('Final response questions count:', finalQuestions.length);
    console.log('Expected count:', expectedCount);

    res.json({
      topic: dailyTopic.topic,
      language: dailyTopic.languageId.name,
      dailyTopicId: dailyTopic._id,
      questions: finalQuestions.map(q => ({
        _id: q._id,
        text: q.questionText,
        options: q.options,
        difficulty: q.difficulty || 'medium'
      }))
    });

  } catch (err) {
    console.error('Exam start error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

exports.submitExam = async (req, res) => {
  try {
    const { dailyTopicId, answers } = req.body;
    const userId = req.user.id;

    // Validate inputs
    if (!mongoose.Types.ObjectId.isValid(dailyTopicId)) {
      return res.status(400).json({ msg: 'Invalid dailyTopicId format' });
    }

    // Check if user has already submitted this exam
    const existingResponse = await UserResponse.findOne({
      userId,
      dailyTopicId: new mongoose.Types.ObjectId(dailyTopicId)
    });

    if (existingResponse) {
      return res.status(400).json({
        msg: 'You have already submitted this assessment',
        completed: true
      });
    }

    // Get all questions for this daily topic
    const questions = await Question.find({ dailyTopicId });

    if (questions.length === 0) {
      return res.status(404).json({ msg: 'No questions found for this assessment' });
    }

    // Evaluate answers and prepare detailed response
    let score = 0;
    const detailedAnswers = answers.map(userAnswer => {
      const question = questions.find(q => q._id.toString() === userAnswer.questionId);
      if (!question) {
        return {
          questionId: userAnswer.questionId,
          selectedOption: userAnswer.selectedOption || '',
          isCorrect: false,
          correctAnswer: '',
          explanation: 'Question not found'
        };
      }

      const isCorrect = userAnswer.selectedOption === question.correctAnswer;
      if (isCorrect) score++;

      return {
        questionId: userAnswer.questionId,
        selectedOption: userAnswer.selectedOption || '',
        isCorrect,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation || ''
      };
    });

    // Save user response with detailed information
    const userResponse = new UserResponse({
      userId,
      dailyTopicId,
      answers: detailedAnswers,
      score,
      totalQuestions: questions.length,
      completed: true,
      submittedAt: new Date()
    });

    await userResponse.save();

    // Also save to ExamResult for backward compatibility
    const examResult = new ExamResult({
      userId,
      dailyTopicId,
      score,
      totalQuestions: questions.length,
      submittedAt: new Date()
    });

    await examResult.save();

    res.json({
      score,
      totalQuestions: questions.length,
      answers: detailedAnswers
    });
  } catch (err) {
    console.error('Error in submitExam:', {
      message: err.message,
      stack: err.stack,
      receivedDailyTopicId: req.body?.dailyTopicId,
      receivedAnswers: req.body?.answers
    });
    res.status(500).json({ msg: 'Exam submission failed', error: err.message });
  }
};

exports.getUserResults = async (req, res) => {
  const userId = req.user.id;

  try {
    const results = await ExamResult.find({ userId }).populate('dailyTopicId');
    res.json(results);
  } catch (err) {
    console.error('Error in getUserResults:', {
      message: err.message,
      stack: err.stack,
      receivedUserId: userId
    });
    res.status(500).json({ msg: 'Server error' });
  }
};

// Get daily topics with user completion status
exports.getDailyTopics = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    // Build date filter
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        date: {
          $gte: startDate,
          $lte: endDate
        }
      };
    }

    // Get daily topics
    const dailyTopics = await DailyTopic.find(dateFilter)
      .populate('languageId', 'name')
      .sort({ date: 1 });

    // Get user responses for these topics
    const topicIds = dailyTopics.map(topic => topic._id);
    const userResponses = await UserResponse.find({
      userId,
      dailyTopicId: { $in: topicIds }
    });

    // Combine data
    const topicsWithStatus = dailyTopics.map(topic => {
      const userResponse = userResponses.find(
        response => response.dailyTopicId.toString() === topic._id.toString()
      );

      return {
        _id: topic._id,
        languageId: topic.languageId._id,
        languageName: topic.languageId.name,
        topic: topic.topic,
        date: topic.date,
        completed: !!userResponse,
        score: userResponse ? userResponse.score : null,
        totalQuestions: userResponse ? userResponse.totalQuestions : null,
        submittedAt: userResponse ? userResponse.submittedAt : null
      };
    });

    res.json(topicsWithStatus);
  } catch (err) {
    console.error('Error in getDailyTopics:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// Get detailed user response for a specific assessment
exports.getAssessmentDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { dailyTopicId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(dailyTopicId)) {
      return res.status(400).json({ msg: 'Invalid daily topic ID format' });
    }

    // Get user response with detailed answers
    const userResponse = await UserResponse.findOne({
      userId,
      dailyTopicId: new mongoose.Types.ObjectId(dailyTopicId)
    }).populate('dailyTopicId');

    if (!userResponse) {
      return res.status(404).json({ msg: 'Assessment not found or not completed' });
    }

    // Get only the questions that were actually answered (to avoid duplicates)
    const answeredQuestionIds = userResponse.answers.map(answer => answer.questionId).filter(Boolean);
    const questions = await Question.find({
      _id: { $in: answeredQuestionIds },
      dailyTopicId
    });

    console.log('Total questions in DB for topic:', await Question.countDocuments({ dailyTopicId }));
    console.log('Answered questions count:', answeredQuestionIds.length);
    console.log('Retrieved questions count:', questions.length);

    // Create a map for faster lookup
    const answerMap = new Map();
    userResponse.answers.forEach(answer => {
      if (answer.questionId) {
        answerMap.set(answer.questionId.toString(), answer);
      }
    });

    // Combine questions with user answers (only for questions that were actually answered)
    const detailedResults = questions.map(question => {
      const userAnswer = answerMap.get(question._id.toString());

      return {
        _id: question._id,
        questionText: question.questionText,
        options: question.options,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation || '',
        userSelectedOption: userAnswer?.selectedOption || null,
        isCorrect: userAnswer?.isCorrect || false
      };
    });

    console.log('Final detailed results count:', detailedResults.length);

    res.json({
      _id: userResponse._id,
      dailyTopic: userResponse.dailyTopicId,
      score: userResponse.score,
      totalQuestions: userResponse.totalQuestions,
      submittedAt: userResponse.submittedAt,
      questions: detailedResults
    });
  } catch (err) {
    console.error('Error in getAssessmentDetails:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// Get user's completed assessments
const getUserCompletedAssessments = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    console.log('Getting completed assessments for user:', userId);

    // Get all user responses with populated daily topics
    const userResponses = await UserResponse.find({ userId })
      .populate({
        path: 'dailyTopicId',
        populate: {
          path: 'languageId',
          select: 'name'
        }
      })
      .sort({ submittedAt: -1 });

    console.log('Found user responses:', userResponses.length);

    // Transform the data for frontend
    const completedAssessments = userResponses.map(response => {
      const percentage = Math.round((response.score / response.totalQuestions) * 100);

      return {
        _id: response._id,
        dailyTopic: {
          _id: response.dailyTopicId._id,
          languageId: response.dailyTopicId.languageId._id,
          languageName: response.dailyTopicId.languageId.name,
          topic: response.dailyTopicId.topic,
          date: response.dailyTopicId.date,
          questionLevel: response.dailyTopicId.questionLevel || 'Medium',
          questionCount: response.dailyTopicId.questionCount || 20
        },
        score: response.score,
        totalQuestions: response.totalQuestions,
        submittedAt: response.submittedAt,
        percentage
      };
    });

    res.json({ data: completedAssessments });
  } catch (error) {
    console.error('Error fetching completed assessments:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getUserCompletedAssessments = getUserCompletedAssessments;
