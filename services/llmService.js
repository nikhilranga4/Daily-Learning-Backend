// services/llmService.js
const axios = require('axios');

const generateQuestions = async ({ language, topic, difficulty, count}) => {
  try {
    const systemPrompt = `
You are an AI programming exam generator. Create EXACTLY ${count} multiple-choice questions about ${topic} in ${language} programming with ${difficulty} difficulty.

IMPORTANT: Generate exactly ${count} questions, no more, no less.

Each question must include:
- questionText (string)
- options (array of 4 strings)
- correctAnswer (string matching one option exactly)
- difficulty ('easy', 'medium', or 'hard')
- explanation (string explaining why the answer is correct)

Format response as a JSON array with exactly ${count} questions:
[
  {
    "questionText": "Question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option A",
    "difficulty": "${difficulty}",
    "explanation": "Explanation for the correct answer"
  }
]

Return only the JSON array, no additional text.`;

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'deepseek/deepseek-chat-v3-0324',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate ${count} ${difficulty} questions about ${topic} in ${language}` }
        ],
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0].message.content;
    console.log('LLM Response content:', content);

    const parsedQuestions = JSON.parse(content);
    console.log('Parsed questions count:', parsedQuestions.length);
    console.log('Requested count:', count);

    // Ensure we only return the requested number of questions
    const limitedQuestions = Array.isArray(parsedQuestions)
      ? parsedQuestions.slice(0, count)
      : parsedQuestions;

    console.log('Final questions count:', limitedQuestions.length);
    return limitedQuestions;
  } catch (err) {
    console.error('LLM error:', err);
    throw new Error('Failed to generate questions');
  }
};

// Generate daily knowledge content
const generateKnowledgeContent = async ({ knowledgeTopic, contentType }) => {
  try {
    console.log('Generating knowledge content:', { knowledgeTopic, contentType });

    const prompt = `Generate comprehensive daily knowledge content about "${knowledgeTopic}".

Requirements:
- Content Type: ${contentType}
- Target Audience: Software developers and programmers
- Length: 800-1200 words
- Format: Well-structured with clear sections

Content Structure:
1. **Introduction** - Brief overview of the topic
2. **Core Concepts** - Main concepts and principles
3. **Practical Examples** - Code examples with explanations (use relevant programming languages)
4. **Best Practices** - Industry standards and recommendations
5. **Common Pitfalls** - What to avoid and why
6. **Real-world Applications** - Where and how it's used
7. **Key Takeaways** - Summary of important points

Guidelines:
- Use clear, professional language
- Include practical code examples in relevant programming languages
- Explain complex concepts simply
- Provide actionable insights
- Make it engaging and educational
- Use proper markdown formatting
- Include syntax highlighting for code blocks
- Focus on practical application and understanding

Generate educational content that helps developers understand and apply "${knowledgeTopic}" effectively in their work.`;

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'deepseek/deepseek-chat-v3-0324',
        messages: [
          {
            role: 'system',
            content: 'You are an expert programming instructor and technical writer. Generate comprehensive, educational content that helps developers learn and improve their skills.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0].message.content;
    console.log('Generated knowledge content successfully');

    return content;
  } catch (error) {
    console.error('Error generating knowledge content:', error);
    throw new Error('Failed to generate knowledge content');
  }
};

module.exports = {
  generateQuestions,
  generateKnowledgeContent
};
