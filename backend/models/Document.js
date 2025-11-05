import mongoose from 'mongoose';

// Block schema for Notion-like content structure
const blockSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'paragraph',
      'heading',
      'bulletList',
      'orderedList',
      'listItem',
      'blockquote',
      'codeBlock',
      'image',
      'horizontalRule',
      'hardBreak',
      'text'
    ]
  },
  content: {
    type: mongoose.Schema.Types.Mixed, // Can be string, array, or object
    default: ''
  },
  attrs: {
    type: mongoose.Schema.Types.Mixed, // Additional attributes like level for headings, src for images
    default: {}
  },
  marks: [{
    type: {
      type: String,
      enum: ['bold', 'italic', 'code', 'link', 'underline', 'strike']
    },
    attrs: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }]
}, { _id: false });

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  blocks: [blockSchema], // Notion-style block structure
  description: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  difficulty: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Beginner'
  },
  readTime: {
    type: Number, // Estimated read time in minutes
    default: 5
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  metadata: {
    tableOfContents: [{
      id: String,
      text: String,
      level: Number
    }],
    wordCount: {
      type: Number,
      default: 0
    },
    imageCount: {
      type: Number,
      default: 0
    },
    lastEditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
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

// Indexes for better performance
documentSchema.index({ subject: 1, isPublished: 1 });
documentSchema.index({ slug: 1 });
documentSchema.index({ tags: 1 });
documentSchema.index({ createdAt: -1 });
documentSchema.index({ title: 'text', description: 'text' });

// Generate slug from title
documentSchema.pre('save', function(next) {
  // Always generate slug if it doesn't exist or if title changed
  if (!this.slug || this.isModified('title')) {
    const baseSlug = this.title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    
    // Ensure uniqueness with timestamp
    const timestamp = Date.now().toString().slice(-6);
    this.slug = `${baseSlug}-${timestamp}`;
  }
  
  this.updatedAt = Date.now();
  
  // Calculate metadata
  this.metadata.wordCount = this.calculateWordCount();
  this.metadata.imageCount = this.calculateImageCount();
  this.readTime = Math.max(1, Math.ceil(this.metadata.wordCount / 200)); // Assuming 200 WPM
  
  next();
});

// Calculate word count from blocks
documentSchema.methods.calculateWordCount = function() {
  let wordCount = 0;
  
  const countWordsInContent = (content) => {
    if (typeof content === 'string') {
      return content.trim().split(/\s+/).filter(word => word.length > 0).length;
    } else if (Array.isArray(content)) {
      return content.reduce((count, item) => count + countWordsInContent(item.content || ''), 0);
    }
    return 0;
  };
  
  this.blocks.forEach(block => {
    if (block.type !== 'image' && block.type !== 'horizontalRule') {
      wordCount += countWordsInContent(block.content);
    }
  });
  
  return wordCount;
};

// Calculate image count from blocks
documentSchema.methods.calculateImageCount = function() {
  return this.blocks.filter(block => block.type === 'image').length;
};

// Generate table of contents from heading blocks
documentSchema.methods.generateTableOfContents = function() {
  const toc = [];
  this.blocks.forEach((block, index) => {
    if (block.type === 'heading' && block.content) {
      toc.push({
        id: block.id || `heading-${index}`,
        text: typeof block.content === 'string' ? block.content : '',
        level: block.attrs?.level || 1
      });
    }
  });
  this.metadata.tableOfContents = toc;
};

export default mongoose.model('Document', documentSchema);