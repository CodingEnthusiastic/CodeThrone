import express from 'express';
import MCQQuestion from '../models/MCQQuestion.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

console.log('📚 Loading MCQ Question routes...');

// Admin middleware to check if user can manage MCQs
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Get all MCQ questions (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { domain, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    let filter = { isActive: true };
    if (domain) {
      filter.domain = domain;
    }

    const questions = await MCQQuestion.find(filter)
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await MCQQuestion.countDocuments(filter);

    console.log('✅ Retrieved MCQ questions:', questions.length);
    res.json({
      questions,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });

  } catch (error) {
    console.error('❌ Get MCQ questions error:', error);
    res.status(500).json({ message: 'Failed to get MCQ questions' });
  }
});

// Get MCQ questions by domain (for game use)
router.get('/domain/:domain', authenticateToken, async (req, res) => {
  try {
    const { domain } = req.params;
    const { count = 10 } = req.query;

    console.log('🎯 Getting MCQ questions for domain:', domain);

    const questions = await MCQQuestion.aggregate([
      { $match: { domain, isActive: true } },
      { $sample: { size: parseInt(count) } }
    ]);

    console.log('✅ Retrieved domain questions:', questions.length);
    res.json(questions);

  } catch (error) {
    console.error('❌ Get domain MCQ questions error:', error);
    res.status(500).json({ message: 'Failed to get domain questions' });
  }
});

// Create new MCQ question (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      question,
      options,
      domain,
      difficulty = 'Medium',
      explanation,
      tags = []
    } = req.body;

    console.log('📝 Creating new MCQ question:', { domain, difficulty });

    // Validate options
    if (!Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({ message: 'Must provide exactly 4 options' });
    }

    const correctOptionsCount = options.filter(opt => opt.isCorrect).length;
    if (correctOptionsCount !== 1) {
      return res.status(400).json({ message: 'Must have exactly 1 correct option' });
    }

    const mcqQuestion = new MCQQuestion({
      question: question.trim(),
      options: options.map(opt => ({
        text: opt.text.trim(),
        isCorrect: opt.isCorrect
      })),
      domain,
      difficulty,
      explanation: explanation?.trim(),
      tags: tags.filter(tag => tag.trim()),
      createdBy: req.user.id
    });

    await mcqQuestion.save();

    console.log('✅ MCQ question created:', mcqQuestion._id);
    res.status(201).json(mcqQuestion);

  } catch (error) {
    console.error('❌ Create MCQ question error:', error);
    res.status(500).json({ message: 'Failed to create MCQ question' });
  }
});

// Update MCQ question (admin only)
router.put('/:questionId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { questionId } = req.params;
    const updateData = req.body;

    console.log('📝 Updating MCQ question:', questionId);

    // If updating options, validate them
    if (updateData.options) {
      if (!Array.isArray(updateData.options) || updateData.options.length !== 4) {
        return res.status(400).json({ message: 'Must provide exactly 4 options' });
      }

      const correctOptionsCount = updateData.options.filter(opt => opt.isCorrect).length;
      if (correctOptionsCount !== 1) {
        return res.status(400).json({ message: 'Must have exactly 1 correct option' });
      }
    }

    const question = await MCQQuestion.findByIdAndUpdate(
      questionId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    console.log('✅ MCQ question updated');
    res.json(question);

  } catch (error) {
    console.error('❌ Update MCQ question error:', error);
    res.status(500).json({ message: 'Failed to update MCQ question' });
  }
});

// Delete MCQ question (admin only)
router.delete('/:questionId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { questionId } = req.params;
    console.log('🗑️ Deleting MCQ question:', questionId);

    const question = await MCQQuestion.findByIdAndUpdate(
      questionId,
      { isActive: false },
      { new: true }
    );

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    console.log('✅ MCQ question deleted');
    res.json({ message: 'Question deleted successfully' });

  } catch (error) {
    console.error('❌ Delete MCQ question error:', error);
    res.status(500).json({ message: 'Failed to delete MCQ question' });
  }
});

// Get MCQ statistics (admin only)
router.get('/stats/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('📊 Getting MCQ statistics...');

    const stats = await MCQQuestion.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$domain',
          count: { $sum: 1 },
          avgAccuracy: { $avg: '$accuracyRate' },
          totalAttempts: { $sum: '$totalAttempts' }
        }
      }
    ]);

    const totalQuestions = await MCQQuestion.countDocuments({ isActive: true });

    console.log('✅ MCQ statistics retrieved');
    res.json({
      totalQuestions,
      domainStats: stats
    });

  } catch (error) {
    console.error('❌ Get MCQ statistics error:', error);
    res.status(500).json({ message: 'Failed to get MCQ statistics' });
  }
});

console.log('✅ MCQ Question routes loaded');

export default router;
