import jwt from "jsonwebtoken"
import User from "../models/User.js"
import ChatRoom from "../models/ChatRoom.js"
import Message from "../models/Message.js"

const onlineUsers = new Set() // Track online users by their IDs
export const setupChatSocket = (io) => {
  console.log("🔌 Setting up chat socket handlers...")

  // Authentication middleware for socket
  io.use(async (socket, next) => {
    console.log(`🔐 Authenticating socket connection: ${socket.id}`)

    try {
      const token = socket.handshake.auth.token
      console.log(`🔑 Token received: ${token ? "Present" : "Missing"}`)

      if (!token) {
        console.log("❌ No token provided for socket authentication")
        return next(new Error("Authentication error: No token provided"))
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      console.log(`🔓 Token decoded successfully for user: ${decoded.userId}`)

      const user = await User.findById(decoded.userId).select("username profile.avatar")

      if (!user) {
        console.log(`❌ User not found for ID: ${decoded.userId}`)
        return next(new Error("User not found"))
      }

      socket.userId = user._id.toString()
      socket.user = user
      console.log(`✅ Socket authenticated for user: ${user.username} (${user._id})`)
      next()
    } catch (error) {
      console.error(`❌ Socket authentication error for ${socket.id}:`, error.message)
      next(new Error("Authentication error: " + error.message))
    }
  })

  io.on("connection", (socket) => {
    console.log(`🔌 User ${socket.user.username} (${socket.userId}) connected to chat - Socket ID: ${socket.id}`)
    onlineUsers.add(socket.userId);
    // io.emit("onlineUsers", Array.from(onlineUsers));
    io.emit("onlineUsers", Array.from(onlineUsers).map(id => userMap[id]));
    // io.emit("onlineUsers", Array.from(onlineUsers));
    // Join user to their personal room for notifications
    socket.join(`user_${socket.userId}`)
    console.log(`👤 User ${socket.user.username} joined personal room: user_${socket.userId}`)

    // Handle connection errors
    socket.on("connect_error", (error) => {
      console.error(`🔌 Connection error for ${socket.user.username}:`, error)
    })

    // Join user's chat rooms
    socket.on("joinRooms", async (roomIds) => {
      console.log(`👥 ${socket.user.username} attempting to join rooms:`, roomIds)

      try {
        for (const roomId of roomIds) {
          const room = await ChatRoom.findById(roomId)
          if (room && (room.participants.includes(socket.userId) || !room.isPrivate)) {
            socket.join(`room_${roomId}`)
            console.log(`✅ ${socket.user.username} joined room ${room.name} (${roomId})`)
          } else {
            console.log(`❌ ${socket.user.username} denied access to room ${roomId}`)
          }
        }
      } catch (error) {
        console.error(`❌ Error joining rooms for ${socket.user.username}:`, error)
        socket.emit("error", { message: "Failed to join rooms" })
      }
    })

    // Handle joining a specific room
    socket.on("joinRoom", async (roomId) => {
      console.log(`👥 ${socket.user.username} attempting to join room: ${roomId}`)

      try {
        const room = await ChatRoom.findById(roomId)
        if (room && (room.participants.includes(socket.userId) || !room.isPrivate)) {
          socket.join(`room_${roomId}`)

          // Notify others in the room
          socket.to(`room_${roomId}`).emit("userJoinedRoom", {
            user: socket.user,
            roomId,
          })

          console.log(`✅ ${socket.user.username} successfully joined room ${room.name}`)
          socket.emit("joinedRoom", { roomId, roomName: room.name })
        } else {
          console.log(`❌ ${socket.user.username} denied access to room ${roomId}`)
          socket.emit("error", { message: "Access denied to room" })
        }
      } catch (error) {
        console.error(`❌ Error joining room ${roomId} for ${socket.user.username}:`, error)
        socket.emit("error", { message: "Failed to join room" })
      }
    })

    // Handle leaving a room
    socket.on("leaveRoom", (roomId) => {
      console.log(`👋 ${socket.user.username} leaving room: ${roomId}`)

      socket.leave(`room_${roomId}`)
      socket.to(`room_${roomId}`).emit("userLeftRoom", {
        user: socket.user,
        roomId,
      })
      console.log(`✅ ${socket.user.username} left room ${roomId}`)
    })

    // Handle typing indicators
    socket.on("typing", ({ roomId, isTyping }) => {
      console.log(`⌨️ ${socket.user.username} ${isTyping ? "started" : "stopped"} typing in room ${roomId}`)

      socket.to(`room_${roomId}`).emit("userTyping", {
        user: socket.user,
        roomId,
        isTyping,
      })
    })

    // Handle message reactions
    socket.on("reactToMessage", async ({ messageId, emoji }) => {
      console.log(`👍 ${socket.user.username} reacting to message ${messageId} with ${emoji}`)

      try {
        const message = await Message.findById(messageId)
        if (!message) {
          console.log(`❌ Message not found: ${messageId}`)
          return
        }

        const existingReaction = message.reactions.find((r) => r.user.toString() === socket.userId && r.emoji === emoji)

        if (existingReaction) {
          // Remove reaction
          message.reactions = message.reactions.filter(
            (r) => !(r.user.toString() === socket.userId && r.emoji === emoji),
          )
          console.log(`➖ Removed reaction ${emoji} from message ${messageId}`)
        } else {
          // Add reaction
          message.reactions.push({
            user: socket.userId,
            emoji,
          })
          console.log(`➕ Added reaction ${emoji} to message ${messageId}`)
        }

        await message.save()

        io.to(`room_${message.room}`).emit("messageReaction", {
          messageId,
          reactions: message.reactions,
          user: socket.user,
        })
      } catch (error) {
        console.error(`❌ Error handling reaction for ${socket.user.username}:`, error)
        socket.emit("error", { message: "Failed to add reaction" })
      }
    })

    // Handle message editing
    socket.on("editMessage", async ({ messageId, newContent }) => {
      console.log(`✏️ ${socket.user.username} editing message ${messageId}`)

      try {
        const message = await Message.findById(messageId)
        if (!message || message.sender.toString() !== socket.userId) {
          console.log(`❌ Edit denied for message ${messageId} by ${socket.user.username}`)
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

        console.log(`✅ Message ${messageId} edited successfully`)
      } catch (error) {
        console.error(`❌ Error editing message for ${socket.user.username}:`, error)
        socket.emit("error", { message: "Failed to edit message" })
      }
    })

    // Handle private message creation
    socket.on("createPrivateChat", async ({ targetUserId }) => {
      console.log(`💬 ${socket.user.username} creating private chat with user ${targetUserId}`)

      try {
        // Check if private chat already exists
        let room = await ChatRoom.findOne({
          type: "private",
          participants: { $all: [socket.userId, targetUserId], $size: 2 },
        })

        if (!room) {
          const targetUser = await User.findById(targetUserId).select("username")
          if (!targetUser) {
            console.log(`❌ Target user not found: ${targetUserId}`)
            socket.emit("error", { message: "User not found" })
            return
          }

          room = new ChatRoom({
            name: `${socket.user.username} & ${targetUser.username}`,
            type: "private",
            isPrivate: true,
            participants: [socket.userId, targetUserId],
            createdBy: socket.userId,
          })
          await room.save()
          console.log(`✅ Created new private room: ${room.name} (${room._id})`)
        } else {
          console.log(`✅ Found existing private room: ${room.name} (${room._id})`)
        }

        await room.populate("participants", "username profile.avatar")

        // Join both users to the room
        socket.join(`room_${room._id}`)
        io.to(`user_${targetUserId}`).emit("privateRoomCreated", room)
        socket.emit("privateRoomCreated", room)

        console.log(`✅ Private chat created successfully between ${socket.user.username} and ${targetUserId}`)
      } catch (error) {
        console.error(`❌ Error creating private chat for ${socket.user.username}:`, error)
        socket.emit("error", { message: "Failed to create private chat" })
      }
    })
    socket.on("requestOnlineUsers", () => {
      socket.emit("onlineUsers", Array.from(onlineUsers));
    });
    // Handle disconnect
    socket.on("disconnect", (reason) => {
      onlineUsers.delete(socket.userId);
      // broadcast updated list again
      // io.emit("onlineUsers", Array.from(onlineUsers));
      io.emit("onlineUsers", Array.from(onlineUsers).map(id => userMap[id]));
      console.log(`🔌 User ${socket.user.username} (${socket.userId}) disconnected from chat - Reason: ${reason}`)
    })

    // Handle errors
    socket.on("error", (error) => {
      console.error(`❌ Socket error for ${socket.user.username}:`, error)
    })
  })

  console.log("✅ Chat socket handlers setup complete")
}
