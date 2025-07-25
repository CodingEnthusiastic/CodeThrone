import express from 'express';
import POTDService from '../services/POTDService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get today's Problem of the Day
router.get('/today', async (req, res) => {
  try {
    const potd = await POTDService.getTodaysPOTD();
    
    if (!potd) {
      return res.status(404).json({ message: 'No Problem of the Day found' });
    }
    
    res.json({
      problem: potd.problem,
      date: potd.date,
      solvedCount: potd.solvedCount
    });
  } catch (error) {
    console.error('Error fetching POTD:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Check if user has solved today's POTD
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const hasSolved = await POTDService.hasUserSolvedTodaysPOTD(req.user._id);
    res.json({ hasSolvedToday: hasSolved });
  } catch (error) {
    console.error('Error checking POTD status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Award coins for solving POTD (called when user solves a problem)
router.post('/solve/:problemId', authenticateToken, async (req, res) => {
  try {
    const result = await POTDService.awardPOTDCoins(req.user._id, req.params.problemId);
    res.json(result);
  } catch (error) {
    console.error('Error awarding POTD coins:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
