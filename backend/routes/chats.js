import express from "express"
import { authenticateToken } from "../middleware/auth.js"
import User from "../models/User.js"
import ChatRoom from "../models/ChatRoom.js"
import Message from "../models/Message.js"

const router = express.Router()
const onlineUsers = new Set();

// console.log("🛣️ Setting up chats routes...")

// Get all chat rooms for user
router.get("/rooms", authenticateToken, async (req, res) => {
  try {
    console.log(`📋 Fetching chat rooms for user: ${req.user._id}`)

    const rooms = await ChatRoom.find({
      $or: [{ participants: req.user._id }, { isPrivate: false }],
    })
      .select("name messageCount lastActivity isPrivate")
      .populate("participants", "username profile.avatar")
      .sort({ lastActivity: -1 })
      .lean() // Use lean for faster queries

    console.log(`✅ Found ${rooms.length} chat rooms for user`)
    res.json(rooms)
  } catch (error) {
    console.error("❌ Error fetching chat rooms:", error)
    res.status(500).json({ error: "Failed to fetch chat rooms" })
  }
})

// Create new chat room
router.post("/rooms", authenticateToken, async (req, res) => {
  try {
    const { name, description, type, isPrivate, participants } = req.body
    console.log(`🏗️ Creating new chat room: ${name} by user ${req.user._id}`)

    const room = new ChatRoom({
      name,
      description,
      type,
      isPrivate,
      participants: [req.user._id, ...(participants || [])],
      admins: [req.user._id],
      createdBy: req.user._id,
    })

    await room.save()
    await room.populate("participants", "username profile.avatar")
    await room.populate("createdBy", "username profile.avatar")

    console.log(`✅ Chat room created successfully: ${room.name} (${room._id})`)

    // Emit to all participants
    const io = req.app.get("io")
    if (io) {
      room.participants.forEach((participant) => {
        io.to(`user_${participant._id}`).emit("roomCreated", room)
      })
      console.log(`📡 Room creation event emitted to ${room.participants.length} participants`)
    }

    res.status(201).json(room)
  } catch (error) {
    console.error("❌ Error creating chat room:", error)
    res.status(500).json({ error: "Failed to create chat room" })
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

// Get messages for a room
router.get("/rooms/:roomId/messages", authenticateToken, async (req, res) => {
  try {
    // const { page = 1, limit = 50 } = req.query
    // console.log(`📨 Fetching messages for room ${req.params.roomId}, page ${page}, limit ${limit}`)

    const room = await ChatRoom.findById(req.params.roomId)

    if (!room) {
      console.log(`❌ Room not found: ${req.params.roomId}`)
      return res.status(404).json({ error: "Room not found" })
    }

    // Check if user has access to room
    if (room.isPrivate && !room.participants.includes(req.user._id)) {
      room.participants.push(req.user._id);
      console.log(`❌ Access denied to private room ${req.params.roomId} for user ${req.user._id}`)
      return res.status(403).json({ error: "Access denied" })
    }

    const messages = await Message.find({ room: req.params.roomId })
      .populate("sender", "username profile.avatar")
      .populate("replyTo", "content sender")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean() // Use lean for faster queries

    console.log(`✅ Found ${messages.length} messages for room ${req.params.roomId}`)
    res.json(messages.reverse())
  } catch (error) {
    console.error("❌ Error fetching messages:", error)
    res.status(500).json({ error: "Failed to fetch messages" })
  }
})

// Send message
router.post("/rooms/:roomId/messages", authenticateToken, async (req, res) => {
  try {
    const { content, type = "text", language, replyTo } = req.body
    console.log(`📤 Sending message to room ${req.params.roomId} from user ${req.user._id}`)

    const room = await ChatRoom.findById(req.params.roomId)
    if (!room) {
      console.log(`❌ Room not found: ${req.params.roomId}`)
      return res.status(404).json({ error: "Room not found" })
    }

    // Check if user has access to room
    if (room.isPrivate && !room.participants.includes(req.user._id)) {
      console.log(`❌ Access denied to private room ${req.params.roomId} for user ${req.user._id}`)
      return res.status(403).json({ error: "Access denied" })
    }

    const message = new Message({
      content,
      sender: req.user._id,
      room: req.params.roomId,
      type,
      language,
      replyTo,
    })

    await message.save()
    await message.populate("sender", "username profile.avatar")
    if (replyTo) {
      await message.populate("replyTo", "content sender")
    }

    // Update room last activity
    room.lastActivity = new Date()
    room.messageCount += 1
    await room.save()

    console.log(`✅ Message sent successfully to room ${room.name}`)

    // Emit to room
    const io = req.app.get("io")
    if (io) {
      io.to(`room_${req.params.roomId}`).emit("newMessage", message)
      console.log(`📡 New message event emitted to room ${room.name}`)
    }

    res.status(201).json(message)
  } catch (error) {
    console.error("❌ Error sending message:", error)
    res.status(500).json({ error: "Failed to send message" })
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
