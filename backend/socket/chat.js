import jwt from "jsonwebtoken"
import User from "../models/User.js"
import mongoose from "mongoose"

const ChatRoom = mongoose.model("ChatRoom")
const Message = mongoose.model("Message")

export const setupChatSocket = (io) => {
  // Authentication middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token
      if (!token) {
        return next(new Error("Authentication error"))
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.userId).select("username profile.avatar")

      if (!user) {
        return next(new Error("User not found"))
      }

      socket.userId = user._id.toString()
      socket.user = user
      next()
    } catch (error) {
      next(new Error("Authentication error"))
    }
  })

  io.on("connection", (socket) => {
    console.log(`🔌 User ${socket.user.username} connected to chat`)

    // Join user to their personal room for notifications
    socket.join(`user_${socket.userId}`)

    // Join user's chat rooms
    socket.on("joinRooms", async (roomIds) => {
      try {
        for (const roomId of roomIds) {
          const room = await ChatRoom.findById(roomId)
          if (room && (room.participants.includes(socket.userId) || !room.isPrivate)) {
            socket.join(`room_${roomId}`)
            console.log(`👥 ${socket.user.username} joined room ${room.name}`)
          }
        }
      } catch (error) {
        console.error("Error joining rooms:", error)
      }
    })

    // Handle joining a specific room
    socket.on("joinRoom", async (roomId) => {
      try {
        const room = await ChatRoom.findById(roomId)
        if (room && (room.participants.includes(socket.userId) || !room.isPrivate)) {
          socket.join(`room_${roomId}`)

          // Notify others in the room
          socket.to(`room_${roomId}`).emit("userJoinedRoom", {
            user: socket.user,
            roomId,
          })

          console.log(`👥 ${socket.user.username} joined room ${room.name}`)
        }
      } catch (error) {
        console.error("Error joining room:", error)
      }
    })

    // Handle leaving a room
    socket.on("leaveRoom", (roomId) => {
      socket.leave(`room_${roomId}`)
      socket.to(`room_${roomId}`).emit("userLeftRoom", {
        user: socket.user,
        roomId,
      })
      console.log(`👋 ${socket.user.username} left room ${roomId}`)
    })

    // Handle typing indicators
    socket.on("typing", ({ roomId, isTyping }) => {
      socket.to(`room_${roomId}`).emit("userTyping", {
        user: socket.user,
        roomId,
        isTyping,
      })
    })

    // Handle message reactions
    socket.on("reactToMessage", async ({ messageId, emoji }) => {
      try {
        const message = await Message.findById(messageId)
        if (!message) return

        const existingReaction = message.reactions.find((r) => r.user.toString() === socket.userId && r.emoji === emoji)

        if (existingReaction) {
          // Remove reaction
          message.reactions = message.reactions.filter(
            (r) => !(r.user.toString() === socket.userId && r.emoji === emoji),
          )
        } else {
          // Add reaction
          message.reactions.push({
            user: socket.userId,
            emoji,
          })
        }

        await message.save()

        io.to(`room_${message.room}`).emit("messageReaction", {
          messageId,
          reactions: message.reactions,
          user: socket.user,
        })
      } catch (error) {
        console.error("Error handling reaction:", error)
      }
    })

    // Handle message editing
    socket.on("editMessage", async ({ messageId, newContent }) => {
      try {
        const message = await Message.findById(messageId)
        if (!message || message.sender.toString() !== socket.userId) {
          return
        }

        message.content = newContent
        message.isEdited = true
        message.editedAt = new Date()
        await message.save()

        io.to(`room_${message.room}`).emit("messageEdited", {
          messageId,
          content: newContent,
          isEdited: true,
          editedAt: message.editedAt,
        })
      } catch (error) {
        console.error("Error editing message:", error)
      }
    })

    // Handle private message creation
    socket.on("createPrivateChat", async ({ targetUserId }) => {
      try {
        // Check if private chat already exists
        let room = await ChatRoom.findOne({
          type: "private",
          participants: { $all: [socket.userId, targetUserId], $size: 2 },
        })

        if (!room) {
          const targetUser = await User.findById(targetUserId).select("username")
          room = new ChatRoom({
            name: `${socket.user.username} & ${targetUser.username}`,
            type: "private",
            isPrivate: true,
            participants: [socket.userId, targetUserId],
            createdBy: socket.userId,
          })
          await room.save()
        }

        await room.populate("participants", "username profile.avatar")

        // Join both users to the room
        socket.join(`room_${room._id}`)
        io.to(`user_${targetUserId}`).emit("privateRoomCreated", room)
        socket.emit("privateRoomCreated", room)
      } catch (error) {
        console.error("Error creating private chat:", error)
      }
    })

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`🔌 User ${socket.user.username} disconnected from chat`)
    })
  })
}
