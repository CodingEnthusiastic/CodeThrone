import './loadenv.js'; // <-- This must be first

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.js';
import problemRoutes from './routes/problems.js';
import discussionRoutes from './routes/discussion.js';
import contestRoutes from './routes/contest.js';
import gameRoutes from './routes/game.js';
import profileRoutes from './routes/profile.js';
import interviewRoutes from './routes/interview.js';
import potdRoutes from './routes/potd.js';
import redeemRoutes from './routes/redeem.js';
import { authenticateToken } from './middleware/auth.js';
import { setupGameSocket } from './socket/game.js';
import geminiRoutes from './routes/gemini.js';
import announcementsRouter from './routes/announcements.js';
import certificatesRouter from './routes/certificates.js';
console.log('🚀 Starting backend server...');
import statsRouter from './routes/stats.js';

// Load environment variables
// dotenv.config({ path: '../.env' }); // This is correct if you run from backend folder
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
    origin: [
      "http://localhost:5173",
      "https://codethrone.netlify.app"
    ],
    methods: ["GET", "POST"]
  }
});

console.log('🌐 Express app and Socket.IO server created');

// Middleware
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://codethrone.netlify.app"
  ],
  credentials: true
}));
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

app.use('/api/potd', potdRoutes);
console.log('✅ POTD routes mounted at /api/potd');

app.use('/api/redeem', redeemRoutes);
console.log('✅ Redeem routes mounted at /api/redeem');

// app.use('/api/announcements', announcementRoutes);
// console.log('✅ Announcement routes mounted at /api/announcements');

app.use('/api/interview', interviewRoutes);
console.log('✅ Interview routes mounted at /api/interview');

app.use('/api/announcements', announcementsRouter);
console.log('✅ Gemini routes mounted at /api/announcements');

app.use('/api/certificates', certificatesRouter);
console.log('✅ Certificate routes mounted at /api/certificates');

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

// app.use('/api/stats', statsRouter); 

// Socket.io setup
console.log('🔌 Setting up Socket.IO...');
setupGameSocket(io);
console.log('✅ Socket.IO game handlers configured');

// ✅ CRITICAL FIX: Make io instance available to routes
app.set('io', io);
console.log('✅ Socket.IO instance made available to routes');
app.use('/api/stats', statsRouter); 
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log('🎉 Server is running successfully!');
  console.log(`📍 Server URL: ${process.env.NODE_ENV === 'production' ? 'https://codestar-qlq6.onrender.com' : `https://codestar-qlq6.onrender.com`}` );
  console.log(`🏥 Health check: ${process.env.NODE_ENV === 'production' ? 'https://codestar-qlq6.onrender.com' : `https://codestar-qlq6.onrender.com`}/api/health`);
  console.log('📡 Socket.IO enabled for real-time features');
  console.log('🔥 Ready to accept requests!');
});