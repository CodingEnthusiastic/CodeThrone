import "./loadenv.js" // <-- This must be first
import axios from "axios"
import User from "./models/User.js";
import Contest from "./models/Contest.js";
import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import { createServer } from "http"
import { Server } from "socket.io"
import authRoutes from "./routes/auth.js"
import problemRoutes from "./routes/problems.js"
import discussionRoutes from "./routes/discussion.js"
import contestRoutes from "./routes/contest.js"
import gameRoutes from "./routes/game.js"
import rapidfireRoutes from "./routes/rapidfire.js"
import mcqRoutes from "./routes/mcq.js"
import profileRoutes from "./routes/profile.js"
import interviewRoutes from "./routes/interview.js"
import potdRoutes from "./routes/potd.js"
import redeemRoutes from "./routes/redeem.js"
import { setupGameSocket } from "./socket/game.js"
import { setupChatSocket } from "./socket/chat.js" // ✅ CRITICAL: Import chat socket
import { setupRapidFireSocket } from "./socket/rapidfire.js"
import geminiRoutes from "./routes/gemini.js"
import chatsRoutes from "./routes/chats.js"
import chatRoutes from "./routes/chat.js"
import announcementsRouter from "./routes/announcements.js"
import certificatesRouter from "./routes/certificates.js"
import usersRouter from "./routes/users.js";
console.log("🚀 Starting backend server...")
import statsRouter from "./routes/stats.js"

// Load environment variables
console.log("✅ Environment variables loaded")
console.log("📊 Environment check:")
console.log("- NODE_ENV:", process.env.NODE_ENV)
console.log("- PORT:", process.env.PORT)
console.log("- MONGODB_URI exists:", !!process.env.MONGODB_URI)
console.log("- JWT_SECRET exists:", !!process.env.JWT_SECRET)

const app = express()
const server = createServer(app)

// ✅ Enhanced Socket.IO configuration with better error handling
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "https://codethrone.netlify.app"],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e6,
})

console.log("🌐 Express app and Socket.IO server created with enhanced configuration")

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "https://codethrone.netlify.app"],
    credentials: true,
  }),
)
console.log("✅ CORS middleware enabled")

app.use(express.json())
console.log("✅ JSON middleware enabled")

// Connect to MongoDB
console.log("🔌 Attempting to connect to MongoDB...")
console.log("📍 MongoDB URI (masked):", process.env.MONGODB_URI?.replace(/\/\/.*@/, "//***:***@"))

mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/codearena")
  .then(() => {
    console.log("✅ Connected to MongoDB successfully!")
    console.log("📊 Database connection details:")
    console.log("- Database name:", mongoose.connection.name)
    console.log("- Connection state:", mongoose.connection.readyState)
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err)
    console.log("🔍 Troubleshooting tips:")
    console.log("1. Check if your MongoDB Atlas credentials are correct")
    console.log("2. Verify your IP address is whitelisted in MongoDB Atlas")
    console.log("3. Ensure your password is URL-encoded if it contains special characters")
    console.log("4. Check if your cluster is running and accessible")
  })

// Routes
console.log("🛣️ Setting up routes...")

app.use("/api/auth", authRoutes)
console.log("✅ Auth routes mounted at /api/auth")

app.use("/api/problems", problemRoutes)
console.log("✅ Problem routes mounted at /api/problems")

app.use("/api/discussion", discussionRoutes)
console.log("✅ Discussion routes mounted at /api/discussion")

app.use("/api/contests", contestRoutes)
console.log("✅ Contest routes mounted at /api/contests")

app.use("/api/game", gameRoutes)
console.log("✅ Game routes mounted at /api/game")

app.use("/api/rapidfire", rapidfireRoutes)
console.log("✅ Rapid Fire routes mounted at /api/rapidfire")

app.use("/api/mcq", mcqRoutes)
console.log("✅ MCQ routes mounted at /api/mcq")

app.use("/api/profile", profileRoutes)
console.log("✅ Profile routes mounted at /api/profile")

app.use("/api/potd", potdRoutes)
console.log("✅ POTD routes mounted at /api/potd")

app.use("/api/redeem", redeemRoutes)
console.log("✅ Redeem routes mounted at /api/redeem")

app.use("/api/chats", chatsRoutes)
console.log("✅ Chats routes mounted at /api/chats")

app.use("/api/interview", interviewRoutes)
console.log("✅ Interview routes mounted at /api/interview")

app.use("/api/announcements", announcementsRouter)
console.log("✅ Announcements routes mounted at /api/announcements")

app.use('/api/users', usersRouter);
console.log("✅ User routes mounted at /api/users")

app.use("/api/certificates", certificatesRouter)
console.log("✅ Certificate routes mounted at /api/certificates")

app.use("/api/gemini", geminiRoutes)
console.log("✅ Gemini routes mounted at /api/gemini")

app.use("/api/chat", chatRoutes)
console.log("✅ Chat routes mounted at /api/chat")

app.use("/api/stats", statsRouter)
console.log("✅ Stats routes mounted at /api/stats")

// Health check endpoint
app.get("/api/health", (req, res) => {
  console.log("🏥 Health check requested")
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    socketio: "enabled",
  })
})

// ✅ CRITICAL FIX: Make io instance available to routes
app.set("io", io)
console.log("✅ Socket.IO instance made available to routes")

// Socket.io setup with comprehensive logging
console.log("🔌 Setting up Socket.IO handlers...")

// ✅ Setup both game and chat sockets
setupGameSocket(io)
console.log("✅ Socket.IO game handlers configured")

setupChatSocket(io) // ✅ CRITICAL: Initialize chat socket
console.log("✅ Socket.IO chat handlers configured")

setupRapidFireSocket(io)
console.log("✅ Socket.IO rapid fire handlers configured")

// ✅ Add connection monitoring
io.on("connection", (socket) => {
  console.log(`🔌 New socket connection: ${socket.id}`)

  socket.on("disconnect", (reason) => {
    console.log(`🔌 Socket disconnected: ${socket.id}, reason: ${reason}`)
  })

  socket.on("error", (error) => {
    console.error(`🔌 Socket error: ${socket.id}`, error)
  })
})

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log("🎉 Server is running successfully!")
  console.log(`📍 Server URL: https://codestar-qlq6.onrender.com`)
  console.log(`🏥 Health check: https://codestar-qlq6.onrender.com/api/health`)
  console.log("📡 Socket.IO enabled for real-time features")
  console.log("🔥 Ready to accept requests!")
  console.log("🔌 Socket.IO transports: websocket, polling")
  console.log("🔌 Socket.IO CORS origins: localhost:5173, codethrone.netlify.app")
})

setInterval(async () => {
  try {
    const res = await axios.get("https://codestar-qlq6.onrender.com/api/health")
    console.log(`🔄 Self-ping at ${new Date().toISOString()} | status: ${res.data.status}`)
  } catch (error) {
    console.error("⚠️ Self-ping failed:", error.message)
  }
}, 4 * 60 * 1000) // every 4 minutes

// Call contest history sync every 10 minutes

// Contest history and rating backfill logic
async function backfillContestHistory() {
  try {
    const contests = await Contest.find({});
    let updatedCount = 0;
    for (const contest of contests) {
      // Gather all participants for Elo calculation
      const participantIds = contest.participants.map(p => p.user);
      const users = await User.find({ _id: { $in: participantIds } });
      // Prepare ratings map
      const ratingsMap = {};
      users.forEach(u => {
        ratingsMap[u._id] = u.ratings?.contestRating || 1200;
      });
      // Elo calculation
      const K = 40;
      for (const participant of contest.participants) {
        const user = users.find(u => u._id.toString() === participant.user.toString());
        if (!user) continue;
        let historyEntry = user.contestHistory.find(
          (entry) => entry.contest && entry.contest.toString() === contest._id.toString()
        );
        if (!historyEntry) {
          historyEntry = {
            contest: contest._id,
            rank: participant.rank || 0,
            score: participant.score || 0,
            ratingChange: 0,
            problemsSolved: participant.problemsSolved || 0,
            totalProblems: Array.isArray(contest.problems) ? contest.problems.length : 0,
            date: contest.endTime || contest.startTime,
          };
          user.contestHistory.push(historyEntry);
          updatedCount++;
        }
        // If score is 0 or rank is 0, no rating change
        let ratingChange = 0;
        if ((participant.score || 0) === 0 || (participant.rank || 0) === 0) {
          ratingChange = 0;
        } else {
          for (const opponent of contest.participants) {
            if (opponent.user.toString() === participant.user.toString()) continue;
            const userRating = ratingsMap[participant.user] || 1200;
            const oppRating = ratingsMap[opponent.user] || 1200;
            const S = (participant.rank < opponent.rank) ? 1 : (participant.rank === opponent.rank ? 0.5 : 0);
            const EA = 1 / (1 + Math.pow(10, (oppRating - userRating) / 400));
            ratingChange += Math.round(K * (S - EA));
          }
          if (contest.participants.length > 1) {
            ratingChange = Math.round(ratingChange / (contest.participants.length - 1));
          }
        }
        historyEntry.ratingChange = ratingChange;
        ratingsMap[participant.user] += ratingChange;
      }
      for (const user of users) {
        const initialRating = 1200;
        const totalRatingChange = user.contestHistory.reduce((acc, entry) => acc + (entry.ratingChange || 0), 0);
        user.ratings.contestRating = initialRating + totalRatingChange;
        await user.save();
      }
    }
    console.log(`Backfill complete. Updated ${updatedCount} contestHistory entries and contest ratings with Elo calculation.`);
  } catch (err) {
    console.error('❌ Error in contest history backfill:', err.message);
  }
}

// Run every 10 minutes
setInterval(() => {
  console.log('⏰ Running contest history backfill...');
  backfillContestHistory();
}, 10 * 60 * 1000);

// Run once immediately on startup
backfillContestHistory();

// If you have any config for Render, comment it out or remove it
// Example: const BASE_URL = 'https://your-app.onrender.com';
// Change to:
const BASE_URL = 'http://localhost:5000';
