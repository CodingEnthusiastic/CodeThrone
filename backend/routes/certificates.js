import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import User from '../models/User.js';
import Problem from '../models/Problem.js';

const router = express.Router();

// Check if user has completed 100% of company problems and get certificate data
router.get('/company/:company/check', authenticateToken, async (req, res) => {
  try {
    const { company } = req.params;
    const userId = req.user._id;

    // Get all problems for this company
    const companyProblems = await Problem.find({ 
      companies: { $in: [company] }, 
      isPublished: true 
    });

    if (companyProblems.length === 0) {
      return res.status(404).json({ message: 'No problems found for this company' });
    }

    // Get user's solved problems
    const user = await User.findById(userId).populate('solvedProblems');
    const solvedProblemIds = user.solvedProblems.map(p => p._id.toString());

    // Check completion status
    const totalProblems = companyProblems.length;
    const solvedProblems = companyProblems.filter(p => 
      solvedProblemIds.includes(p._id.toString())
    ).length;

    const completionPercentage = (solvedProblems / totalProblems) * 100;
    const isCompleted = completionPercentage === 100;

    // Calculate difficulty breakdown
    const difficultyStats = {
      easy: { total: 0, solved: 0 },
      medium: { total: 0, solved: 0 },
      hard: { total: 0, solved: 0 }
    };

    companyProblems.forEach(problem => {
      const difficulty = problem.difficulty.toLowerCase();
      if (difficultyStats[difficulty]) {
        difficultyStats[difficulty].total++;
        if (solvedProblemIds.includes(problem._id.toString())) {
          difficultyStats[difficulty].solved++;
        }
      }
    });

    const certificateData = {
      isEligible: isCompleted,
      completionPercentage: Math.round(completionPercentage * 100) / 100,
      company,
      userName: user.username,
      userEmail: user.email,
      totalProblems,
      solvedProblems,
      difficultyStats,
      completionDate: isCompleted ? new Date().toISOString() : null,
      certificateId: isCompleted ? `CERT-${company.toUpperCase()}-${userId.toString().slice(-6)}-${Date.now()}` : null
    };

    res.json(certificateData);
  } catch (error) {
    console.error('Certificate check error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Generate certificate data for download
router.post('/company/:company/generate', authenticateToken, async (req, res) => {
  try {
    const { company } = req.params;
    const userId = req.user._id;

    // Get all problems for this company
    const companyProblems = await Problem.find({ 
      companies: { $in: [company] }, 
      isPublished: true 
    });

    if (companyProblems.length === 0) {
      return res.status(404).json({ message: 'No problems found for this company' });
    }

    // Get user's solved problems
    const user = await User.findById(userId).populate('solvedProblems');
    const solvedProblemIds = user.solvedProblems.map(p => p._id.toString());

    // Check completion status
    const totalProblems = companyProblems.length;
    const solvedProblems = companyProblems.filter(p => 
      solvedProblemIds.includes(p._id.toString())
    ).length;

    const completionPercentage = (solvedProblems / totalProblems) * 100;
    const isCompleted = completionPercentage === 100;

    if (!isCompleted) {
      return res.status(400).json({ 
        message: 'You must complete 100% of problems to generate a certificate',
        completionPercentage: Math.round(completionPercentage * 100) / 100
      });
    }

    // Calculate difficulty breakdown
    const difficultyStats = {
      easy: { total: 0, solved: 0 },
      medium: { total: 0, solved: 0 },
      hard: { total: 0, solved: 0 }
    };

    companyProblems.forEach(problem => {
      const difficulty = problem.difficulty.toLowerCase();
      if (difficultyStats[difficulty]) {
        difficultyStats[difficulty].total++;
        if (solvedProblemIds.includes(problem._id.toString())) {
          difficultyStats[difficulty].solved++;
        }
      }
    });

    const certificateData = {
      isEligible: true,
      completionPercentage: 100,
      company,
      userName: user.username,
      userEmail: user.email,
      totalProblems,
      solvedProblems,
      difficultyStats,
      completionDate: new Date().toISOString(),
      certificateId: `CERT-${company.toUpperCase()}-${userId.toString().slice(-6)}-${Date.now()}`,
      generatedAt: new Date().toISOString()
    };

    // Return certificate data for frontend generation
    res.json({
      success: true,
      certificateData
    });
  } catch (error) {
    console.error('Certificate generation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
