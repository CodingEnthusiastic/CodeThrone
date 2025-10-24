import mongoose from 'mongoose';

console.log('📊 Loading RapidFire Stats model...');

// Enhanced RapidFire Statistics Model
const rapidFireStatsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  // Basic Game Stats
  gamesPlayed: { type: Number, default: 0 },
  gamesWon: { type: Number, default: 0 },
  gamesLost: { type: Number, default: 0 },
  gamesTied: { type: Number, default: 0 },

  // Performance Stats
  totalScore: { type: Number, default: 0 },
  averageScore: { type: Number, default: 0 },
  bestScore: { type: Number, default: 0 },
  worstScore: { type: Number, default: 0 },

  // Question Stats
  totalQuestionsAnswered: { type: Number, default: 0 },
  totalCorrectAnswers: { type: Number, default: 0 },
  totalWrongAnswers: { type: Number, default: 0 },
  accuracy: { type: Number, default: 0 }, // Percentage

  // Rating System
  currentRating: { type: Number, default: 1200 },
  highestRating: { type: Number, default: 1200 },
  lowestRating: { type: Number, default: 1200 },
  ratingHistory: [{
    rating: Number,
    change: Number,
    gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'RapidFireGame' },
    opponent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    result: { type: String, enum: ['win', 'loss', 'draw'] },
    date: { type: Date, default: Date.now }
  }],

  // Streak Stats
  currentWinStreak: { type: Number, default: 0 },
  longestWinStreak: { type: Number, default: 0 },
  currentLossStreak: { type: Number, default: 0 },
  longestLossStreak: { type: Number, default: 0 },

  // Time Stats
  averageGameTime: { type: Number, default: 0 },
  totalGameTime: { type: Number, default: 0 },

  // Recent Performance (last 10 games)
  recentResults: [{
    gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'RapidFireGame' },
    result: { type: String, enum: ['win', 'loss', 'draw'] },
    score: Number,
    opponent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ratingChange: Number,
    date: { type: Date, default: Date.now }
  }],

  // Achievements
  achievements: [{
    type: String,
    unlockedAt: { type: Date, default: Date.now },
    gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'RapidFireGame' }
  }],

}, {
  timestamps: true
});

// Calculate win rate
rapidFireStatsSchema.virtual('winRate').get(function() {
  if (this.gamesPlayed === 0) return 0;
  return ((this.gamesWon / this.gamesPlayed) * 100).toFixed(2);
});

// Update stats after a game
rapidFireStatsSchema.methods.updateAfterGame = function(gameResult) {
  const { result, score, opponent, ratingChange, gameId, gameTime } = gameResult;
  
  // Update basic stats
  this.gamesPlayed += 1;
  if (result === 'win') {
    this.gamesWon += 1;
    this.currentWinStreak += 1;
    this.currentLossStreak = 0;
    this.longestWinStreak = Math.max(this.longestWinStreak, this.currentWinStreak);
  } else if (result === 'loss') {
    this.gamesLost += 1;
    this.currentLossStreak += 1;
    this.currentWinStreak = 0;
    this.longestLossStreak = Math.max(this.longestLossStreak, this.currentLossStreak);
  } else if (result === 'draw') {
    this.gamesTied += 1;
    this.currentWinStreak = 0;
    this.currentLossStreak = 0;
  }

  // Update score stats
  this.totalScore += score;
  this.averageScore = this.totalScore / this.gamesPlayed;
  this.bestScore = Math.max(this.bestScore, score);
  if (this.worstScore === 0 || score < this.worstScore) {
    this.worstScore = score;
  }

  // Update rating
  if (ratingChange !== undefined) {
    this.currentRating += ratingChange;
    this.highestRating = Math.max(this.highestRating, this.currentRating);
    this.lowestRating = Math.min(this.lowestRating, this.currentRating);

    // Add to rating history
    this.ratingHistory.push({
      rating: this.currentRating,
      change: ratingChange,
      gameId,
      opponent,
      result,
      date: new Date()
    });

    // Keep only last 50 rating history entries
    if (this.ratingHistory.length > 50) {
      this.ratingHistory = this.ratingHistory.slice(-50);
    }
  }

  // Update time stats
  if (gameTime) {
    this.totalGameTime += gameTime;
    this.averageGameTime = this.totalGameTime / this.gamesPlayed;
  }

  // Update recent results
  this.recentResults.push({
    gameId,
    result,
    score,
    opponent,
    ratingChange,
    date: new Date()
  });

  // Keep only last 10 recent results
  if (this.recentResults.length > 10) {
    this.recentResults = this.recentResults.slice(-10);
  }

  return this;
};

// Check for achievements
rapidFireStatsSchema.methods.checkAchievements = function() {
  const newAchievements = [];

  // First Win
  if (this.gamesWon === 1 && !this.achievements.find(a => a.type === 'first_win')) {
    newAchievements.push({ type: 'first_win' });
  }

  // Win Streaks
  if (this.currentWinStreak === 5 && !this.achievements.find(a => a.type === 'win_streak_5')) {
    newAchievements.push({ type: 'win_streak_5' });
  }

  if (this.currentWinStreak === 10 && !this.achievements.find(a => a.type === 'win_streak_10')) {
    newAchievements.push({ type: 'win_streak_10' });
  }

  // Games Played Milestones
  if (this.gamesPlayed === 10 && !this.achievements.find(a => a.type === 'games_10')) {
    newAchievements.push({ type: 'games_10' });
  }

  if (this.gamesPlayed === 50 && !this.achievements.find(a => a.type === 'games_50')) {
    newAchievements.push({ type: 'games_50' });
  }

  if (this.gamesPlayed === 100 && !this.achievements.find(a => a.type === 'games_100')) {
    newAchievements.push({ type: 'games_100' });
  }

  // Rating Milestones
  if (this.currentRating >= 1500 && !this.achievements.find(a => a.type === 'rating_1500')) {
    newAchievements.push({ type: 'rating_1500' });
  }

  if (this.currentRating >= 1800 && !this.achievements.find(a => a.type === 'rating_1800')) {
    newAchievements.push({ type: 'rating_1800' });
  }

  // Perfect Score
  if (this.bestScore >= 10 && !this.achievements.find(a => a.type === 'perfect_score')) {
    newAchievements.push({ type: 'perfect_score' });
  }

  // Add new achievements
  this.achievements.push(...newAchievements);

  return newAchievements;
};

console.log('✅ RapidFire Stats model schema defined');

export default mongoose.model('RapidFireStats', rapidFireStatsSchema);