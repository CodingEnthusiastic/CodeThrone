import mongoose from 'mongoose';

console.log('📋 Loading MCQ Question model...');

const mcqQuestionSchema = new mongoose.Schema({
  // Question Content
  question: {
    type: String,
    required: true,
    trim: true
  },
  
  // Options (4 choices)
  options: [{
    text: {
      type: String,
      required: true,
      trim: true
    },
    isCorrect: {
      type: Boolean,
      default: false
    }
  }],

  // Question Domain
  domain: {
    type: String,
    enum: ['dsa', 'system-design', 'aiml', 'aptitude'],
    required: true
  },

  // Difficulty Level
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium'
  },

  // Question Metadata
  explanation: {
    type: String,
    trim: true
  },
  
  tags: [{
    type: String,
    trim: true
  }],

  // Admin Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false  // Make optional for seeding
  },

  // Stats
  timesAsked: {
    type: Number,
    default: 0
  },
  correctAnswers: {
    type: Number,
    default: 0
  },
  totalAttempts: {
    type: Number,
    default: 0
  },

  // Status
  isActive: {
    type: Boolean,
    default: true
  }

}, {
  timestamps: true
});

// Ensure exactly 4 options with one correct answer
mcqQuestionSchema.pre('save', function(next) {
  if (this.options.length !== 4) {
    return next(new Error('MCQ must have exactly 4 options'));
  }
  
  const correctAnswers = this.options.filter(option => option.isCorrect);
  if (correctAnswers.length !== 1) {
    return next(new Error('MCQ must have exactly 1 correct answer'));
  }
  
  next();
});

// Calculate accuracy rate
mcqQuestionSchema.virtual('accuracyRate').get(function() {
  return this.totalAttempts > 0 ? (this.correctAnswers / this.totalAttempts) * 100 : 0;
});

console.log('✅ MCQ Question model schema defined');

export default mongoose.model('MCQQuestion', mcqQuestionSchema);
