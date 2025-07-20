import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

let genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/', async (req, res) => {
  const { prompt, context } = req.body;
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    console.log('🔑 Gemini key',process.env.GEMINI_API_KEY);
  try {
    // const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
    // const result = await model.generateContent([context || '', prompt]);
    const result = await model.generateContent({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      })
    // const response = result.response.text();
      const response = await result.response.text();
    res.json({ reply: response });
  } catch (err) {
    console.error('❌ Gemini API error:', err);
    res.status(500).json({ reply: 'Something went wrong while generating AI response.' });
  }
});

export default router;
