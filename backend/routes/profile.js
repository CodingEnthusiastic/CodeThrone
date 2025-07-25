import express from 'express';
import multer from 'multer';
import User from '../models/User.js';
import Problem from '../models/Problem.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

// Get user profile
router.get('/:username', async (req, res) => {
  console.log('👤 Profile request started for username:', req.params.username);
  
  try {
    const username = req.params.username.trim();
    console.log('🔍 Trimmed username:', username);
    console.log('🔍 Username length:', username.length);
    
    // First try exact match
    console.log('🔍 Attempting exact match search...');
    let user = await User.findOne({ 
      username: username
    })
      .select('-password')
      .populate('solvedProblems', 'title difficulty')
      .populate('gameHistory.opponent', 'username')
      .populate('gameHistory.problem', 'title difficulty')
      .populate('contestHistory.contest', 'name');

    console.log('🔍 Exact match result:', user ? `Found user: ${user.username}` : 'Not found');
    
    if (!user) {
      console.log('🔍 Attempting case-insensitive search...');
      
      // Try case-insensitive search as fallback
      user = await User.findOne({ 
        username: { $regex: new RegExp(`^${username}$`, 'i') }
      })
        .select('-password')
        .populate('solvedProblems', 'title difficulty')
        .populate('gameHistory.opponent', 'username')
        .populate('gameHistory.problem', 'title difficulty')
        .populate('contestHistory.contest', 'name');
      
      console.log('🔍 Case-insensitive result:', user ? `Found user: ${user.username}` : 'Not found');
    }
    
    if (!user) {
      console.log('❌ User not found after all attempts');
      
      // Debug: Let's see what users exist
      const allUsers = await User.find({}).select('username').limit(10);
      console.log('🔍 Available usernames in DB:', allUsers.map(u => u.username));
      
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('✅ User profile found successfully');
    console.log('📊 User basic info:', {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    });
    
    // Calculate accurate stats from submissions
    console.log('📊 Calculating user statistics...');
    const submissions = user.submissions || [];
    const totalSubmissions = submissions.length;
    const correctSubmissions = submissions.filter(sub => sub.status === 'accepted').length;
    const accuracy = totalSubmissions > 0 ? (correctSubmissions / totalSubmissions) * 100 : 0;
    
    // Calculate streak
    console.log('📈 Calculating streak data...');
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;
    
    // Sort submissions by date
    const sortedSubmissions = submissions
      .filter(sub => sub.status === 'accepted')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Calculate current streak (consecutive days with accepted submissions)
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let streakDate = new Date(today);
    for (const submission of sortedSubmissions) {
      const submissionDate = new Date(submission.date);
      const daysDiff = Math.floor((streakDate.getTime() - submissionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 1) {
        currentStreak++;
        streakDate = submissionDate;
      } else {
        break;
      }
    }
    
    // Calculate max streak
    let currentTempStreak = 0;
    let lastDate = null;
    
    for (const submission of sortedSubmissions.reverse()) {
      const submissionDate = new Date(submission.date);
      const dayOnly = new Date(submissionDate.getFullYear(), submissionDate.getMonth(), submissionDate.getDate());
      
      if (!lastDate || dayOnly.getTime() === lastDate.getTime() + (24 * 60 * 60 * 1000)) {
        currentTempStreak++;
        maxStreak = Math.max(maxStreak, currentTempStreak);
      } else if (dayOnly.getTime() !== lastDate?.getTime()) {
        currentTempStreak = 1;
      }
      
      lastDate = dayOnly;
    }
    
    console.log('📊 Calculated stats:', { totalSubmissions, correctSubmissions, accuracy, currentStreak, maxStreak });
    
    // Ensure stats object exists with proper structure
    if (!user.stats) {
      user.stats = {
        problemsSolved: { total: 0, easy: 0, medium: 0, hard: 0 },
        problemsAttempted: 0,
        totalSubmissions: totalSubmissions,
        correctSubmissions: correctSubmissions,
        accuracy: accuracy,
        currentStreak: currentStreak,
        maxStreak: maxStreak
      };
    } else {
      // Update existing stats with calculated values
      user.stats.totalSubmissions = totalSubmissions;
      user.stats.correctSubmissions = correctSubmissions;
      user.stats.accuracy = accuracy;
      user.stats.currentStreak = currentStreak;
      user.stats.maxStreak = maxStreak;
    }
    
    // Ensure ratings object exists
    if (!user.ratings) {
      user.ratings = {
        gameRating: 1200,
        contestRating: 1200,
        globalRank: 0,
        percentile: 0
      };
    }
    
    // Ensure profile object exists
    if (!user.profile) {
      user.profile = {
        firstName: '',
        lastName: '',
        linkedIn: '',
        github: '',
        avatar: '',
        bio: '',
        location: '',
        college: '',
        branch: '',
        graduationYear: null
      };
    }
    
    // Ensure coins exist (default 0 for new users)
    if (user.coins === undefined || user.coins === null) {
      user.coins = 0;
      await User.findByIdAndUpdate(user._id, { coins: 0 });
    }
    
    // Set default avatar if none exists (first letter of username)
    if (!user.profile.avatar || user.profile.avatar.trim() === '') {
      user.profile.avatar = `default:${user.username.charAt(0).toUpperCase()}`;
      // Save the default avatar to database
      await User.findByIdAndUpdate(user._id, {
        'profile.avatar': user.profile.avatar
      });
    }
    
    // Ensure arrays exist
    if (!user.solvedProblems) user.solvedProblems = [];
    if (!user.gameHistory) user.gameHistory = [];
    if (!user.contestHistory) user.contestHistory = [];
    if (!user.submissions) user.submissions = [];
    if (!user.recentActivities) user.recentActivities = [];
    if (!user.topicProgress) user.topicProgress = [];
    
    // Get total problems count
    const totalProblemsCount = await Problem.countDocuments();
    
    console.log('📊 Final user stats:', {
      username: user.username,
      totalSolved: user.stats.problemsSolved.total,
      totalProblemsInSystem: totalProblemsCount,
      gameRating: user.ratings.gameRating,
      contestRating: user.ratings.contestRating,
      solvedProblemsCount: user.solvedProblems.length,
      gameHistoryCount: user.gameHistory.length,
      submissionsCount: user.submissions.length
    });
    
    // Add total problems count to the response
    const responseData = {
      ...user.toObject(),
      totalProblemsCount: totalProblemsCount
    };
    
    res.json(responseData);
  } catch (error) {
    console.error('❌ Profile fetch error:', error);
    console.error('📊 Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update profile
router.put('/update', authenticateToken, async (req, res) => {
  console.log('✏️ Profile update request');
  console.log('👤 User:', req.user.username);
  console.log('📊 Update data:', req.body);
  
  try {
    const { profile } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profile },
      { new: true }
    ).select('-password');

    console.log('✅ Profile updated successfully');
    res.json(user);
  } catch (error) {
    console.error('❌ Profile update error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Upload profile image
router.put('/upload-image', authenticateToken, upload.single('profileImage'), async (req, res) => {
  console.log('📸 Profile image upload request');
  console.log('👤 User:', req.user.username);
  
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Convert image to base64
    const imageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    
    // Update user's avatar in profile
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { 
        'profile.avatar': imageBase64 
      },
      { new: true }
    ).select('-password');

    console.log('✅ Profile image updated successfully');
    res.json({ 
      message: 'Profile image updated successfully',
      avatar: user.profile.avatar 
    });
  } catch (error) {
    console.error('❌ Profile image upload error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's solved problems
router.get('/:username/solved', async (req, res) => {
  console.log('✅ Get solved problems request for:', req.params.username);
  
  try {
    const username = req.params.username.trim();
    console.log('🔍 Looking for solved problems for user:', username);
    
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    })
      .select('solvedProblems')
      .populate('solvedProblems', 'title difficulty tags');

    if (!user) {
      console.log('❌ User not found for solved problems');
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('✅ Found solved problems for', username, ':', user.solvedProblems.length);
    res.json({ solvedProblems: user.solvedProblems || [] });
  } catch (error) {
    console.error('❌ Get solved problems error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;