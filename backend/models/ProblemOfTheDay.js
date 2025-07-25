import mongoose from 'mongoose';

const problemOfTheDaySchema = new mongoose.Schema({
  problem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Problem',
    required: true
  },
  date: {
    type: Date,
    required: true,
    unique: true
  },
  solvedCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
problemOfTheDaySchema.index({ date: -1 });
problemOfTheDaySchema.index({ isActive: 1 });

const ProblemOfTheDay = mongoose.model('ProblemOfTheDay', problemOfTheDaySchema);

export default ProblemOfTheDay;
