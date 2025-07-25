import express from 'express';
import Discussion from '../models/Discussion.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET all discussions with filters and sort
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, tag, sortBy = 'recent' } = req.query;
    const query = {};

    if (tag) {
      query.tags = tag;
    }

    let sortOption = { isPinned: -1, createdAt: -1 };
    if (sortBy === 'popular') {
      // We'll sort manually later
      sortOption = { isPinned: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitInt = parseInt(limit);

    let discussions = await Discussion.find(query)
      .populate('author', 'username')
      .sort(sortOption)
      .skip(skip)
      .limit(limitInt)
      .lean(); // return plain JS objects so we can compute scores

    // Add vote score and user vote status
    discussions = discussions.map(d => ({
      ...d,
      score: (d.upvotes?.length || 0) - (d.downvotes?.length || 0)
    }));

    // Sort by popularity if requested
    if (sortBy === 'popular') {
      discussions.sort((a, b) => b.score - a.score);
    }

    const total = await Discussion.countDocuments(query);

    res.json({
      discussions,
      totalPages: Math.ceil(total / limitInt),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET discussion by ID
router.get('/:id', async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id)
      .populate('author', 'username')
      .populate('comments.author', 'username');

    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    res.json(discussion);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST create discussion
router.post('/', authenticateToken, async (req, res) => {
  try {
    const discussion = new Discussion({
      ...req.body,
      author: req.user._id
    });

    await discussion.save();
    await discussion.populate('author', 'username');

    res.status(201).json(discussion);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST add comment
router.post('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id);

    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    if (discussion.isLocked) {
      return res.status(403).json({ message: 'Discussion is locked' });
    }

    const comment = {
      content: req.body.content,
      author: req.user._id,
      createdAt: new Date()
    };

    discussion.comments.push(comment);
    await discussion.save();

    await discussion.populate('comments.author', 'username');

    res.status(201).json(discussion.comments[discussion.comments.length - 1]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST vote on discussion
router.post('/:id/vote', authenticateToken, async (req, res) => {
  try {
    const { type } = req.body;
    const discussion = await Discussion.findById(req.params.id);

    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    const userId = req.user._id;
    
    // Check if user already voted this way
    const hasUpvoted = discussion.upvotes.some(id => id.equals(userId));
    const hasDownvoted = discussion.downvotes.some(id => id.equals(userId));

    // Remove any existing votes
    discussion.upvotes = discussion.upvotes.filter(id => !id.equals(userId));
    discussion.downvotes = discussion.downvotes.filter(id => !id.equals(userId));

    // If user clicks the same vote type, just remove it (toggle off)
    // If user clicks different vote type, add the new vote
    if (type === 'up' && !hasUpvoted) {
      discussion.upvotes.push(userId);
    } else if (type === 'down' && !hasDownvoted) {
      discussion.downvotes.push(userId);
    }

    await discussion.save();

    res.json({
      upvotes: discussion.upvotes.length,
      downvotes: discussion.downvotes.length,
      userUpvoted: discussion.upvotes.some(id => id.equals(userId)),
      userDownvoted: discussion.downvotes.some(id => id.equals(userId))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST vote on comment
router.post('/:id/comments/:commentId/vote', authenticateToken, async (req, res) => {
  try {
    const { type } = req.body;
    const discussion = await Discussion.findById(req.params.id);

    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    const comment = discussion.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const userId = req.user._id;
    
    // Check if user already voted this way
    const hasUpvoted = comment.upvotes.some(id => id.equals(userId));
    const hasDownvoted = comment.downvotes.some(id => id.equals(userId));

    // Remove any existing votes
    comment.upvotes = comment.upvotes.filter(id => !id.equals(userId));
    comment.downvotes = comment.downvotes.filter(id => !id.equals(userId));

    // If user clicks the same vote type, just remove it (toggle off)
    // If user clicks different vote type, add the new vote
    if (type === 'up' && !hasUpvoted) {
      comment.upvotes.push(userId);
    } else if (type === 'down' && !hasDownvoted) {
      comment.downvotes.push(userId);
    }

    await discussion.save();

    res.json({
      upvotes: comment.upvotes.length,
      downvotes: comment.downvotes.length,
      userUpvoted: comment.upvotes.some(id => id.equals(userId)),
      userDownvoted: comment.downvotes.some(id => id.equals(userId))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE discussion (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const discussion = await Discussion.findByIdAndDelete(req.params.id);

    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    res.json({ message: 'Discussion deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
