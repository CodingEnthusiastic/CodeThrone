import express from 'express';
import ChatHistory from '../models/ChatHistory.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get chat history for a user and problem
router.get('/history/:problemId', authenticateToken, async (req, res) => {
  try {
    const { problemId } = req.params;
    const userId = req.user._id;

    const chatHistory = await ChatHistory.find({
      user: userId,
      problemId: problemId
    }).sort({ createdAt: -1 });

    res.json(chatHistory);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// Get all chat history for a user (for the sidebar)
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 50;

    const chatHistory = await ChatHistory.find({
      user: userId
    })
    .select('problemId problemTitle sessionId createdAt updatedAt messages')
    .sort({ updatedAt: -1 })
    .limit(limit);

    // Format the response to include chat preview
    const formattedHistory = chatHistory.map(session => ({
      sessionId: session.sessionId,
      problemId: session.problemId,
      problemTitle: session.problemTitle,
      date: session.createdAt.toISOString().split('T')[0],
      lastMessage: session.messages.length > 0 
        ? session.messages[session.messages.length - 1].prompt.substring(0, 50) + '...'
        : 'New chat',
      messageCount: session.messages.length,
      updatedAt: session.updatedAt
    }));

    res.json(formattedHistory);
  } catch (error) {
    console.error('Error fetching user chat history:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// Get specific chat session
router.get('/session/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const chatSession = await ChatHistory.findOne({
      sessionId: sessionId,
      user: userId
    });

    if (!chatSession) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    res.json(chatSession);
  } catch (error) {
    console.error('Error fetching chat session:', error);
    res.status(500).json({ error: 'Failed to fetch chat session' });
  }
});

// Save chat message to database
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const { sessionId, problemId, problemTitle, prompt, response } = req.body;
    const userId = req.user._id;

    if (!sessionId || !problemId || !problemTitle || !prompt || !response) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find existing session or create new one
    let chatSession = await ChatHistory.findOne({ sessionId, user: userId });

    if (!chatSession) {
      chatSession = new ChatHistory({
        user: userId,
        problemId,
        problemTitle,
        sessionId,
        messages: []
      });
    }

    // Add new message
    chatSession.messages.push({ prompt, response });
    await chatSession.save();

    res.json({ success: true, sessionId: chatSession.sessionId });
  } catch (error) {
    console.error('Error saving chat message:', error);
    res.status(500).json({ error: 'Failed to save chat message' });
  }
});

// Delete chat session
router.delete('/session/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const result = await ChatHistory.findOneAndDelete({
      sessionId: sessionId,
      user: userId
    });

    if (!result) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    res.json({ success: true, message: 'Chat session deleted' });
  } catch (error) {
    console.error('Error deleting chat session:', error);
    res.status(500).json({ error: 'Failed to delete chat session' });
  }
});

export default router;
