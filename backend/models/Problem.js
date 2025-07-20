// 
import mongoose from 'mongoose';

const testCaseSchema = new mongoose.Schema({
  input: { type: String, required: true },
  output: { type: String, required: true },
  explanation: { type: String },
  isPublic: { type: Boolean, default: false }
}, { _id: false });

const exampleSchema = new mongoose.Schema({
  input: String,
  output: String,
  explanation: String
}, { _id: false });

const codeTemplateSchema = new mongoose.Schema({
  cpp: { type: String, default: '' },
  java: { type: String, default: '' },
  python: { type: String, default: '' },
  c: { type: String, default: '' }
}, { _id: false });

const functionSignatureSchema = new mongoose.Schema({
  cpp: String,
  java: String,
  python: String,
  c: String
}, { _id: false });

const editorialSchema = new mongoose.Schema({
  written: { type: String }, // Markdown or HTML string
  videoUrl: { type: String },
  thumbnailUrl: { type: String },
  duration: { type: Number } // in seconds
}, { _id: false });

const referenceSolutionSchema = new mongoose.Schema({
  language: { type: String, required: true },
  completeCode: { type: String, required: true }
}, { _id: false });

const problemSchema = new mongoose.Schema({
  // Problem basics
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
  tags: [{ type: String, trim: true }],
  companies: [{ type: String, trim: true }],
  constraints: { type: String, required: true },
  examples: [exampleSchema],

  // Test cases
  testCases: [testCaseSchema], // mix of public/private
  referenceSolution: [referenceSolutionSchema],

  // Code editor + starter code
  codeTemplates: codeTemplateSchema,
  functionSignature: functionSignatureSchema,
  timeLimit: { type: Number, default: 2000 }, // in ms
  memoryLimit: { type: Number, default: 256 }, // in MB

  // Editorials
  editorial: editorialSchema,

  // User interaction metrics
  acceptanceRate: { type: Number, default: 0 }, // % accepted
  submissions: { type: Number, default: 0 },
  accepted: { type: Number, default: 0 },
  userRating: { type: Number, default: 0 }, // optional future: user votes
  solvedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // all users who solved

  // Creator info
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Visibility and tags
  isPublished: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },

  // Judge0 Meta (if needed for analytics/debug)
  lastTestedAt: { type: Date },

  // Contest linkage
  contestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contest' }
}, {
  timestamps: true
});

// Add index for better query performance
problemSchema.index({ isPublished: 1, difficulty: 1, tags: 1 });
problemSchema.index({ companies: 1, isPublished: 1 });

export default mongoose.model('Problem', problemSchema);