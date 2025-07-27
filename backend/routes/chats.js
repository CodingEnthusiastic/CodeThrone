import express from "express"
import mongoose from "mongoose"
import { authenticateToken } from "../middleware/auth.js"
import User from "../models/User.js"

const router = express.Router()

// Chat Room Schema
const chatRoomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    type: {
      type: String,
      enum: ["general", "help", "contest", "interview", "private"],
      default: "general",
    },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isPrivate: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastActivity: { type: Date, default: Date.now },
    messageCount: { type: Number, default: 0 },
  },
  { timestamps: true },
)

// Message Schema
const messageSchema = new mongoose.Schema(
  {
    content: { type: String, required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: "ChatRoom", required: true },
    type: {
      type: String,
      enum: ["text", "code", "image", "file", "system"],
      default: "text",
    },
    language: String, // For code messages
    isEdited: { type: Boolean, default: false },
    editedAt: Date,
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: String,
      },
    ],
    readBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        readAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
)

const ChatRoom = mongoose.model("ChatRoom", chatRoomSchema)
const Message = mongoose.model("Message", messageSchema)

// Get all chat rooms for user
router.get("/rooms", authenticateToken, async (req, res) => {
  try {
    const rooms = await ChatRoom.find({
      $or: [{ participants: req.user.userId }, { isPrivate: false }],
    })
      .populate("participants", "username profile.avatar")
      .populate("createdBy", "username profile.avatar")
      .sort({ lastActivity: -1 })

    res.json(rooms)
  } catch (error) {
    console.error("Error fetching chat rooms:", error)
    res.status(500).json({ error: "Failed to fetch chat rooms" })
  }
})

// Create new chat room
router.post("/rooms", authenticateToken, async (req, res) => {
  try {
    const { name, description, type, isPrivate, participants } = req.body

    const room = new ChatRoom({
      name,
      description,
      type,
      isPrivate,
      participants: [req.user.userId, ...(participants || [])],
      admins: [req.user.userId],
      createdBy: req.user.userId,
    })

    await room.save()
    await room.populate("participants", "username profile.avatar")
    await room.populate("createdBy", "username profile.avatar")

    // Emit to all participants
    const io = req.app.get("io")
    room.participants.forEach((participant) => {
      io.to(`user_${participant._id}`).emit("roomCreated", room)
    })

    res.status(201).json(room)
  } catch (error) {
    console.error("Error creating chat room:", error)
    res.status(500).json({ error: "Failed to create chat room" })
  }
})

// Join chat room
router.post("/rooms/:roomId/join", authenticateToken, async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.roomId)

    if (!room) {
      return res.status(404).json({ error: "Room not found" })
    }

    if (!room.participants.includes(req.user.userId)) {
      room.participants.push(req.user.userId)
      await room.save()
    }

    await room.populate("participants", "username profile.avatar")

    const io = req.app.get("io")
    io.to(`room_${room._id}`).emit("userJoined", {
      user: await User.findById(req.user.userId).select("username profile.avatar"),
      room: room._id,
    })

    res.json({ message: "Joined room successfully" })
  } catch (error) {
    console.error("Error joining room:", error)
    res.status(500).json({ error: "Failed to join room" })
  }
})

// Get messages for a room
router.get("/rooms/:roomId/messages", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query
    const room = await ChatRoom.findById(req.params.roomId)

    if (!room) {
      return res.status(404).json({ error: "Room not found" })
    }

    // Check if user has access to room
    if (room.isPrivate && !room.participants.includes(req.user.userId)) {
      return res.status(403).json({ error: "Access denied" })
    }

    const messages = await Message.find({ room: req.params.roomId })
      .populate("sender", "username profile.avatar")
      .populate("replyTo", "content sender")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    res.json(messages.reverse())
  } catch (error) {
    console.error("Error fetching messages:", error)
    res.status(500).json({ error: "Failed to fetch messages" })
  }
})

// Send message
router.post("/rooms/:roomId/messages", authenticateToken, async (req, res) => {
  try {
    const { content, type = "text", language, replyTo } = req.body

    const room = await ChatRoom.findById(req.params.roomId)
    if (!room) {
      return res.status(404).json({ error: "Room not found" })
    }

    // Check if user has access to room
    if (room.isPrivate && !room.participants.includes(req.user.userId)) {
      return res.status(403).json({ error: "Access denied" })
    }

    const message = new Message({
      content,
      sender: req.user.userId,
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

    // Emit to room
    const io = req.app.get("io")
    io.to(`room_${req.params.roomId}`).emit("newMessage", message)

    res.status(201).json(message)
  } catch (error) {
    console.error("Error sending message:", error)
    res.status(500).json({ error: "Failed to send message" })
  }
})

// Get online users
router.get("/online-users", authenticateToken, async (req, res) => {
  try {
    const io = req.app.get("io")
    const sockets = await io.fetchSockets()
    const onlineUserIds = [...new Set(sockets.map((socket) => socket.userId).filter(Boolean))]

    const onlineUsers = await User.find({ _id: { $in: onlineUserIds } }).select(
      "username profile.avatar stats.problemsSolved.total ratings.globalRank",
    )

    res.json(onlineUsers)
  } catch (error) {
    console.error("Error fetching online users:", error)
    res.status(500).json({ error: "Failed to fetch online users" })
  }
})

// Search users for private chat
router.get("/users/search", authenticateToken, async (req, res) => {
  try {
    const { q } = req.query
    if (!q || q.length < 2) {
      return res.json([])
    }

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user.userId } },
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

    res.json(users)
  } catch (error) {
    console.error("Error searching users:", error)
    res.status(500).json({ error: "Failed to search users" })
  }
})

export default router
