const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  module: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module',
    required: true
  },
  order: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['article', 'quiz', 'video'],
    default: 'article'
  },
  content: {
    type: String,
    required: true
  },
  published: {
    type: Boolean,
    default: false
  },
  duration: {
    type: Number, // in minutes
    default: 5
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  completedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    completedAt: {
      type: Date,
      default: Date.now
    }
  }]
});

module.exports = mongoose.model('Chapter', chapterSchema);
