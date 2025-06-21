// services/llmService.js
const axios = require('axios');

exports.generateMCQs = async (language, topic) => {
  try {
    const systemPrompt = `
You are an AI tutor. Generate 15-20 multiple-choice questions (MCQs) for the topic "${topic}" in ${language}.
Each question must include:
- question (string)
- options (array of 4 strings)
- correctAnswer (one of the options)
- explanation (1-2 lines max)

Format response strictly as a JSON array of objects like this:
[
  {
    "question": "...", // The question here
    "options": ["A", "B", "C", "D"], // Four options for the question,with options as strings
    "correctAnswer": "..", // The correct answer from the options
    "explanation": "..." // Brief explanation of the answer
  },
  ...
]
`;

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions', // or your DeepSeek endpoint
      {
        model: 'deepseek/deepseek-chat-v3-0324',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate MCQs for: ${topic}` }
        ],
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, // Your DeepSeek API key via OpenRouter
          'Content-Type': 'application/json',
        },
      }
    );

    const message = response.data.choices[0].message.content;

    // Parse LLM response safely
    const mcqs = JSON.parse(message);
    return mcqs;
  } catch (error) {
    console.error('DeepSeek MCQ Generation Error:', error.response?.data || error.message);
    throw new Error('Failed to generate questions from DeepSeek LLM');
  }
};
