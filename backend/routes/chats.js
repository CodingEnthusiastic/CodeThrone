import express from "express"
import { authenticateToken } from "../middleware/auth.js"
import User from "../models/User.js"
import ChatRoom from "../models/ChatRoom.js"
import Message from "../models/Message.js"

const router = express.Router()
const onlineUsers = new Set();

// console.log("🛣️ Setting up chats routes...")

// ✅ Get all chat rooms for the user
router.get("/rooms", authenticateToken, async (req, res) => {
  console.log("📥 Fetching chat rooms for:", req.user._id)

  try {
    const rooms = await ChatRoom.find({
      $or: [{ participants: req.user._id }, { isPrivate: false }],
    })
      .select("name description type isPrivate participants createdBy lastActivity")
      .sort({ lastActivity: -1 })
      .lean() // ✅ use lean to reduce Mongoose overhead

    // Optionally map and format if you want avatars, but skip populate
    res.json(rooms)
  } catch (err) {
    console.error("❌ Error fetching rooms:", err)
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

// ✅ Create a new room
router.post("/rooms", authenticateToken, async (req, res) => {
  try {
    const room = new ChatRoom({
      ...req.body,
      createdBy: req.user._id,
      participants: [req.user._id],
    })

    await room.save()
    res.status(201).json(room)
  } catch (err) {
    console.error("❌ Room creation error:", err)
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

// Join chat room
router.post("/rooms/:roomId/join", authenticateToken, async (req, res) => {
  try {
    console.log(`👥 User ${req.user._id} attempting to join room: ${req.params.roomId}`)

    const room = await ChatRoom.findById(req.params.roomId)

    if (!room) {
      console.log(`❌ Room not found: ${req.params.roomId}`)
      return res.status(404).json({ error: "Room not found" })
    }

    if (!room.participants.includes(req.user._id)) {
      room.participants.push(req.user._id)
      await room.save()
      console.log(`✅ User ${req.user._id} added to room participants`)
    }

    await room.populate("participants", "username profile.avatar")

    const io = req.app.get("io")
    if (io) {
      io.to(`room_${room._id}`).emit("userJoined", {
        user: await User.findById(req.user._id).select("username profile.avatar"),
        room: room._id,
      })
      console.log(`📡 User joined event emitted to room ${room.name}`)
    }

    res.json({ message: "Joined room successfully" })
  } catch (error) {
    console.error("❌ Error joining room:", error)
    res.status(500).json({ error: "Failed to join room" })
  }
})

// ✅ Get messages from a room (paginated)
router.get("/rooms/:roomId/messages", authenticateToken, async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 50

  try {
    const messages = await Message.find({ room: req.params.roomId })
      .select("content sender createdAt type replyTo reactions isEdited editedAt language") // ✅ keep it light
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    res.json(messages)
  } catch (err) {
    console.error("❌ Fetch messages error:", err)
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

// ✅ Send message (unchanged, but fast)
// ✅ Send a message in a room
router.post("/rooms/:roomId/messages", authenticateToken, async (req, res) => {
  try {
    const message = new Message({
      ...req.body,
      sender: req.user._id,
      room: req.params.roomId,
    })

    await message.save()

    // Update room's lastActivity timestamp
    await ChatRoom.findByIdAndUpdate(req.params.roomId, {
      lastActivity: new Date(),
    })

    res.status(201).json(message)
  } catch (err) {
    console.error("❌ Send message error:", err)
    res.status(500).json({ message: "Server error", error: err.message })
  }
})


// ✅ Optional: replyTo message fetch route
router.get("/messages/:messageId/reply", authenticateToken, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.messageId)
      .populate("sender", "username profile.avatar")
      .populate("replyTo", "content sender")
      .lean()

    if (!msg) return res.status(404).json({ error: "Message not found" })
    res.json(msg.replyTo || {})
  } catch (error) {
    console.error("❌ Error fetching replyTo message:", error)
    res.status(500).json({ error: "Failed to fetch replyTo message" })
  }
})

// Get online users
router.get("/online-users", authenticateToken, async (req, res) => {
  try {
    console.log(`👥 Fetching online users for user ${req.user._id}`)

    const io = req.app.get("io")
    if (!io) {
      console.log("❌ Socket.IO instance not available")
      return res.json([])
    }

    const sockets = await io.fetchSockets()
    const onlineUserIds = [...new Set(sockets.map((socket) => socket.userId).filter(Boolean))]

    console.log(`🔌 Found ${sockets.length} active sockets, ${onlineUserIds.length} unique users`)

    const onlineUsers = await User.find({ _id: { $in: onlineUserIds } }).select(
      "username profile.avatar stats.problemsSolved.total ratings.globalRank",
    )

    console.log(`✅ Returning ${onlineUsers.length} online users`)
    res.json(onlineUsers)
  } catch (error) {
    console.error("❌ Error fetching online users:", error)
    res.status(500).json({ error: "Failed to fetch online users" })
  }
})

// Search users for private chat
router.get("/users/search", authenticateToken, async (req, res) => {
  try {
    const { q } = req.query
    console.log(`🔍 Searching users with query: "${q}" for user ${req.user._id}`)

    if (!q || q.length < 2) {
      console.log("❌ Search query too short or empty")
      return res.json([])
    }

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        {
          $or: [
            { username: { $regex: q, $options: "i" } },
            { "profile.firstName": { $regex: q, $options: "i" } },
            { "profile.lastName": { $regex: q, $options: "i" } },
          ],
        },
      ],
    })
      .select("username profile.firstName profile.lastName profile.avatar stats.problemsSolved.total")
      .limit(10)

    console.log(`✅ Found ${users.length} users matching search query`)
    res.json(users)
  } catch (error) {
    console.error("❌ Error searching users:", error)
    res.status(500).json({ error: "Failed to search users" })
  }
})

console.log("✅ Chats routes setup complete")

export default router
