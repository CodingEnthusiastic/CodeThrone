import mongoose from 'mongoose';

console.log('📋 Loading Announcement model...');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true // Markdown / HTML-supported
  },
  type: {
    type: String,
    enum: ['general', 'contest', 'maintenance', 'feature', 'update', 'alert'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  imageUrl: {
    type: String, // optional image (maintenance banner or new feature visual)
    default: ''
  },
  link: {
    type: String, // optional external or internal link
    default: ''
  },
  expiresAt: {
    type: Date,
    default: null
  },
  visibleToRoles: [{
    type: String,
    enum: ['user', 'admin'],
    default: ['user']
  }],
  pinned: {
    type: Boolean,
    default: false // Show at top
  },
  contestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contest',
    default: null // if it's related to a contest
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  acknowledgedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // users who have marked it as read
  }]
}, {
  timestamps: true
});

console.log('✅ Enhanced Announcement model schema defined');

export default mongoose.model('Announcement', announcementSchema);
