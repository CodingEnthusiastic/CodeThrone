import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

let genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/', async (req, res) => {
  const { prompt, context, problemData } = req.body;
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  console.log('🔑 Gemini key', process.env.GEMINI_API_KEY);
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Construct a comprehensive context for the AI
    let fullContext = '';
    
    if (problemData) {
      fullContext = `
PROBLEM CONTEXT:
Title: ${problemData.title}
Difficulty: ${problemData.difficulty}
Description: ${problemData.description}

Tags: ${problemData.tags ? problemData.tags.join(', ') : 'N/A'}
Companies: ${problemData.companies ? problemData.companies.join(', ') : 'N/A'}

${problemData.constraints ? `Constraints: ${problemData.constraints}` : ''}

${problemData.examples && problemData.examples.length > 0 ? 
  `Examples:\n${problemData.examples.map((ex, i) => 
    `Example ${i + 1}:\nInput: ${ex.input}\nOutput: ${ex.output}\n${ex.explanation ? `Explanation: ${ex.explanation}` : ''}`
  ).join('\n\n')}` : ''}

You are an AI coding assistant helping with this specific problem. Provide helpful guidance about algorithms, data structures, approach, and optimization techniques relevant to this problem. Do not provide the complete solution code unless explicitly asked. Focus on explaining concepts, giving hints, and helping the user understand the problem better.

USER QUESTION: ${prompt}
`;
    } else if (context) {
      fullContext = `${context}\n\nUSER QUESTION: ${prompt}`;
    } else {
      fullContext = prompt;
    }

    const result = await model.generateContent({
      contents: [{ parts: [{ text: fullContext }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048, // Increased for more detailed responses
      },
    });

    const response = await result.response.text();
    res.json({ reply: response });
  } catch (err) {
    console.error('❌ Gemini API error:', err);
    res.status(500).json({ reply: 'Something went wrong while generating AI response.' });
  }
});

export default router;
