import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import passport from 'passport';
import session from 'express-session';
import '../services/passport.js'; // See next code block for this file

const router = express.Router();

// Session middleware for passport (required for OAuth)
router.use(session({
  secret: process.env.JWT_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
}));
router.use(passport.initialize());
router.use(passport.session());

// Register
router.post('/register', async (req, res) => {
  console.log('📝 Registration attempt started');
  console.log('📊 Request body:', { ...req.body, password: '[HIDDEN]' });
  try {
    const { username, email, password, role = 'user', googleId } = req.body;
    console.log('🔍 Checking for existing user...');
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    console.log('🔍 Existing user query result:', existingUser);
    if (existingUser) {
      console.log('❌ User already exists:', existingUser.username);
      return res.status(400).json({ message: 'User already exists with this email or username' });
    }
    console.log('✅ No existing user found, creating new user...');
    const userData = {
      username,
      email,
      password: googleId ? undefined : password,
      role,
      googleId: googleId || undefined,
      coins: 0,
      profile: {
        firstName: '',
        lastName: '',
        linkedIn: '',
        github: '',
        avatar: `default:${username.charAt(0).toUpperCase()}`,
        bio: '',
        location: '',
        college: '',
        branch: '',
        graduationYear: null
      }
    };
    console.log('🛠 User data to be saved:', userData);
    const user = new User(userData);
    console.log('💾 Saving user to database...');
    try {
      await user.save();
      console.log('✅ User saved successfully:', user.username);
    } catch (saveError) {
      console.error('❌ Error during user.save():', saveError);
      if (saveError.code === 11000) {
        const field = Object.keys(saveError.keyPattern)[0];
        return res.status(400).json({ message: `A user with this ${field} already exists.` });
      }
      return res.status(500).json({ message: 'Error saving user', error: saveError.message });
    }
    console.log('🔐 Generating JWT token...');
    let token;
    try {
      token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      console.log('✅ JWT token generated');
    } catch (jwtError) {
      console.error('❌ Error generating JWT:', jwtError);
      return res.status(500).json({ message: 'Error generating token', error: jwtError.message });
    }
    const responseData = {
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    };
    console.log('🎉 Registration successful for:', user.username);
    res.status(201).json(responseData);
  } catch (error) {
    console.error('❌ Registration error (outer catch):', error);
    console.error('📊 Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  console.log('🔐 Login attempt started');
  console.log('📊 Request body:', { ...req.body, password: '[HIDDEN]' });
  
  try {
    const { username, password, role = 'user' } = req.body;

    console.log('🔍 Searching for user:', username);
    // Find user
    const user = await User.findOne({ 
      $or: [{ email: username }, { username }] 
    });

    if (!user) {
      console.log('❌ User not found:', username);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check role
    if (user.role !== "user" && user.role !== "admin") {
      console.log('❌ Role not allowed for user:', user.username, 'Actual:', user.role);
      return res.status(400).json({ message: 'Invalid credentials or insufficient permissions' });
    }

    console.log('✅ User found:', user.username);
    console.log('🔒 Checking password...');
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('❌ Password mismatch for user:', user.username);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    console.log('✅ Password verified for:', user.username);
    console.log('🔐 Generating JWT token...');
    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    console.log('✅ JWT token generated');

    const responseData = {
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    };

    console.log('🎉 Login successful for:', user.username);
    res.json(responseData);
  } catch (error) {
    console.error('❌ Login error:', error);
    console.error('📊 Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  console.log('👤 Get current user request');
  console.log('📊 User ID from token:', req.user._id);

  try {
    const user = await User.findById(req.user._id)
      .select('-password'); // Remove .lean() to allow saving

    if (!user) 
    {
      console.log('❌ User not found');
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate streak from submissions (use UTC for consistency)
    console.log('📈 Calculating current streak...');
    const submissions = user.submissions || [];
    const acceptedSubmissions = submissions
      .filter(sub => sub.status === 'accepted')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    let currentStreak = 0;
    if (acceptedSubmissions.length > 0) {
      // Get today's date in UTC
      const now = new Date();
      const todayUTC = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
      
      // Group submissions by UTC date
      const submissionDates = new Set();
      acceptedSubmissions.forEach(sub => {
        const subDate = new Date(sub.date);
        const utcDate = new Date(subDate.getUTCFullYear(), subDate.getUTCMonth(), subDate.getUTCDate());
        submissionDates.add(utcDate.getTime());
      });
      
      // Convert to sorted array of dates
      const sortedDates = Array.from(submissionDates)
        .map(timestamp => new Date(timestamp))
        .sort((a, b) => b.getTime() - a.getTime());
      
      // Calculate consecutive streak from most recent date
      if (sortedDates.length > 0) {
        const mostRecentDate = sortedDates[0];
        const daysSinceLastSubmission = Math.floor((todayUTC.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24));
        
        console.log(`📈 Days since last submission: ${daysSinceLastSubmission}, Most recent: ${mostRecentDate.toISOString()}, Today: ${todayUTC.toISOString()}`);
        
        // Only count streak if last submission was today or yesterday
        if (daysSinceLastSubmission <= 1) {
          currentStreak = 1;
          let lastDate = mostRecentDate;
          
          for (let i = 1; i < sortedDates.length; i++) {
            const currentDate = sortedDates[i];
            const daysDiff = Math.floor((lastDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysDiff === 1) {
              currentStreak++;
              lastDate = currentDate;
            } else {
              break;
            }
          }
        }
      }
    }

    // Update user's currentStreak if different
    if (!user.stats) {
      user.stats = {
        problemsSolved: { total: 0, easy: 0, medium: 0, hard: 0 },
        problemsAttempted: 0,
        totalSubmissions: submissions.length,
        correctSubmissions: acceptedSubmissions.length,
        accuracy: submissions.length > 0 ? (acceptedSubmissions.length / submissions.length) * 100 : 0,
        currentStreak: currentStreak,
        maxStreak: Math.max(user.stats?.maxStreak || 0, currentStreak)
      };
    } else {
      user.stats.currentStreak = currentStreak;
      if (currentStreak > (user.stats.maxStreak || 0)) {
        user.stats.maxStreak = currentStreak;
      }
    }

    // Save the updated user data
    await user.save();

    // ✅ Compute default avatar on-the-fly, don't write to DB
    if (!user.profile) {
      user.profile = {
        firstName: '',
        lastName: '',
        linkedIn: '',
        github: '',
        avatar: `default:${user.username.charAt(0).toUpperCase()}`,
        bio: '',
        location: '',
        college: '',
        branch: '',
        graduationYear: null
      };
    } else if (!user.profile.avatar || user.profile.avatar.trim() === '') {
      user.profile.avatar = `default:${user.username.charAt(0).toUpperCase()}`;
    }

    console.log('✅ User data retrieved with streak:', user.username, 'streak:', currentStreak);
    res.json(user);
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


// --- Google OAuth2 routes ---
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  async (req, res) => {
    // Successful authentication, issue JWT and redirect or respond
    const user = req.user;
    // Ensure user object has all required fields for frontend
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    // Redirect to frontend (production or development)
    const frontendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://codethrone.netlify.app'
      : 'https://codethrone.netlify.app';
    res.redirect(`${frontendUrl}/oauth?token=${encodeURIComponent(token)}`);
    // Or: res.json({ token, user });
  }
);

export default router;
