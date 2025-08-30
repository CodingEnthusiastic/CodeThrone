import mongoose from 'mongoose';

console.log('📋 Loading RapidFire Game model...');

const rapidFireGameSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },

  // Game Configuration
  gameMode: {
    type: String,
    enum: ['random', 'room'],
    required: true
  },
  
  // MCQ Set Configuration
  questionSet: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MCQQuestion',
    required: true
  }],
  
  totalQuestions: {
    type: Number,
    default: 10
  },
  
  timeLimit: {
    type: Number,
    default: 60 // 60 seconds
  },

  // Game Timing
  startTime: Date,
  endTime: Date,
  duration: Number, // calculated in seconds

  // Game Status
  status: {
    type: String,
    enum: ['waiting', 'ongoing', 'finished', 'cancelled'],
    default: 'waiting'
  },

  // Players with MCQ-specific fields
  players: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    usernameSnapshot: String,
    avatarSnapshot: String,
    status: { type: String, enum: ['waiting', 'playing', 'finished', 'left'], default: 'waiting' },
    
    // MCQ Game Stats
    score: { type: Number, default: 0 }, // Final score (correct - 0.5*wrong)
    correctAnswers: { type: Number, default: 0 },
    wrongAnswers: { type: Number, default: 0 },
    questionsAnswered: { type: Number, default: 0 },
    
    // Answers tracking
    answers: [{
      questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'MCQQuestion' },
      selectedOption: Number, // 0-3 index
      isCorrect: Boolean,
      timeSpent: Number, // seconds
      answeredAt: Date
    }],
    
    // Rating for this game
    ratingBefore: Number,
    ratingAfter: Number,
    ratingChange: Number,
    
    // Timing
    joinedAt: { type: Date, default: Date.now },
    finishedAt: Date,
    leftAt: Date
  }],

  // Result
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  result: {
    type: String,
    enum: ['win', 'draw', 'timeout', 'cancelled', 'opponent_left'],
    default: null
  },

  // Question Distribution (3 DSA, 3 System Design, 2 AI/ML, 2 Aptitude)
  questionDistribution: {
    dsa: { type: Number, default: 3 },
    'system-design': { type: Number, default: 3 },
    aiml: { type: Number, default: 2 },
    aptitude: { type: Number, default: 2 }
  },

  // Game Logs
  logs: [{
    timestamp: { type: Date, default: Date.now },
    action: String, // 'joined', 'left', 'answered', 'finished', etc.
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    details: mongoose.Schema.Types.Mixed
  }]

}, {
  timestamps: true
});

// Calculate final scores method
rapidFireGameSchema.methods.calculatePlayerScore = function(playerId) {
  const player = this.players.find(p => p.user.toString() === playerId.toString());
  if (!player) return 0;
  
  // Score = Correct answers * 1 - Wrong answers * 0.5
  return player.correctAnswers - (player.wrongAnswers * 0.5);
};

// Determine winner method
rapidFireGameSchema.methods.determineWinner = function() {
  if (this.players.length < 2) return null;
  
  const scores = this.players.map(p => ({
    user: p.user,
    score: this.calculatePlayerScore(p.user)
  }));
  
  scores.sort((a, b) => b.score - a.score);
  
  // Check for tie
  if (scores[0].score === scores[1].score) {
    return 'draw';
  }
  
  return scores[0].user;
};

console.log('✅ RapidFire Game model schema defined');

export default mongoose.model('RapidFireGame', rapidFireGameSchema);
