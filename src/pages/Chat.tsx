"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "../contexts/AuthContext"
import { io, type Socket } from "socket.io-client"
import { SOCKET_URL } from "../config/api"

import {
  Send,
  Users,
  Plus,
  Search,
  Code,
  Smile,
  Reply,
  Edit3,
  Hash,
  Lock,
  MessageCircle,
  UserPlus,
  Settings,
  Minimize2,
  Maximize2,
  Wifi,
  WifiOff,
  AlertCircle,
} from "lucide-react"
import { API_URL } from "../config/api"

interface User {
  _id: string
  username: string
  profile: {
    avatar?: string
    firstName?: string
    lastName?: string
  }
  stats?: {
    problemsSolved: {
      total: number
    }
  }
  ratings?: {
    globalRank: number
  }
}

interface ChatRoom {
  _id: string
  name: string
  description?: string
  type: "general" | "help" | "contest" | "interview" | "private"
  participants: User[]
  isPrivate: boolean
  messageCount: number
  lastActivity: string
}

interface Message {
  _id: string
  content: string
  sender: User
  room: string
  type: "text" | "code" | "image" | "system"
  language?: string
  isEdited: boolean
  editedAt?: string
  replyTo?: {
    _id: string
    content: string
    sender: User
  }
  reactions: Array<{
    user: string
    emoji: string
  }>
  createdAt: string
}

const Chat: React.FC = () => {
  const { user, token } = useAuth() // ✅ Get token from auth context (same as Discussion)

  const [socket, setSocket] = useState<Socket | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected" | "error">(
    "disconnected",
  )
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [onlineUsers, setOnlineUsers] = useState<User[]>([])
  const [isTyping, setIsTyping] = useState<{ [key: string]: User[] }>({})
  const [showUserSearch, setShowUserSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [editingMessage, setEditingMessage] = useState<string | null>(null)
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [lastError, setLastError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const [roomName, setRoomName] = useState("");
const [roomDescription, setRoomDescription] = useState("");
const [roomType, setRoomType] = useState<ChatRoom["type"]>("general");
const [roomIsPrivate, setRoomIsPrivate] = useState(false);
const [roomCreating, setRoomCreating] = useState(false);
const [roomError, setRoomError] = useState<string | null>(null);
  // Enhanced socket connection with reconnection logic
  const connectSocket = useCallback(() => {
    if (!token || !user) {
      console.log("❌ Cannot connect socket: missing token or user")
      console.log("🔍 Debug info:")
      console.log("- token:", token ? "Present" : "Missing")
      console.log("- user:", user ? `${user.username} (${user._id})` : "Not logged in")
      return
    }

    console.log("🔌 Attempting to connect to Socket.IO server...")
    console.log("📍 Socket URL:", SOCKET_URL)
    console.log("👤 User:", user.username)
    console.log("🔑 Token (first 20 chars):", token.substring(0, 20) + "...")

    setConnectionStatus("connecting")
    setLastError(null)

    const newSocket = io(SOCKET_URL, {
      auth: { token, userId: user._id }, // ✅ Use token directly (same as Discussion)
      transports: ["websocket", "polling"],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })

    // Connection events
    newSocket.on("connect", () => {
      console.log("✅ Socket connected successfully!")
      console.log("🔌 Socket ID:", newSocket.id)
      console.log("🚀 Transport:", newSocket.io.engine.transport.name)

      setSocket(newSocket)
      setConnectionStatus("connected")
      setReconnectAttempts(0)
      setLastError(null)
    })

    newSocket.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason)
      setConnectionStatus("disconnected")
      setSocket(null)

      // Attempt reconnection for certain disconnect reasons
      if (reason === "io server disconnect") {
        console.log("🔄 Server initiated disconnect, attempting reconnection...")
        attemptReconnection()
      }
    })

    newSocket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error)
      setConnectionStatus("error")
      setLastError(error.message)
      attemptReconnection()
    })

    newSocket.on("reconnect", (attemptNumber) => {
      console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`)
      setConnectionStatus("connected")
      setReconnectAttempts(0)
      setLastError(null)
    })

    newSocket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}`)
      setReconnectAttempts(attemptNumber)
    })

    newSocket.on("reconnect_error", (error) => {
      console.error("❌ Reconnection error:", error)
      setLastError(error.message)
    })

    newSocket.on("reconnect_failed", () => {
      console.error("❌ Reconnection failed after maximum attempts")
      setConnectionStatus("error")
      setLastError("Failed to reconnect after maximum attempts")
    })

    // Chat event listeners
    newSocket.on("newMessage", (message: Message) => {
      console.log("📨 New message received:", message)
      if (activeRoom && message.room === activeRoom._id) {
        setMessages((prev) => [...prev, message])
      }
    })

    newSocket.on("userTyping", ({ user: typingUser, roomId, isTyping: typing }) => {
      console.log(`⌨️ User ${typingUser.username} ${typing ? "started" : "stopped"} typing in room ${roomId}`)
      setIsTyping((prev) => {
        const roomTyping = prev[roomId] || []
        if (typing) {
          if (!roomTyping.find((u) => u._id === typingUser._id)) {
            return { ...prev, [roomId]: [...roomTyping, typingUser] }
          }
        } else {
          return { ...prev, [roomId]: roomTyping.filter((u) => u._id !== typingUser._id) }
        }
        return prev
      })
    })

    newSocket.on("messageReaction", ({ messageId, reactions }) => {
      console.log("👍 Message reaction updated:", messageId, reactions)
      setMessages((prev) => prev.map((msg) => (msg._id === messageId ? { ...msg, reactions } : msg)))
    })

    newSocket.on("messageEdited", ({ messageId, content, isEdited, editedAt }) => {
      console.log("✏️ Message edited:", messageId)
      setMessages((prev) => prev.map((msg) => (msg._id === messageId ? { ...msg, content, isEdited, editedAt } : msg)))
    })

    newSocket.on("privateRoomCreated", (room: ChatRoom) => {
      console.log("💬 Private room created:", room)
      setRooms((prev) => [room, ...prev])
      setActiveRoom(room)
    })

    newSocket.on("joinedRoom", ({ roomId, roomName }) => {
      console.log(`✅ Successfully joined room: ${roomName} (${roomId})`)
    })

    newSocket.on("error", (error) => {
      console.error("❌ Socket error:", error)
      setLastError(error.message)
    })

    return newSocket
  }, [token, user, activeRoom])

  // Reconnection logic
  const attemptReconnection = useCallback(() => {
    if (reconnectAttempts >= 5) {
      console.log("❌ Maximum reconnection attempts reached")
      return
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000)
    console.log(`🔄 Attempting reconnection in ${delay}ms (attempt ${reconnectAttempts + 1})`)

    reconnectTimeoutRef.current = setTimeout(() => {
      setReconnectAttempts((prev) => prev + 1)
      connectSocket()
    }, delay)
  }, [reconnectAttempts, connectSocket])

  // Initialize socket connection
  useEffect(() => {
    console.log("🔄 Chat component mounted, checking connection requirements...")
    console.log("👤 User:", user ? `${user.username} (${user._id})` : "Not logged in")
    console.log("🔑 Token:", token ? "Present" : "Missing")

    if (!token || !user) {
      console.log("❌ Cannot initialize socket: missing token or user")
      return
    }

    const socketInstance = connectSocket()

    return () => {
      console.log("🔌 Cleaning up socket connection...")
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (socketInstance) {
        socketInstance.disconnect()
      }
    }
  }, [token, user, connectSocket])

  // Fetch chat rooms
  useEffect(() => {
    if (!token) return

    console.log("📋 Fetching chat rooms...")
    const fetchRooms = async () => {
      try {
        const response = await fetch(`${API_URL}/chats/rooms`, {
          headers: {
            Authorization: `Bearer ${token}`, // ✅ Same pattern as Discussion
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        console.log("✅ Chat rooms fetched:", data.length, "rooms")
        setRooms(data)

        if (data.length > 0 && !activeRoom) {
          setActiveRoom(data[0])
          console.log("🏠 Set active room to:", data[0].name)
        }
      } catch (error) {
        console.error("❌ Error fetching rooms:", error)
      }
    }

    fetchRooms()
  }, [token, activeRoom])

  // Fetch messages when active room changes
  useEffect(() => {
    if (!activeRoom || !token) return

    console.log("📨 Fetching messages for room:", activeRoom.name)
    const fetchMessages = async () => {
      try {
        const response = await fetch(`${API_URL}/chats/rooms/${activeRoom._id}/messages`, {
          headers: {
            Authorization: `Bearer ${token}`, // ✅ Same pattern as Discussion
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        console.log("✅ Messages fetched:", data.length, "messages")
        setMessages(data)
      } catch (error) {
        console.error("❌ Error fetching messages:", error)
      }
    }

    fetchMessages()

    if (socket && connectionStatus === "connected") {
      console.log("🏠 Joining room via socket:", activeRoom.name)
      socket.emit("joinRoom", activeRoom._id)
    }
  }, [activeRoom, token, socket, connectionStatus])

  // Fetch online users
  // After you set `socket` in state, attach listener:
useEffect(() => {
  if (!socket) return;

  const handleOnline = (ids: string[]) => {
    // If you only have IDs, you might need to merge with your users list,
    // or fetch their profiles once. If your server already sent full User objects,
    // then `ids` here should be an array of Users.
    setOnlineUsers(ids);
  };

  socket.on("onlineUsers", handleOnline);

  // Ask server for initial list in case you connected after others:
  socket.emit("requestOnlineUsers");

  return () => {
    socket.off("onlineUsers", handleOnline);
  };
}, [socket]);


//   useEffect(() => {
//   if (!socket) return;
//   const handleOnlineUsers = (userList: User[]) => {
//     setOnlineUsers(userList);
//   };
//   socket.on("onlineUsers", handleOnlineUsers);
//   return () => socket.off("onlineUsers", handleOnlineUsers);
// }, [socket]);


  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Join rooms on socket connection
  useEffect(() => {
    if (socket && rooms.length > 0 && connectionStatus === "connected") {
      console.log(
        "🏠 Joining all rooms via socket:",
        rooms.map((r) => r.name),
      )
      socket.emit(
        "joinRooms",
        rooms.map((room) => room._id),
      )
    }
  }, [socket, rooms, connectionStatus])
  const handleCreateRoom = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!roomName.trim() || !token) return;
  setRoomCreating(true);
  setRoomError(null);

  try {
    const response = await fetch(`${API_URL}/chats/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: roomName,
        description: roomDescription,
        type: roomType,
        isPrivate: roomIsPrivate,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const newRoom = await response.json();
    setRooms((prev) => [newRoom, ...prev]);
    setActiveRoom(newRoom);
    setShowCreateRoom(false);
    setRoomName("");
    setRoomDescription("");
    setRoomType("general");
    setRoomIsPrivate(false);
  } catch (error: any) {
    setRoomError(error.message || "Failed to create room");
  } finally {
    setRoomCreating(false);
  }
};
  const sendMessage = async () => {
    if (!newMessage.trim() || !activeRoom || !token) return

    console.log("📤 Sending message to room:", activeRoom.name)
    try {
      const response = await fetch(`${API_URL}/chats/rooms/${activeRoom._id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // ✅ Same pattern as Discussion
        },
        body: JSON.stringify({
          content: newMessage,
          type: "text",
          replyTo: replyTo?._id,
          // sender:user?._id,
        }),
      })

      if (response.ok) {
        console.log("✅ Message sent successfully")
        setNewMessage("")
        setReplyTo(null)
      } else {
        console.error("❌ Failed to send message:", response.status, response.statusText)
      }
    } catch (error) {
      console.error("❌ Error sending message:", error)
    }
  }

  const handleTyping = () => {
    if (!socket || !activeRoom || connectionStatus !== "connected") return

    socket.emit("typing", { roomId: activeRoom._id, isTyping: true })

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing", { roomId: activeRoom._id, isTyping: false })
    }, 1000)
  }

  const searchUsers = async (query: string) => {
    if (!query.trim() || !token) {
      setSearchResults([])
      return
    }

    try {
      const response = await fetch(`${API_URL}/chats/users/search?q=${encodeURIComponent(query)}`, {
        headers: {
          Authorization: `Bearer ${token}`, // ✅ Same pattern as Discussion
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSearchResults(data)
      }
    } catch (error) {
      console.error("❌ Error searching users:", error)
    }
  }

  const createPrivateChat = (targetUser: User) => {
    if (socket && connectionStatus === "connected") {
      console.log("💬 Creating private chat with:", targetUser.username)
      socket.emit("createPrivateChat", { targetUserId: targetUser._id })
      setShowUserSearch(false)
      setSearchQuery("")
      setSearchResults([])
    }
  }

  const addReaction = (messageId: string, emoji: string) => {
    if (socket && connectionStatus === "connected") {
      socket.emit("reactToMessage", { messageId, emoji })
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const getRoomIcon = (room: ChatRoom) => {
    switch (room.type) {
      case "private":
        return <MessageCircle className="h-4 w-4" />
      case "help":
        return <Users className="h-4 w-4" />
      default:
        return <Hash className="h-4 w-4" />
    }
  }

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case "connected":
        return <Wifi className="h-4 w-4 text-green-500" />
      case "connecting":
        return <Wifi className="h-4 w-4 text-yellow-500 animate-pulse" />
      case "disconnected":
        return <WifiOff className="h-4 w-4 text-gray-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <WifiOff className="h-4 w-4 text-gray-500" />
    }
  }

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return "Connected"
      case "connecting":
        return "Connecting..."
      case "disconnected":
        return "Disconnected"
      case "error":
        return `Error${reconnectAttempts > 0 ? ` (Retry ${reconnectAttempts}/5)` : ""}`
      default:
        return "Unknown"
    }
  }

  // ✅ Same check pattern as Discussion component
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 ">
        <div className="text-center">
          <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Please Login to Chat</h2>
          <p className="text-gray-600 dark:text-gray-400">You need to be logged in to access the chat feature.</p>
        </div>
      </div>
    )
  }

  // ✅ Additional check for token (same as Discussion would do)
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Authentication Required</h2>
          <p className="text-gray-600 dark:text-gray-400">Please log in again to access the chat feature.</p>
          <p className="text-red-600 dark:text-red-400 mt-2 text-sm">
            Authentication token is missing. Please refresh the page and try logging in again.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${isMinimized ? "h-16" : "h-screen"} bg-white dark:bg-gray-900 flex transition-all duration-300` } style={{ height: "calc(100vh - 64px)" }}>
      {/* Sidebar */}
      <div
        className={`${isMinimized ? "w-0 overflow-hidden" : "w-80"} bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Chat</h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowUserSearch(!showUserSearch)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Start Private Chat"
              >
                <UserPlus className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowCreateRoom(!showCreateRoom)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Create Room"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Connection Status */}
          <div className="mb-4 p-2 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getConnectionStatusIcon()}
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {getConnectionStatusText()}
                </span>
              </div>
              {connectionStatus === "error" && (
                <button
                  onClick={connectSocket}
                  className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Retry
                </button>
              )}
            </div>
            {lastError && <div className="mt-1 text-xs text-red-600 dark:text-red-400">{lastError}</div>}
          </div>

          {/* User Search */}
          {showUserSearch && (
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    searchUsers(e.target.value)
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                  {searchResults.map((searchUser) => (
                    <button
                      key={searchUser._id}
                      onClick={() => createPrivateChat(searchUser)}
                      className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center space-x-3"
                    >
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {searchUser.username[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{searchUser.username}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {searchUser.stats?.problemsSolved.total || 0} problems solved
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {showCreateRoom && (
  <div className="mb-4 p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
    <form onSubmit={handleCreateRoom} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Room Name</label>
        <input
          type="text"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          className="w-full mt-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Description</label>
        <input
          type="text"
          value={roomDescription}
          onChange={(e) => setRoomDescription(e.target.value)}
          className="w-full mt-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Type</label>
        <select
          value={roomType}
          onChange={(e) => setRoomType(e.target.value as ChatRoom["type"])}
          className="w-full mt-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="general">General</option>
          <option value="help">Help</option>
          <option value="contest">Contest</option>
          <option value="interview">Interview</option>
          <option value="private">Private</option>
        </select>
      </div>
      {/* <div className="flex items-center"> */}
        {/* <input
          type="checkbox"
          checked={roomIsPrivate}
          onChange={(e) => setRoomIsPrivate(e.target.checked)}
          id="privateRoom"
          className="mr-2"
        /> */}
        {/* <label htmlFor="privateRoom" className="text-sm text-gray-700 dark:text-gray-200">Private Room</label> */}
      {/* </div> */}
      {roomError && <div className="text-xs text-red-600">{roomError}</div>}
      <div className="flex space-x-2">
        <button
          type="submit"
          disabled={roomCreating}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {roomCreating ? "Creating..." : "Create Room"}
        </button>
        <button
          type="button"
          onClick={() => setShowCreateRoom(false)}
          className="px-4 py-2 bg-red-500 text-gray-700 rounded-lg hover:bg-red-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  </div>
)}
        </div>
      <div className="flex flex-col h-full">
        {/* Rooms List */}
        <div className="flex-1 overflow-y-auto">
          {rooms.map((room) => (
            <button
              key={room._id}
              onClick={() => setActiveRoom(room)}
              className={`w-full p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 ${
                activeRoom?._id === room._id ? "bg-blue-50 dark:bg-blue-900/20 border-r-2 border-r-blue-500" : ""
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">{getRoomIcon(room)}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{room.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center space-x-2">
                    <span>{room.participants.length} members</span>
                    {room.messageCount > 0 && <span>• {room.messageCount} messages</span>}
                  </div>
                </div>
                {room.isPrivate && <Lock className="h-3 w-3 text-gray-400" />}
              </div>
            </button>
          ))}
        </div>

        {/* Online Users */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Online ({onlineUsers.length})</h3>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {onlineUsers.slice(0, 5).map((onlineUser) => (
              <div key={onlineUser._id} className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400 truncate">{onlineUser.username}</span>
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors lg:hidden"
              >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </button>
              {activeRoom && (
                <>
                  {getRoomIcon(activeRoom)}
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-gray-100">{activeRoom.name}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {activeRoom.participants.length} members
                      {activeRoom.type === "private" && " • Private"}
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                {getConnectionStatusIcon()}
                <span className="text-xs text-gray-500 dark:text-gray-400">{getConnectionStatusText()}</span>
              </div>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 max-h-[calc(100vh-220px)]">
              {messages.map((message) => (
                <div key={message._id} className="group">
                  {message.replyTo && (
                    <div className="ml-12 mb-1 p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm border-l-2 border-gray-300 dark:border-gray-600">
                      <span className="font-medium text-gray-600 dark:text-gray-400">
                        {message.replyTo.sender.username}:
                      </span>
                      <span className="ml-2 text-gray-500 dark:text-gray-400">{message.replyTo.content}</span>
                    </div>
                  )}

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                      {message.sender.username[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{message.sender.username}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(message.createdAt)}
                          {message.isEdited && " (edited)"}
                        </span>
                      </div>

                      <div
                        className={`${message.type === "code" ? "bg-gray-100 dark:bg-gray-800 p-3 rounded-lg font-mono text-sm" : ""}`}
                      >
                        {message.type === "code" && message.language && (
                          <div className="flex items-center space-x-2 mb-2 text-xs text-gray-500 dark:text-gray-400">
                            <Code className="h-3 w-3" />
                            <span>{message.language}</span>
                          </div>
                        )}
                        <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      </div>

                      {/* Reactions */}
                      {message.reactions.length > 0 && (
                        <div className="flex items-center space-x-1 mt-2">
                          {Object.entries(
                            message.reactions.reduce(
                              (acc, reaction) => {
                                acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1
                                return acc
                              },
                              {} as Record<string, number>,
                            ),
                          ).map(([emoji, count]) => (
                            <button
                              key={emoji}
                              onClick={() => addReaction(message._id, emoji)}
                              className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                              {emoji} {count}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Message Actions */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                      <button
                        onClick={() => addReaction(message._id, "👍")}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="React"
                        disabled={connectionStatus !== "connected"}
                      >
                        <Smile className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setReplyTo(message)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Reply"
                      >
                        <Reply className="h-4 w-4" />
                      </button>
                      {message.sender._id === user._id && (
                        <button
                          onClick={() => setEditingMessage(message._id)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing Indicators */}
              {activeRoom && isTyping[activeRoom._id] && isTyping[activeRoom._id].length > 0 && (
                <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                  <span>
                    {isTyping[activeRoom._id].map((u) => u.username).join(", ")}
                    {isTyping[activeRoom._id].length === 1 ? " is" : " are"} typing...
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
            
            {/* Only show message input if user is a participant or it's a private room */}
            {activeRoom &&
              (activeRoom.isPrivate ||
                activeRoom.participants.some((u) => u._id === user._id)) ? (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                {replyTo && (
                  <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-between">
                    <div className="text-sm">
                      <span className="font-medium text-gray-600 dark:text-gray-400">
                        Replying to {replyTo.sender.username}:
                      </span>
                      <span className="ml-2 text-gray-500 dark:text-gray-400">
                        {replyTo.content.substring(0, 50)}...
                      </span>
                    </div>
                    <button
                      onClick={() => setReplyTo(null)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      ×
                    </button>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <input
                    ref={messageInputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value)
                      handleTyping()
                    }}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    placeholder={activeRoom ? `Message ${activeRoom.name}` : "Select a room to start chatting"}
                    disabled={!activeRoom || connectionStatus !== "connected"}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || !activeRoom || connectionStatus !== "connected"}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>

                {connectionStatus !== "connected" && (
                  <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Chat is {connectionStatus}. Messages cannot be sent.
                  </div>
                )}
              </div>
            ) : (
              // Show Join Room prompt if not a participant in a public room
              activeRoom &&
              !activeRoom.isPrivate && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col items-center">
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    onClick={async () => {
                      await fetch(`${API_URL}/chats/rooms/${activeRoom._id}/join`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      window.location.reload();
                    }}
                  >
                    Join Room
                  </button>
                  <p className="mt-2 text-gray-500">Join this room to send messages.</p>
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Chat
