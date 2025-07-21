// import mongoose from 'mongoose';

// const gameSchema = new mongoose.Schema({
//   roomId: {
//     type: String,
//     required: true,
//     unique: true
//   },

//   // Game Configuration
//   gameMode: {
//     type: String,
//     enum: ['random', 'room', 'tournament'],
//     required: true
//   },
//   problem: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Problem',
//     required: true
//   },
//   timeLimit: {
//     type: Number,
//     required: true // in minutes
//   },
//   languageLock: {
//     type: String, // optional - like 'cpp', 'python' (if locked)
//     default: null
//   },

//   // Game Timing
//   startTime: Date,
//   endTime: Date,
//   duration: Number, // calculated in minutes
//   createdAt: {
//     type: Date,
//     default: Date.now
//   },

//   // Game Status
//   status: {
//     type: String,
//     enum: ['waiting', 'ongoing', 'finished', 'cancelled'],
//     default: 'waiting'
//   },

//   // Players
//   players: [{
//     user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//     usernameSnapshot: String,
//     avatarSnapshot: String,
//     status: { type: String, enum: ['waiting', 'playing', 'finished'], default: 'waiting' },
//     code: String,
//     language: String,
//     score: { type: Number, default: 0 },
//     testCasesPassed: { type: Number, default: 0 },
//     totalTestCases: { type: Number, default: 0 },
//     submissionTime: Date,
//     runtime: Number,
//     memory: Number,
//     ratingBefore: Number,
//     ratingAfter: Number,
//     verdict: {
//       type: String,
//       enum: ['accepted', 'wrong', 'error', 'timeout', 'partial'],
//       default: 'partial'
//     }
//   }],

//   // Result
//   winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//   result: {
//     type: String,
//     enum: ['win', 'draw', 'timeout', 'cancelled'],
//     default: null
//   },

//   // Replay Metadata
//   submissionHistory: [{
//     user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//     code: String,
//     language: String,
//     submittedAt: { type: Date, default: Date.now },
//     verdict: String,
//     runtime: Number,
//     memory: Number
//   }],

//   // Anti-Cheat / Logs
//   flaggedFor: {
//     type: [String], // e.g., ['copy-paste', 'plagiarism', 'tab-switching']
//     default: []
//   },
//   logs: [{
//     timestamp: Date,
//     action: String // like 'code-submit', 'joined', 'left', 'tab-out', etc.
//   }]
// }, {
//   timestamps: true
// });

// export default mongoose.model('Game', gameSchema);
import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },

  // Game Configuration
  gameMode: {
    type: String,
    enum: ['random', 'room', 'tournament'],
    required: true
  },
  problem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Problem',
    required: true
  },
  timeLimit: {
    type: Number,
    required: true // in minutes
  },
  languageLock: {
    type: String, // optional - like 'cpp', 'python' (if locked)
    default: null
  },

  // Game Timing
  startTime: Date,
  endTime: Date,
  duration: Number, // calculated in minutes
  createdAt: {
    type: Date,
    default: Date.now
  },

  // Game Status
  status: {
    type: String,
    enum: ['waiting', 'ongoing', 'finished', 'cancelled'],
    default: 'waiting'
  },

  // Players
  players: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    usernameSnapshot: String,
    avatarSnapshot: String,
    status: { type: String, enum: ['waiting', 'playing', 'finished'], default: 'waiting' },
    code: String,
    language: String,
    score: { type: Number, default: 0 },
    testCasesPassed: { type: Number, default: 0 },
    totalTestCases: { type: Number, default: 0 },
    submissionTime: Date,
    runtime: Number,
    memory: Number,
    ratingBefore: Number,
    ratingAfter: Number,
    verdict: {
      type: String,
      enum: ['accepted', 'wrong', 'error', 'timeout', 'partial'],
      default: 'partial'
    }
  }],

  // Result
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  result: {
    type: String,
    enum: ['win', 'draw', 'timeout', 'cancelled', 'opponent_left'],
    default: null
  },

  // Replay Metadata
  submissionHistory: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    code: String,
    language: String,
    submittedAt: { type: Date, default: Date.now },
    verdict: String,
    runtime: Number,
    memory: Number
  }],

  // Anti-Cheat / Logs
  flaggedFor: {
    type: [String], // e.g., ['copy-paste', 'plagiarism', 'tab-switching']
    default: []
  },
  logs: [{
    timestamp: Date,
    action: String // like 'code-submit', 'joined', 'left', 'tab-out', etc.
  }]
}, {
  timestamps: true
});

export default mongoose.model('Game', gameSchema);