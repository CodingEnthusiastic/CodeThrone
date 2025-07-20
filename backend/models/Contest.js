import mongoose from 'mongoose';

console.log('📋 Loading Contest model...');

const contestSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  bannerImage: {
    type: String, // optional contest banner for UI
    default: ''
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in minutes
    required: true
  },
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'ended'],
    default: 'upcoming'
  },
  problems: [{
    problem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Problem'
    },
    score: {
      type: Number,
      default: 100
    },
    order: {
      type: Number // optional display order
    }
  }],
  participants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: { type: String }, // cached for faster leaderboard access
    score: { type: Number, default: 0 },
    rank: { type: Number, default: 0 },
    submissions: [{
      problem: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem' },
      score: { type: Number, default: 0 },
      timeSubmitted: Date,
      penalty: { type: Number, default: 0 },
      attempts: { type: Number, default: 0 }
    }],
    joinTime: { type: Date, default: Date.now }
  }],
  leaderboardVisible: {
    type: Boolean,
    default: true
  },
  freezeTime: {
    type: Number, // in minutes before end (e.g. last 30 mins freeze)
    default: 0
  },
  editorial: {
    type: String, // Markdown or URL to editorial doc
    default: ''
  },
  rules: {
    type: String, // Markdown formatted rules
    default: ''
  },
  allowedLanguages: [{
    type: String,
    enum: ['c', 'cpp', 'java', 'python', 'js'],
    default: ['cpp', 'python']
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  password: {
    type: String, // for private contests
    default: ''
  }
}, {
  timestamps: true
});

console.log('✅ Contest model schema defined');

export default mongoose.model('Contest', contestSchema);
