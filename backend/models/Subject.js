import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  description: {
    type: String,
    trim: true
  },
  icon: {
    type: String, // Icon name or emoji
    default: '📚'
  },
  color: {
    type: String, // Color hex code
    default: '#3B82F6'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  documentsCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

// Update documentsCount when documents are added/removed
subjectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Subject', subjectSchema);