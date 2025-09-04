import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

console.log('📋 Loading User model...');

const userSchema = new mongoose.Schema({
  // Basic Auth Info
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    // Make password optional for Google OAuth users
    required: function() {
      // If googleId is present, password is not required
      return !this.googleId;
    },
    minlength: 6
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  googleId: { type: String, unique: true, sparse: true },

  // Profile Data
  profile: {
    firstName: String,
    lastName: String,
    linkedIn: String,
    github: String,
    avatar: String,
    bio: String,
    location: String,
    college: String,
    branch: String,
    graduationYear: Number
  },

  // Problem Stats
  stats: {
    problemsSolved: {
      total: { type: Number, default: 0 },
      easy: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      hard: { type: Number, default: 0 }
    },
    problemsAttempted: { type: Number, default: 0 },
    totalSubmissions: { type: Number, default: 0 },
    correctSubmissions: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 }, // % value
    currentStreak: { type: Number, default: 0 },
    maxStreak: { type: Number, default: 0 },
    lastSubmissionDate: { type: Date },
    
    // Game stats
    gamesPlayed: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 },
    gamesLost: { type: Number, default: 0 },
    gamesTied: { type: Number, default: 0 },
    
    // Contest stats  
    contestsPlayed: { type: Number, default: 0 },
    contestsWon: { type: Number, default: 0 },
    contestsLost: { type: Number, default: 0 },
    contestsTied: { type: Number, default: 0 },
    
    // RapidFire stats
    rapidFireGamesPlayed: { type: Number, default: 0 },
    rapidFireGamesWon: { type: Number, default: 0 },
    rapidFireGamesLost: { type: Number, default: 0 },
    rapidFireGamesTied: { type: Number, default: 0 }
  },

  // Topic wise performance
  topicProgress: [{
    topic: String,
    solved: Number,
    total: Number
  }],

  // Rating Systems
  ratings: {
    gameRating: { type: Number, default: 1200 },
    contestRating: { type: Number, default: 1200 },
    rapidFireRating: { type: Number, default: 1200 }, // New rapid-fire rating
    globalRank: { type: Number, default: 0 },
    percentile: { type: Number, default: 0 } // 98 = top 2%
  },
  
  // Latest form (last 5 match results)
  latestForm: [{ 
    type: String, 
    enum: ['W', 'L', 'D', '-'] // Win, Loss, Draw, No match
  }],

  // Coin System
  coins: { type: Number, default: 0 },
  
  // Problem of the Day Tracking
  solvedPOTD: [{
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem' },
    date: { type: Date },
    coinsEarned: { type: Number, default: 10 }
  }],

  // Progress Trackers
  solvedProblems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Problem' }],
  bookmarkedProblems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Problem' }],
  recentActivities: [{
    type: { type: String }, // 'submit', 'solve', 'contest', etc.
    date: { type: Date, default: Date.now },
    message: String
  }],

  // Submissions History
  submissions: [{
    problem: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem' },
    status: String, // 'accepted', 'wrong', etc
    language: String,
    code: String,
    runtime: Number,
    memory: Number,
    date: { type: Date, default: Date.now }
  }],

  // Game & Contest History
  gameHistory: [{
    opponent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    result: String, // 'win', 'lose', 'draw'
    ratingChange: Number,
    problem: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem' },
    date: { type: Date, default: Date.now }
  }],
  
  // Rapid Fire Game History
  rapidFireHistory: [{
    opponent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    result: String, // 'win', 'lose', 'draw'
    ratingChange: Number,
    score: Number, // Final score achieved
    correctAnswers: Number,
    wrongAnswers: Number,
    totalQuestions: Number,
    date: { type: Date, default: Date.now }
  }],
  
  contestHistory: [{
    contest: { type: mongoose.Schema.Types.ObjectId, ref: 'Contest' },
    rank: Number,
    score: Number,
    ratingChange: Number,
    problemsSolved: Number,
    totalProblems: Number,
    date: { type: Date, default: Date.now }
  }],

  // Recent Game Form (Last 5 results for leaderboard display)
  recentGameForm: [{
    result: { type: String, enum: ['W', 'L', 'D'], required: true }, // Win, Loss, Draw
    gameType: { type: String, enum: ['game', 'rapidfire', 'contest'], required: true },
    date: { type: Date, default: Date.now },
    ratingChange: Number
  }],

  // Badge & Achievements
  badges: [{
    name: String,
    description: String,
    earnedAt: Date,
    iconUrl: String
  }],

  // Settings
  preferences: {
    preferredLanguage: { type: String, default: 'cpp' },
    darkMode: { type: Boolean, default: true },
    notifications: { type: Boolean, default: true },
    editorFontSize: { type: Number, default: 14 },
    theme: { type: String, default: 'monokai' }
  },

  // Admin/Verification Flags
  isVerified: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false }

}, {
  timestamps: true
});

// Password Encryption Middleware
userSchema.pre('save', async function(next) {
  console.log('🔒 User pre-save middleware triggered for:', this.username);

  // Only hash password if present (not for Google OAuth users)
  if (!this.password || !this.isModified('password')) {
    return next();
  }

  console.log('🔐 Hashing password...');
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  console.log('✅ Password hashed successfully');
  next();
});

// Compare Password Function
userSchema.methods.comparePassword = async function(candidatePassword) {
  console.log('🔍 Comparing password for user:', this.username);
  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  console.log('🔒 Password match result:', isMatch);
  return isMatch;
};

// Update Recent Game Form - maintains last 5 game results
userSchema.methods.updateRecentGameForm = function(result, gameType, ratingChange = 0) {
  const formEntry = {
    result: result, // 'W', 'L', 'D'
    gameType: gameType, // 'game', 'rapidfire', 'contest'
    date: new Date(),
    ratingChange: ratingChange
  };

  // Add new result to the beginning
  this.recentGameForm.unshift(formEntry);

  // Keep only the last 5 results
  if (this.recentGameForm.length > 5) {
    this.recentGameForm = this.recentGameForm.slice(0, 5);
  }
};

// Get Latest Form as array of characters (for compatibility with frontend)
userSchema.methods.getLatestForm = function() {
  return this.recentGameForm.map(entry => entry.result);
};

console.log('✅ User model schema defined');

export default mongoose.model('User', userSchema);
