"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "../contexts/AuthContext"
import { io, type Socket } from "socket.io-client"
import { SOCKET_URL } from "../config/api"

import { useTheme } from "../contexts/ThemeContext"

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
  Clock, // Added for last activity/status
  Info, // For general info/description
  CornerUpLeft, // For reply indicator
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
  const { isDark } = useTheme();

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
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [lastError, setLastError] = useState<string | null>(null)
  const [isSendingMessage, setIsSendingMessage] = useState(false) // New state for send button disabling

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLTextAreaElement>(null) // Changed to TextAreaElement
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()

  const [roomName, setRoomName] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [roomType, setRoomType] = useState<ChatRoom["type"]>("general");
  const [roomIsPrivate, setRoomIsPrivate] = useState(false); // Kept, but checkbox commented out in UI below
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
      reconnectionDelay: 10000,
      reconnectionDelayMax: 50000,
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
  }, [token, user, activeRoom, reconnectAttempts])

  // Reconnection logic
  const attemptReconnection = useCallback(() => {
    if (reconnectAttempts >= 5) {
      console.log("❌ Maximum reconnection attempts reached")
      return
    }

    const delay = Math.min(10000 * Math.pow(2, reconnectAttempts), 10000)
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

  // Fetch online users with 5-second refresh
  useEffect(() => {
    if (!socket) return;

    const handleOnline = (ids: User[]) => { // Changed type to User[] as implied by comments
      setOnlineUsers(ids);
    };

    socket.on("onlineUsers", handleOnline);

    // Request initial list
    socket.emit("requestOnlineUsers");

    // Set up interval for refreshing online users every 5 seconds
    const intervalId = setInterval(() => {
      if (connectionStatus === "connected") {
        socket.emit("requestOnlineUsers");
      }
    }, 5000); // 5 seconds

    return () => {
      socket.off("onlineUsers", handleOnline);
      clearInterval(intervalId); // Clear interval on unmount
    };
  }, [socket, connectionStatus]);


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
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
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
    if (!newMessage.trim() || !activeRoom || !token || isSendingMessage) return

    setIsSendingMessage(true); // Disable button immediately
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
        }),
      })

      if (response.ok) {
        console.log("✅ Message sent successfully")
        setNewMessage("")
        setReplyTo(null)
      } else {
        console.error("❌ Failed to send message:", response.status, response.statusText)
        // Optionally show an error to the user
      }
    } catch (error) {
      console.error("❌ Error sending message:", error)
      // Optionally show an error to the user
    } finally {
      setIsSendingMessage(false); // Re-enable button
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
    }, 10000)
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

  // Format time and date together
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const day = date.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
    return `${day} ${time}`;
  }

  const getRoomIcon = (room: ChatRoom) => {
    switch (room.type) {
      case "private":
        return <MessageCircle className="h-4 w-4 text-purple-400" />
      case "help":
        return <Users className="h-4 w-4 text-blue-400" />
      case "contest":
        return <Code className="h-4 w-4 text-green-400" />
      case "interview":
        return <Users className="h-4 w-4 text-red-400" /> // Using Users for interview as well, or you can add a specific icon
      default:
        return <Hash className="h-4 w-4 text-gray-400" />
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

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black p-4">
        <div className="text-center bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-700">
          <MessageCircle className="h-16 w-16 mx-auto mb-6 text-red-400" />
          <h2 className="text-2xl font-semibold text-gray-100 mb-3">Authentication Required</h2>
          <p className="text-gray-400 text-lg">Please log in again to access the chat feature.</p>
          <p className="text-red-500 mt-4 text-sm font-mono">
            Authentication token is missing. Please log in again.
          </p>
        </div>
      </div>
    )
  }

  // Use isDark from ThemeContext (navbar)

  return (
    <div
      className={`${isMinimized ? "h-16" : "h-screen"} ${isDark ? "bg-gray-950 text-gray-100" : "bg-white text-gray-800"} flex transition-all duration-300 relative`}
      style={{ height: "calc(100vh - 64px)" }}
    >
      {/* Floating button to toggle the sidebar */}
      <button
        onClick={() => setIsMinimized(!isMinimized)}
        className="fixed top-6 left-6 z-30 p-2 bg-gray-800 text-gray-300 rounded-lg shadow-lg hover:bg-indigo-600 hover:text-white transition-colors"
        title={isMinimized ? "Show Rooms Sidebar" : "Hide Rooms Sidebar"}
      >
        {isMinimized ? <Maximize2 className="h-5 w-5" /> : <Minimize2 className="h-5 w-5" />}
      </button>

      {/* Sidebar */}
      <div
        className={`${isMinimized ? "w-0 overflow-hidden opacity-0" : "w-80"} ${isDark ? "bg-gray-900 border-gray-800 text-gray-100" : "bg-gray-100 border-gray-300 text-gray-900"} flex flex-col transition-all duration-300 opacity-100`}
        style={{ minWidth: isMinimized ? 0 : 320 }}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h1 className={`text-2xl font-bold ${isDark ? "text-gray-100" : "text-gradient bg-gradient-to-r from-indigo-600 via-blue-500 to-purple-500 bg-clip-text text-transparent"}`}>DevChat</h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowUserSearch(!showUserSearch)}
                className={`p-2 text-gray-400 hover:text-indigo-400 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-orange-100'}`}
                title="Start Private Chat"
              >
                <UserPlus className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowCreateRoom(!showCreateRoom)}
                className={`p-2 text-gray-400 hover:text-indigo-400 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-orange-100'}`}
                title="Create Room"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Connection Status */}
          <div className={`mb-4 p-3 rounded-xl border shadow-inner ${isDark ? "bg-gray-800 border-gray-700" : connectionStatus === "connected" ? "bg-red-100 border-red-300" : "bg-gray-100 border-gray-300"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getConnectionStatusIcon()}
                <span className={`text-sm font-medium ${isDark ? "text-gray-200" : connectionStatus === "connected" ? "text-red-700" : "text-gray-800"}`}>
                  {getConnectionStatusText()}
                </span>
              </div>
              {connectionStatus === "error" && (
                <button
                  onClick={connectSocket}
                  className="text-xs px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow"
                >
                  Retry
                </button>
              )}
            </div>
            {lastError && <div className="mt-2 text-xs text-red-400">{lastError}</div>}
          </div>

          {/* User Search */}
          {showUserSearch && (
            <div className={`mb-4 ${isDark ? '' : 'bg-orange-100 text-black rounded-xl p-4 border border-orange-200 shadow-lg'}`}> 
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    searchUsers(e.target.value)
                  }}
                  className={`w-full pl-10 pr-4 py-2 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${isDark ? 'bg-gray-800 text-gray-100 placeholder-gray-500' : 'bg-orange-100 text-black placeholder-gray-500'}`}
                />
              </div>
              {searchResults.length > 0 && (
                <div className={`mt-2 max-h-48 overflow-y-auto custom-scrollbar rounded-lg shadow-lg ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-green-300 border border-green-500'}`}>
                  {searchResults.map((searchUser) => (
                    <button
                      key={searchUser._id}
                      onClick={() => createPrivateChat(searchUser)}
                      className={`w-full p-3 text-left flex items-center space-x-3 border-b last:border-b-0 ${isDark ? 'hover:bg-gray-700 border-gray-700' : 'hover:bg-green-300 border-green-500'}`}
                    >
                      <div className="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center text-white text-base font-medium flex-shrink-0">
                        {searchUser.username[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className={`font-medium ${isDark ? 'text-gray-100' : 'text-black'}`}>{searchUser.username}</div>
                        <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-black'}`}>{searchUser.stats?.problemsSolved.total || 0} problems solved</div>
                      </div>
                      {searchUser.ratings?.globalRank && (
                        <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-black'}`}>Rank: #{searchUser.ratings.globalRank}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {showCreateRoom && (
            <div className={`mb-4 p-4 rounded-xl shadow-lg ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-orange-100 text-black border border-orange-200'}`}> 
              <form onSubmit={handleCreateRoom} className="space-y-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-200' : 'text-black'}`}>Room Name</label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-700 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 ${isDark ? 'bg-gray-900 text-gray-100 placeholder-gray-500' : 'bg-orange-50 text-black placeholder-gray-500'}`}
                    placeholder="e.g., LeetCode Warriors"
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-200' : 'text-black'}`}>Description</label>
                  <input
                    type="text"
                    value={roomDescription}
                    onChange={(e) => setRoomDescription(e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-700 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 ${isDark ? 'bg-gray-900 text-gray-100 placeholder-gray-500' : 'bg-orange-50 text-black placeholder-gray-500'}`}
                    placeholder="Brief description of the room"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-200' : 'text-black'}`}>Type</label>
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value as ChatRoom["type"])}
                    className={`w-full px-3 py-2 border border-gray-700 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-orange-50 text-black'}`}
                  >
                    <option value="general">General</option>
                    <option value="help">Help</option>
                    <option value="contest">Contest</option>
                    <option value="interview">Interview</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                {roomError && <div className="text-xs text-red-400 mt-2">{roomError}</div>}
                <div className="flex space-x-3 pt-2">
                  <button
                    type="submit"
                    disabled={roomCreating}
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors shadow disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-orange-300 text-black hover:bg-orange-400'}`}
                  >
                    {roomCreating ? "Creating..." : "Create Room"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateRoom(false)}
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors shadow ${isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-orange-200 text-black hover:bg-orange-300'}`}
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
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {rooms.map((room) => (
              <button
                key={room._id}
                onClick={() => setActiveRoom(room)}
                className={`w-full p-4 text-left border-b border-gray-800 flex items-center space-x-3 transition-colors duration-200
                  ${isDark
                    ? activeRoom?._id === room._id
                      ? "bg-indigo-900/30 border-l-4 border-indigo-500"
                      : "hover:bg-gray-800"
                    : activeRoom?._id === room._id
                      ? "bg-blue-100 border-l-4 border-blue-500"
                      : "hover:bg-blue-50 hover:border-l-4 hover:border-blue-300"
                  }`}
              >
                <div className="flex-shrink-0">{getRoomIcon(room)}</div>
                <div className="flex-1 min-w-0">
                  <div className={`font-medium truncate ${isDark ? "text-gray-100" : "text-gray-900"}`}>{room.name}</div>
                  <div className={`text-sm flex items-center space-x-2 mt-1 ${isDark ? "text-gray-400" : "text-blue-700 font-semibold"}`}>
                    <span>{room.participants.length} members</span>
                    {room.messageCount > 0 && <span>• {room.messageCount} messages</span>}
                  </div>
                </div>
                {room.isPrivate && <Lock className="h-3 w-3 text-gray-500" />}
              </button>
            ))}
          </div>

      {/* Online Users */}
      <div className={`p-4 border-t border-gray-800 ${isDark ? "bg-gray-900" : "bg-blue-100"}`}>
        <h3 className={`text-sm font-semibold mb-3 flex items-center space-x-2 ${isDark ? "text-gray-200" : "text-black"}`}>
          <Wifi className="h-4 w-4 text-green-500" />
          <span>Online Users ({onlineUsers.length})</span>
        </h3>
        <div className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar">
          {onlineUsers.length > 0 ? (
            onlineUsers.map((onlineUser) => (
              <div key={onlineUser._id} className="flex items-center space-x-3">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full flex-shrink-0 animate-pulse"></div>
                <span className={`text-sm truncate ${isDark ? "text-gray-300" : "text-black"}`}>{onlineUser.username}</span>
              </div>
            ))
          ) : (
            <p className={`text-sm ${isDark ? "text-gray-500" : "text-black"}`}>No users online.</p>
          )}
        </div>
      </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Chat Header */}
        <div className={`p-4 border-b ${isDark ? "border-gray-800 bg-gray-900" : "border-gray-300 bg-gray-100"} shadow-md z-10`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-gray-800 rounded-lg transition-colors lg:hidden"
                title={isMinimized ? "Maximize Chat" : "Minimize Chat"}
              >
                {isMinimized ? <Maximize2 className="h-5 w-5" /> : <Minimize2 className="h-5 w-5" />}
              </button>
              {activeRoom && (
                <div className="flex items-center space-x-3">
                  {getRoomIcon(activeRoom)}
                  <div>
                    <h2 className={`text-lg font-semibold ${isDark ? "text-gray-100" : "text-gray-900"}`}>{activeRoom.name}</h2>
                    <p className={`text-sm flex items-center space-x-1 ${isDark ? "text-gray-400" : "text-blue-700 font-semibold"}`}>
                      <Users className="h-3 w-3" />
                      <span>{activeRoom.participants.length} members</span>
                      {activeRoom.type === "private" && (
                        <>
                          <Lock className="h-3 w-3 ml-2" />
                          <span>Private Chat</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <div className={`flex items-center space-x-1 p-2 rounded-md ${isDark ? "bg-gray-800" : connectionStatus === "connected" ? "bg-cyan-200" : "bg-gray-800"}`}>
                {getConnectionStatusIcon()}
                <span className={`text-xs font-bold tracking-wide ${isDark ? "text-gray-200" : "text-red-700"}`}>{getConnectionStatusText()}</span>
              </div>
              {/* <button className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-gray-800 rounded-lg transition-colors" title="Settings">
                <Settings className="h-5 w-5" />
              </button> */}
            </div>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div className={`flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar ${isDark ? "bg-gradient-to-br from-gray-950 to-gray-900" : "bg-gray-50"}`}>
              {messages.map((message) => {
                const isMe = message.sender._id === user._id;
                return (
                  <div
                    key={message._id}
                    className={`group flex items-start space-x-3 animate-fade-in ${isMe ? "flex-row-reverse" : ""}`}
                    style={isMe ? { justifyContent: "flex-end" } : {}}
                  >
                    {/* Profile photo or fallback */}
                    {message.sender.profile?.avatar && !message.sender.profile.avatar.startsWith('default:') ? (
                      <img
                        src={message.sender.profile.avatar}
                        alt={message.sender.username}
                        className={`w-9 h-9 rounded-full object-cover flex-shrink-0 border-2 border-indigo-500 shadow-md ${isMe ? "ml-3" : "mr-3"}`}
                      />
                    ) : (
                      <div className={`w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center text-white text-base font-medium flex-shrink-0 shadow-md ${isMe ? "ml-3" : "mr-3"}`}>
                        {message.sender.username[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className={`flex items-center space-x-2 mb-1 ${isMe ? "justify-end" : ""}`}>
                        {isMe ? (
                          <>
                            <span className={`text-xs ${isDark ? "text-gray-400" : "text-blue-700"}`}>
                              {formatTime(message.createdAt)}
                              {message.isEdited && <span className="ml-1">(edited)</span>}
                            </span>
                            <span className={`font-semibold text-sm ml-2 ${isDark ? "text-blue-200" : "text-blue-900"}`}>{message.sender.username}</span>
                          </>
                        ) : (
                          <>
                            <span className={`font-semibold text-sm ${isDark ? "text-blue-200" : "text-blue-900"}`}>{message.sender.username}</span>
                            <span className={`text-xs ${isDark ? "text-gray-400" : "text-blue-700"}`}>
                              {formatTime(message.createdAt)}
                              {message.isEdited && <span className="ml-1">(edited)</span>}
                            </span>
                          </>
                        )}
                      </div>

                      {message.replyTo && (
                        <div className={`mb-2 pl-3 py-1 ${isDark ? "bg-gray-800 text-gray-300" : "bg-blue-100 text-blue-900"} rounded-md border-l-4 border-indigo-600 text-sm italic`}>
                          <span className="font-medium text-indigo-400 flex items-center">
                            <CornerUpLeft className="h-3 w-3 mr-1" />
                            Replying to {message.replyTo.sender.username}:
                          </span>
                          <span className={`ml-4 block text-xs truncate ${isDark ? "text-gray-400" : "text-blue-700"}`}>
                            {message.replyTo.content}
                          </span>
                        </div>
                      )}

                      <div
                        className={`
                          p-3 rounded-lg shadow-sm max-w-xl break-words whitespace-pre-wrap
                          ${isMe
                            ? isDark
                              ? "bg-indigo-700 text-white ml-auto rounded-br-none"
                              : "bg-blue-100 text-blue-900 ml-auto rounded-br-none"
                            : isDark
                              ? "bg-gray-800 text-gray-100 rounded-bl-none"
                              : "bg-gray-200 text-blue-900 rounded-bl-none"
                          }
                          ${message.type === "code" ? "font-mono text-sm overflow-x-auto custom-scrollbar-horizontal" : ""}
                        `}
                        style={isMe ? { marginLeft: "auto" } : {}}
                      >
                        {message.type === "code" && message.language && (
                          <div className="flex items-center space-x-2 mb-2 text-xs text-gray-400">
                            <Code className="h-3.5 w-3.5 text-orange-400" />
                            <span className="font-semibold">{message.language}</span>
                          </div>
                        )}
                        <p>{message.content}</p>
                      </div>

                      {/* Reactions */}
                      {message.reactions.length > 0 && (
                        <div className={`flex items-center space-x-1 mt-2 ${isMe ? "justify-end" : ""}`}>
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
                              className="px-2.5 py-1 bg-gray-700 rounded-full text-xs hover:bg-gray-600 transition-colors flex items-center space-x-1 text-gray-200 shadow-sm"
                            >
                              <span>{emoji}</span>
                              <span className="font-medium">{count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Message Actions */}
                    <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 ml-2 self-center ${isMe ? "justify-end" : ""}`}>
                      <button
                        onClick={() => addReaction(message._id, "👍")}
                        className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-gray-800 rounded-full transition-colors"
                        title="Thumbs Up"
                        disabled={connectionStatus !== "connected"}
                      >
                        👍
                      </button>
                      <button
                        onClick={() => setReplyTo(message)}
                        className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-800 rounded-full transition-colors"
                        title="Reply"
                      >
                        <Reply className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Typing Indicators */}
              {activeRoom && isTyping[activeRoom._id] && isTyping[activeRoom._id].length > 0 && (
                <div className="flex items-center space-x-2 text-sm text-gray-400 mt-4 px-3 py-2 bg-gray-800 rounded-lg w-fit shadow-md">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce-slow" style={{ animationDelay: "0s" }}></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce-slow" style={{ animationDelay: "0.1s" }}></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce-slow" style={{ animationDelay: "0.2s" }}></div>
                  </div>
                  <span className="font-medium">
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
              <div className={`p-4 border-t border-gray-800 shadow-lg relative z-10 ${isDark ? "bg-gray-900" : "bg-blue-100"}`}>
                {replyTo && (
                  <div className="mb-3 p-3 bg-gray-800 rounded-lg flex items-center justify-between border-l-4 border-indigo-600 shadow-inner">
                    <div className="text-sm">
                      <span className="font-medium text-gray-200 flex items-center">
                        <CornerUpLeft className="h-3.5 w-3.5 mr-2 text-indigo-400" />
                        Replying to <span className="text-indigo-400 ml-1 mr-1">{replyTo.sender.username}</span>:
                      </span>
                      <span className="ml-6 block text-gray-400 italic text-sm truncate">
                        {replyTo.content.substring(0, 70)}
                        {replyTo.content.length > 70 ? "..." : ""}
                      </span>
                    </div>
                    <button
                      onClick={() => setReplyTo(null)}
                      className="text-gray-500 hover:text-gray-300 transition-colors p-1 rounded-full"
                      title="Cancel Reply"
                    >
                      <Plus className="h-4 w-4 rotate-45" /> {/* Using Plus rotated for 'X' */}
                    </button>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                    <textarea
                      ref={messageInputRef}
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value)
                        handleTyping()
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault(); // Prevent new line
                          sendMessage();
                        }
                      }}
                      rows={1}
                      placeholder={activeRoom ? `Message ${activeRoom.name}...` : "Select a room to start chatting"}
                      disabled={!activeRoom || connectionStatus !== "connected" || isSendingMessage}
                      className={`flex-1 px-4 py-2.5 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent resize-none custom-scrollbar disabled:opacity-60 disabled:cursor-not-allowed ${isDark ? "bg-gray-800 text-gray-100 placeholder-gray-500" : "bg-blue-50 text-black placeholder-gray-500"}`}
                      style={{ minHeight: '44px', maxHeight: '120px' }} // Adjusted height for textarea
                    />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || !activeRoom || connectionStatus !== "connected" || isSendingMessage}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 text-white rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-lg flex items-center justify-center"
                    title="Send Message"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>

                {connectionStatus !== "connected" && (
                  <div className="mt-3 text-xs text-amber-500 flex items-center justify-center p-2 bg-gray-800 rounded-lg border border-gray-700">
                    <AlertCircle className="h-3.5 w-3.5 mr-2" />
                    Chat is {connectionStatus}. Messages cannot be sent.
                  </div>
                )}
              </div>
            ) : (
              // Show Join Room prompt if not a participant in a public room
              activeRoom &&
              !activeRoom.isPrivate && (
                <div className="p-4 border-t border-gray-800 bg-gray-900 flex flex-col items-center justify-center h-full">
                  <Info className="h-12 w-12 text-indigo-500 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-100 mb-2">You are not a member of this room.</h3>
                  <p className="text-gray-400 mb-6 text-center max-w-md">
                    Join this room to participate in the conversation and send messages.
                  </p>
                  <button
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg font-medium text-lg"
                    onClick={async () => {
                      try {
                        const response = await fetch(`${API_URL}/chats/rooms/${activeRoom._id}/join`, {
                          method: "POST",
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        if (response.ok) {
                          // Consider a more robust way to update UI without full reload if backend supports it
                          // For now, refreshing as requested.
                          window.location.reload();
                        } else {
                          const errorData = await response.json();
                          alert(`Failed to join room: ${errorData.message || response.statusText}`);
                        }
                      } catch (error) {
                        console.error("Error joining room:", error);
                        alert("An error occurred while trying to join the room.");
                      }
                    }}
                  >
                    Join Room
                  </button>
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