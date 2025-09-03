import mongoose from 'mongoose';

const courseCompletionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  chaptersCompleted: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chapter'
  }],
  quizScores: [{
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz'
    },
    score: Number,
    passedAt: Date
  }],
  startDate: {
    type: Date,
    default: Date.now
  },
  completionDate: {
    type: Date
  },
  certificateId: {
    type: String
  },
  certificateIssueDate: {
    type: Date
  }
});

courseCompletionSchema.index({ user: 1, course: 1 }, { unique: true });

const CourseCompletion = mongoose.model('CourseCompletion', courseCompletionSchema);
export default CourseCompletion;
