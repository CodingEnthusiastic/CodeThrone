import express from 'express';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/users - List all users (admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    console.error('❌ [USERS] Error fetching users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/users/:id - Get user by ID (admin only)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/users - Create new user (admin only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { username, email, password, role, profile } = req.body;
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }
    const user = new User({ username, email, password, role, profile });
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/users/:id - Update user (admin only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { username, email, role, profile, isVerified, isBanned, coins } = req.body;
    const update = { username, email, role, profile, isVerified, isBanned, coins };
    // Remove undefined fields
    Object.keys(update).forEach(key => update[key] === undefined && delete update[key]);
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/users/:id - Delete user (admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/users/contest-leaderboard - Contest leaderboard
router.get('/contest-leaderboard', async (req, res) => {
  try {
    console.log('[Leaderboard] Contest leaderboard route called');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    console.log('[Leaderboard] Params:', { page, limit, skip });

    // Get total user count
    const totalUsers = await User.countDocuments();
    console.log('[Leaderboard] Total users:', totalUsers);

    // Get leaderboard users
    const users = await User.find({})
      .select('username avatar ratings.contestRating stats.contestsPlayed stats.contestsWon')
      .sort({ 'ratings.contestRating': -1 })
      .skip(skip)
      .limit(limit);
    console.log('[Leaderboard] Leaderboard users:', users.map(u => ({ username: u.username, rating: u.ratings?.contestRating })));

    // Get current user rank if authenticated (optional)
    let currentUserRank = null;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        console.log('[Leaderboard] Authorization header found, token:', token);
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('[Leaderboard] Decoded JWT:', decoded);
        const userId = decoded.userId;
        console.log('[Leaderboard] UserId from token:', userId);
        if (userId) {
          const currentUser = await User.findById(userId);
          console.log('[Leaderboard] Current user:', currentUser?.username);
          if (currentUser) {
            const betterUsers = await User.countDocuments({
              'ratings.contestRating': { $gt: currentUser.ratings.contestRating }
            });
            const rank = betterUsers + 1;
            const percentile = ((totalUsers - rank) / totalUsers) * 100;
            currentUserRank = { rank, percentile };
            console.log('[Leaderboard] Current user rank:', currentUserRank);
          }
        }
      } catch (error) {
        // Ignore auth errors for public leaderboard
        console.log('[Leaderboard] Auth error in contest leaderboard:', error.message);
      }
    }

    res.json({
      users,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: page,
      currentUserRank
    });
    console.log('[Leaderboard] Contest leaderboard response sent');
  } catch (error) {
    console.error('❌ [USERS] Error fetching contest leaderboard:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/users/game-leaderboard - Game leaderboard  
router.get('/game-leaderboard', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total user count
    const totalUsers = await User.countDocuments();

    // Get leaderboard users
    const users = await User.find({})
      .select('username avatar ratings.gameRating stats.gamesPlayed stats.gamesWon')
      .sort({ 'ratings.gameRating': -1 })
      .skip(skip)
      .limit(limit);

    // Get current user rank if authenticated (optional)
    let currentUserRank = null;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        
        if (userId) {
          const currentUser = await User.findById(userId);
          if (currentUser) {
            const betterUsers = await User.countDocuments({
              'ratings.gameRating': { $gt: currentUser.ratings.gameRating }
            });
            const rank = betterUsers + 1;
            const percentile = ((totalUsers - rank) / totalUsers) * 100;
            currentUserRank = { rank, percentile };
          }
        }
      } catch (error) {
        console.log('Auth error in game leaderboard:', error.message);
      }
    }

    res.json({
      users,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: page,
      currentUserRank
    });
  } catch (error) {
    console.error('❌ [USERS] Error fetching game leaderboard:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/users/rapidfire-leaderboard - RapidFire leaderboard
router.get('/rapidfire-leaderboard', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total user count
    const totalUsers = await User.countDocuments();

    // Get leaderboard users
    const users = await User.find({})
      .select('username avatar ratings.rapidFireRating stats.rapidFireGamesPlayed stats.rapidFireGamesWon')
      .sort({ 'ratings.rapidFireRating': -1 })
      .skip(skip)
      .limit(limit);

    // Get current user rank if authenticated (optional)
    let currentUserRank = null;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        
        if (userId) {
          const currentUser = await User.findById(userId);
          if (currentUser) {
            const betterUsers = await User.countDocuments({
              'ratings.rapidFireRating': { $gt: currentUser.ratings.rapidFireRating }
            });
            const rank = betterUsers + 1;
            const percentile = ((totalUsers - rank) / totalUsers) * 100;
            currentUserRank = { rank, percentile };
          }
        }
      } catch (error) {
        console.log('Auth error in rapidfire leaderboard:', error.message);
      }
    }

    res.json({
      users,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: page,
      currentUserRank
    });
  } catch (error) {
    console.error('❌ [USERS] Error fetching rapidfire leaderboard:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

