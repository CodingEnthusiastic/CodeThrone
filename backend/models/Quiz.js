const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  chapter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chapter',
    required: true
  },
  questions: [{
    questionText: {
      type: String,
      required: true
    },
    options: [{
      text: String,
      isCorrect: Boolean
    }],
    explanation: String
  }],
  passingScore: {
    type: Number,
    default: 70
  },
  timeLimit: {
    type: Number, // in minutes
    default: 10
  },
  published: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Quiz', quizSchema);
