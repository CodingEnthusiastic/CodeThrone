import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { authenticateToken as auth } from '../middleware/auth.js';
import Document from '../models/Document.js';
import Subject from '../models/Subject.js';

const router = express.Router();

// Configure Cloudinary from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Validate Cloudinary configuration
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('❌ CLOUDINARY configuration missing in environment variables!');
  console.log('Please ensure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set in .env');
} else {
  console.log('✅ Cloudinary configured successfully');
}

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// POST /api/documents/upload-image - Upload image to Cloudinary
router.post('/upload-image', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No image file provided' 
      });
    }

    // Check file size (2MB = 2097152 bytes)
    if (req.file.size > 2097152) {
      return res.status(400).json({
        success: false,
        message: 'Image size must be under 2MB'
      });
    }

    console.log('📸 Uploading image to Cloudinary:', {
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Upload to Cloudinary
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'codethrone/documents',
          resource_type: 'image',
          transformation: [
            { width: 1200, height: 800, crop: 'limit' },
            { quality: 'auto' },
            { format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary upload error:', error);
            reject(error);
          } else {
            console.log('✅ Cloudinary upload successful:', result.secure_url);
            resolve(result);
          }
        }
      );
      uploadStream.end(req.file.buffer);
    });

    const result = await uploadPromise;

    res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height
    });

  } catch (error) {
    console.error('❌ Error uploading image:', error);
    
    if (error.message === 'Only image files are allowed!') {
      return res.status(400).json({
        success: false,
        message: 'Only image files are allowed'
      });
    }

    if (error.message.includes('File too large')) {
      return res.status(400).json({
        success: false,
        message: 'Image size must be under 2MB'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload image'
    });
  }
});

// DELETE /api/documents/delete-image/:publicId - Delete image from Cloudinary
router.delete('/delete-image/:publicId', auth, async (req, res) => {
  try {
    const { publicId } = req.params;
    
    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required'
      });
    }

    console.log('🗑️ Deleting image from Cloudinary:', publicId);

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok') {
      console.log('✅ Image deleted successfully:', publicId);
      res.json({
        success: true,
        message: 'Image deleted successfully'
      });
    } else {
      console.log('⚠️ Image not found or already deleted:', publicId);
      res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

  } catch (error) {
    console.error('❌ Error deleting image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image'
    });
  }
});

// GET /api/documents/subjects - Get all subjects
router.get('/subjects', async (req, res) => {
  try {
    const subjects = await Subject.find({ isActive: true })
      .populate('createdBy', 'username')
      .sort({ name: 1 });

    // Get document count for each subject
    const subjectsWithCounts = await Promise.all(
      subjects.map(async (subject) => {
        const documentCount = await Document.countDocuments({ 
          subject: subject._id,
          isPublished: true 
        });
        
        return {
          ...subject.toObject(),
          documentsCount: documentCount
        };
      })
    );

    res.json({
      success: true,
      subjects: subjectsWithCounts
    });
  } catch (error) {
    console.error('❌ Error fetching subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subjects'
    });
  }
});

// POST /api/documents/subjects - Create new subject (Admin only)
router.post('/subjects', auth, async (req, res) => {
  try {
    const { name, description, icon, color } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Subject name is required'
      });
    }

    // Check if subject already exists
    const existingSubject = await Subject.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });

    if (existingSubject) {
      return res.status(400).json({
        success: false,
        message: 'Subject with this name already exists'
      });
    }

    const subject = new Subject({
      name: name.trim(),
      description: description?.trim() || '',
      icon: icon || '📚',
      color: color || '#3B82F6',
      createdBy: req.user._id
    });

    await subject.save();

    console.log('✅ New subject created:', subject.name);

    res.status(201).json({
      success: true,
      subject: await subject.populate('createdBy', 'username')
    });

  } catch (error) {
    console.error('❌ Error creating subject:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create subject'
    });
  }
});

// GET /api/documents - Get documents with filters and pagination
router.get('/', async (req, res) => {
  try {
    const {
      subject,
      search,
      difficulty,
      tags,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
      published = 'true'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (published === 'true') {
      filter.isPublished = true;
    }
    
    if (subject && subject !== 'all') {
      filter.subject = subject;
    }
    
    if (difficulty && difficulty !== 'all') {
      filter.difficulty = difficulty;
    }
    
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim().toLowerCase());
      filter.tags = { $in: tagArray };
    }
    
    // Search in title and description
    if (search?.trim()) {
      filter.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { tags: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute queries
    const [documents, totalCount] = await Promise.all([
      Document.find(filter)
        .populate('subject', 'name icon color')
        .populate('createdBy', 'username profile.avatar')
        .select('-blocks') // Don't send full content for list view
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Document.countDocuments(filter)
    ]);

    res.json({
      success: true,
      documents,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalDocuments: totalCount,
        hasNext: skip + documents.length < totalCount,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('❌ Error fetching documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch documents'
    });
  }
});

// GET /api/documents/:id - Get single document by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findById(id)
      .populate('subject', 'name icon color')
      .populate('createdBy', 'username profile.avatar')
      .populate('metadata.lastEditedBy', 'username');

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Increment view count
    document.views += 1;
    await document.save();

    res.json({
      success: true,
      document
    });

  } catch (error) {
    console.error('❌ Error fetching document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document'
    });
  }
});

// POST /api/documents - Create new document (Admin only)
router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      subject,
      blocks,
      description,
      tags,
      difficulty,
      isPublished
    } = req.body;

    // Validation
    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Document title is required'
      });
    }

    if (!subject) {
      return res.status(400).json({
        success: false,
        message: 'Subject is required'
      });
    }

    // Verify subject exists
    const subjectDoc = await Subject.findById(subject);
    if (!subjectDoc) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subject ID'
      });
    }

    const document = new Document({
      title: title.trim(),
      subject,
      blocks: blocks || [],
      description: description?.trim() || '',
      tags: tags ? tags.map(tag => tag.trim().toLowerCase()) : [],
      difficulty: difficulty || 'Beginner',
      isPublished: isPublished || false,
      createdBy: req.user._id,
      metadata: {
        lastEditedBy: req.user._id
      }
    });

    // Generate table of contents
    document.generateTableOfContents();

    await document.save();

    // Update subject document count
    await Subject.findByIdAndUpdate(subject, {
      $inc: { documentsCount: 1 }
    });

    console.log('✅ New document created:', document.title);

    const populatedDocument = await Document.findById(document._id)
      .populate('subject', 'name icon color')
      .populate('createdBy', 'username profile.avatar');

    res.status(201).json({
      success: true,
      document: populatedDocument
    });

  } catch (error) {
    console.error('❌ Error creating document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create document'
    });
  }
});

// PUT /api/documents/:id - Update document (Admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      subject,
      blocks,
      description,
      tags,
      difficulty,
      isPublished
    } = req.body;

    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Update fields
    if (title?.trim()) document.title = title.trim();
    if (subject) {
      // Verify subject exists
      const subjectDoc = await Subject.findById(subject);
      if (!subjectDoc) {
        return res.status(400).json({
          success: false,
          message: 'Invalid subject ID'
        });
      }
      document.subject = subject;
    }
    if (blocks) document.blocks = blocks;
    if (description !== undefined) document.description = description.trim();
    if (tags) document.tags = tags.map(tag => tag.trim().toLowerCase());
    if (difficulty) document.difficulty = difficulty;
    if (isPublished !== undefined) document.isPublished = isPublished;
    
    document.metadata.lastEditedBy = req.user._id;

    // Regenerate table of contents
    document.generateTableOfContents();

    await document.save();

    console.log('✅ Document updated:', document.title);

    const populatedDocument = await Document.findById(document._id)
      .populate('subject', 'name icon color')
      .populate('createdBy', 'username profile.avatar')
      .populate('metadata.lastEditedBy', 'username');

    res.json({
      success: true,
      document: populatedDocument
    });

  } catch (error) {
    console.error('❌ Error updating document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update document'
    });
  }
});

// DELETE /api/documents/:id - Delete document (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const subjectId = document.subject;
    const documentTitle = document.title;

    // Delete images from Cloudinary
    const imageBlocks = document.blocks.filter(block => block.type === 'image');
    for (const imageBlock of imageBlocks) {
      if (imageBlock.attrs?.publicId) {
        try {
          await cloudinary.uploader.destroy(imageBlock.attrs.publicId);
          console.log('🗑️ Deleted image from Cloudinary:', imageBlock.attrs.publicId);
        } catch (error) {
          console.error('⚠️ Failed to delete image from Cloudinary:', error);
        }
      }
    }

    await Document.findByIdAndDelete(id);

    // Update subject document count
    await Subject.findByIdAndUpdate(subjectId, {
      $inc: { documentsCount: -1 }
    });

    console.log('✅ Document deleted:', documentTitle);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document'
    });
  }
});

// POST /api/documents/:id/like - Toggle like on document
router.post('/:id/like', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const likeIndex = document.likes.indexOf(userId);
    let isLiked;

    if (likeIndex > -1) {
      // Unlike
      document.likes.splice(likeIndex, 1);
      isLiked = false;
    } else {
      // Like
      document.likes.push(userId);
      isLiked = true;
    }

    await document.save();

    res.json({
      success: true,
      isLiked,
      likeCount: document.likes.length
    });

  } catch (error) {
    console.error('❌ Error toggling like:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle like'
    });
  }
});

export default router;