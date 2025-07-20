import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.js';
import problemRoutes from './routes/problems.js';
import discussionRoutes from './routes/discussion.js';
import contestRoutes from './routes/contest.js';
import gameRoutes from './routes/game.js';
import profileRoutes from './routes/profile.js';
// import announcementRoutes from './routes/announcements.js';
import interviewRoutes from './routes/interview.js';
import { authenticateToken } from './middleware/auth.js';
import { setupGameSocket } from './socket/game.js';
import geminiRoutes from './routes/gemini.js';
import announcementsRouter from './routes/announcements.js';
console.log('🚀 Starting backend server...');
import announcementRoutes from './routes/announcements.js';
// Load environment variables
dotenv.config({path: '../.env'});
console.log('✅ Environment variables loaded');
console.log('📊 Environment check:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);
console.log('- MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('- JWT_SECRET exists:', !!process.env.JWT_SECRET);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

console.log('🌐 Express app and Socket.IO server created');

// Middleware
app.use(cors());
console.log('✅ CORS middleware enabled');

app.use(express.json());
console.log('✅ JSON middleware enabled');

// Connect to MongoDB
console.log('🔌 Attempting to connect to MongoDB...');
console.log('📍 MongoDB URI (masked):', process.env.MONGODB_URI?.replace(/\/\/.*@/, '//***:***@'));

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codearena')
.then(() => {
  console.log('✅ Connected to MongoDB successfully!');
  console.log('📊 Database connection details:');
  console.log('- Database name:', mongoose.connection.name);
  console.log('- Connection state:', mongoose.connection.readyState);
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  console.log('🔍 Troubleshooting tips:');
  console.log('1. Check if your MongoDB Atlas credentials are correct');
  console.log('2. Verify your IP address is whitelisted in MongoDB Atlas');
  console.log('3. Ensure your password is URL-encoded if it contains special characters');
  console.log('4. Check if your cluster is running and accessible');
});

// Routes
console.log('🛣️ Setting up routes...');

app.use('/api/auth', authRoutes);
console.log('✅ Auth routes mounted at /api/auth');

app.use('/api/problems', problemRoutes);
console.log('✅ Problem routes mounted at /api/problems');

app.use('/api/discussion', discussionRoutes);
console.log('✅ Discussion routes mounted at /api/discussion');

app.use('/api/contests', contestRoutes);
console.log('✅ Contest routes mounted at /api/contests');

app.use('/api/game', gameRoutes);
console.log('✅ Game routes mounted at /api/game');

app.use('/api/profile', profileRoutes);
console.log('✅ Profile routes mounted at /api/profile');

// app.use('/api/announcements', announcementRoutes);
// console.log('✅ Announcement routes mounted at /api/announcements');

app.use('/api/interview', interviewRoutes);
console.log('✅ Interview routes mounted at /api/interview');

app.use('/api/announcements', announcementsRouter);
console.log('✅ Gemini routes mounted at /api/announcements');

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('🏥 Health check requested');
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.use('/api/gemini', geminiRoutes);
app.use('/api/announcements', announcementRoutes);

// Socket.io setup
console.log('🔌 Setting up Socket.IO...');
setupGameSocket(io);
console.log('✅ Socket.IO game handlers configured');

// ✅ CRITICAL FIX: Make io instance available to routes
app.set('io', io);
console.log('✅ Socket.IO instance made available to routes');

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log('🎉 Server is running successfully!');
  console.log(`📍 Server URL: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log('📡 Socket.IO enabled for real-time features');
  console.log('🔥 Ready to accept requests!');
});