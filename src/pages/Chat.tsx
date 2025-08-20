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
  Hash,
  Lock,
  MessageCircle,
  UserPlus,
  Minimize2,
  Maximize2,
  Wifi,
  WifiOff,
  AlertCircle,
  Info,
  CornerUpLeft,
  X,
  Shield,
  Zap,
} from "lucide-react"
import { API_URL } from "../config/api"

// Common emojis for the picker
const COMMON_EMOJIS = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂',
  '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛',
  '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏',
  '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩',
  '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵',
  '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫',
  '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮',
  '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮',
  '🤧', '😷', '🤒', '🤕', '👍', '👎', '👌', '✌️', '🤞', '🤟',
  '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️',
  '🖖', '👋', '🤝', '👏', '🙌', '👐', '🤲', '🤜', '🤛', '✊',
  '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🙏', '✍️', '💪',
  '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
  '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
  '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐'
]

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
  const { user, token } = useAuth()
  const { isDark } = useTheme()

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [lastError, setLastError] = useState<string | null>(null)
  const [isSendingMessage, setIsSendingMessage] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLTextAreaElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const [roomName, setRoomName] = useState("")
  const [roomDescription, setRoomDescription] = useState("")
  const [roomType, setRoomType] = useState<ChatRoom["type"]>("general")
  const [roomIsPrivate, setRoomIsPrivate] = useState(false)
  const [roomCreating, setRoomCreating] = useState(false)
  const [roomError, setRoomError] = useState<string | null>(null)
  const [joiningRoom, setJoiningRoom] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiSearchQuery, setEmojiSearchQuery] = useState("")
  
  // Mobile sidebar shrink/expand state
  const [isSidebarShrunk, setIsSidebarShrunk] = useState(false)
  
  // Enhanced socket connection with reconnection logic
  const connectSocket = useCallback(() => {
    if (!token || !user) {
      console.log("❌ Cannot connect socket: missing token or user")
      return
    }

    console.log("🔌 Attempting to connect to Socket.IO server...")
    setConnectionStatus("connecting")
    setLastError(null)

    const newSocket = io(SOCKET_URL, {
      auth: { token, userId: user.id || user._id },
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
      setSocket(newSocket)
      setConnectionStatus("connected")
      setReconnectAttempts(0)
      setLastError(null)
    })

    newSocket.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason)
      setConnectionStatus("disconnected")
      setSocket(null)

      if (reason === "io server disconnect") {
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
      setMessages((prev) => prev.map((msg) => (msg._id === messageId ? { ...msg, reactions } : msg)))
    })

    newSocket.on("messageEdited", ({ messageId, content, isEdited, editedAt }) => {
      setMessages((prev) => prev.map((msg) => (msg._id === messageId ? { ...msg, content, isEdited, editedAt } : msg)))
    })

    newSocket.on("privateRoomCreated", (room: ChatRoom) => {
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
    if (!token || !user) return

    const socketInstance = connectSocket()

    return () => {
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

    const fetchRooms = async () => {
      try {
        const response = await fetch(`${API_URL}/chats/rooms`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        setRooms(data)

        // Auto-select first room by default if no room is currently active
        if (data.length > 0 && !activeRoom) {
          setActiveRoom(data[0])
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

    const fetchMessages = async () => {
      try {
        const response = await fetch(`${API_URL}/chats/rooms/${activeRoom._id}/messages`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        setMessages(data)
      } catch (error) {
        console.error("❌ Error fetching messages:", error)
      }
    }

    fetchMessages()

    if (socket && connectionStatus === "connected") {
      socket.emit("joinRoom", activeRoom._id)
    }
  }, [activeRoom, token, socket, connectionStatus])

  // Fetch online users
  useEffect(() => {
    if (!socket) return

    const handleOnline = (ids: User[]) => {
      setOnlineUsers(ids)
    }

    socket.on("onlineUsers", handleOnline)
    socket.emit("requestOnlineUsers")

    const intervalId = setInterval(() => {
      if (connectionStatus === "connected") {
        socket.emit("requestOnlineUsers")
      }
    }, 5000)

    return () => {
      socket.off("onlineUsers", handleOnline)
      clearInterval(intervalId)
    }
  }, [socket, connectionStatus])

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
        setEmojiSearchQuery("") // Clear search when closing
      }
    }

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showEmojiPicker])

  // Join rooms on socket connection
  useEffect(() => {
    if (socket && rooms.length > 0 && connectionStatus === "connected") {
      socket.emit(
        "joinRooms",
        rooms.map((room) => room._id),
      )
    }
  }, [socket, rooms, connectionStatus])

  // Initialize mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768
      
      // On mobile screens, ensure proper initial state
      if (isMobile && activeRoom && !isSidebarShrunk) {
        setIsSidebarShrunk(true)
        setIsSidebarOpen(false)
      } else if (!isMobile && isSidebarShrunk) {
        setIsSidebarShrunk(false)
        setIsSidebarOpen(true)
      }
    }

    // Check on mount
    handleResize()
    
    // Listen for resize events
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [activeRoom, isSidebarShrunk])

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roomName.trim() || !token) return
    setRoomCreating(true)
    setRoomError(null)

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
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      const newRoom = await response.json()
      setRooms((prev) => [newRoom, ...prev])
      setActiveRoom(newRoom)
      setShowCreateRoom(false)
      setRoomName("")
      setRoomDescription("")
      setRoomType("general")
      setRoomIsPrivate(false)
    } catch (error: any) {
      setRoomError(error.message || "Failed to create room")
    } finally {
      setRoomCreating(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeRoom || !token || isSendingMessage) return

    setIsSendingMessage(true)
    try {
      const response = await fetch(`${API_URL}/chats/rooms/${activeRoom._id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: newMessage,
          type: "text",
          replyTo: replyTo?._id,
        }),
      })

      if (response.ok) {
        setNewMessage("")
        setReplyTo(null)
      }
    } catch (error) {
      console.error("❌ Error sending message:", error)
    } finally {
      setIsSendingMessage(false)
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
          Authorization: `Bearer ${token}`,
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

  const insertEmoji = (emoji: string) => {
    setNewMessage((prev) => prev + emoji)
    // Don't close the picker, keep it open for multiple emoji selections
    messageInputRef.current?.focus()
  }

  const getFilteredEmojis = () => {
    if (!emojiSearchQuery.trim()) {
      return COMMON_EMOJIS
    }
    
    // Create a simple emoji name mapping for search
    const emojiNames: { [key: string]: string[] } = {
      '😀': ['grinning', 'smile', 'happy'],
      '😃': ['grinning', 'smile', 'happy', 'smiley'],
      '😄': ['grinning', 'smile', 'happy', 'joy'],
      '😁': ['grinning', 'smile', 'happy', 'beaming'],
      '😅': ['grinning', 'smile', 'sweat', 'nervous'],
      '😂': ['joy', 'laugh', 'tears', 'funny'],
      '🤣': ['rofl', 'laugh', 'rolling', 'funny'],
      '😊': ['blush', 'smile', 'happy'],
      '😇': ['innocent', 'angel', 'halo'],
      '🙂': ['slight', 'smile', 'happy'],
      '😉': ['wink', 'flirt'],
      '😌': ['relieved', 'peaceful'],
      '😍': ['heart', 'eyes', 'love'],
      '🥰': ['smiling', 'hearts', 'love'],
      '😘': ['kiss', 'blow', 'love'],
      '😗': ['kiss', 'whistling'],
      '😙': ['kiss', 'smile'],
      '😚': ['kiss', 'closed', 'eyes'],
      '😋': ['yum', 'delicious', 'savoring'],
      '😛': ['tongue', 'playful'],
      '😝': ['tongue', 'wink', 'playful'],
      '😜': ['tongue', 'wink', 'crazy'],
      '🤪': ['zany', 'crazy', 'goofy'],
      '🤨': ['raised', 'eyebrow', 'suspicious'],
      '🧐': ['monocle', 'thinking'],
      '🤓': ['nerd', 'glasses'],
      '😎': ['cool', 'sunglasses'],
      '🤩': ['star', 'struck', 'excited'],
      '🥳': ['party', 'celebration'],
      '😏': ['smirk', 'mischievous'],
      '😒': ['unamused', 'annoyed'],
      '😞': ['disappointed', 'sad'],
      '😔': ['pensive', 'sad'],
      '😟': ['worried', 'concerned'],
      '😕': ['confused', 'slight', 'frown'],
      '🙁': ['slight', 'frown', 'sad'],
      '😣': ['persevering', 'struggling'],
      '😖': ['confounded', 'frustrated'],
      '😫': ['tired', 'exhausted'],
      '😩': ['weary', 'tired'],
      '🥺': ['pleading', 'puppy', 'eyes'],
      '😢': ['cry', 'tear', 'sad'],
      '😭': ['sob', 'cry', 'tears'],
      '😤': ['huff', 'triumph', 'steam'],
      '😠': ['angry', 'mad'],
      '😡': ['rage', 'angry', 'red'],
      '🤬': ['swearing', 'cursing', 'symbols'],
      '🤯': ['exploding', 'head', 'mind', 'blown'],
      '😳': ['flushed', 'embarrassed'],
      '🥵': ['hot', 'sweat'],
      '🥶': ['cold', 'freezing'],
      '😱': ['scream', 'fear'],
      '😨': ['fearful', 'scared'],
      '😰': ['anxious', 'sweat'],
      '😥': ['sad', 'relieved'],
      '😓': ['downcast', 'sweat'],
      '🤗': ['hug', 'embrace'],
      '🤔': ['thinking', 'hmm'],
      '🤭': ['hand', 'over', 'mouth'],
      '🤫': ['shush', 'quiet'],
      '🤥': ['lying', 'pinocchio'],
      '😶': ['no', 'mouth', 'silent'],
      '😐': ['neutral', 'expressionless'],
      '😑': ['expressionless', 'blank'],
      '😬': ['grimace', 'awkward'],
      '🙄': ['eye', 'roll', 'annoyed'],
      '😯': ['hushed', 'surprised'],
      '😦': ['frowning', 'open', 'mouth'],
      '😧': ['anguished', 'shocked'],
      '😮': ['open', 'mouth', 'surprised'],
      '😲': ['astonished', 'shocked'],
      '🥱': ['yawn', 'tired'],
      '😴': ['sleep', 'zzz'],
      '🤤': ['drool', 'sleep'],
      '😪': ['sleepy', 'tired'],
      '😵': ['dizzy', 'knocked', 'out'],
      '🤐': ['zipper', 'mouth', 'secret'],
      '🥴': ['woozy', 'drunk'],
      '🤢': ['nauseous', 'sick'],
      '🤮': ['vomit', 'sick'],
      '🤧': ['sneeze', 'sick'],
      '😷': ['mask', 'sick'],
      '🤒': ['thermometer', 'sick'],
      '🤕': ['bandage', 'hurt'],
      '👍': ['thumbs', 'up', 'good', 'yes'],
      '👎': ['thumbs', 'down', 'bad', 'no'],
      '👌': ['ok', 'okay', 'perfect'],
      '✌️': ['peace', 'victory'],
      '🤞': ['fingers', 'crossed', 'luck'],
      '🤟': ['love', 'you', 'sign'],
      '🤘': ['rock', 'on', 'metal'],
      '🤙': ['call', 'me', 'hang', 'loose'],
      '👈': ['point', 'left'],
      '👉': ['point', 'right'],
      '👆': ['point', 'up'],
      '👇': ['point', 'down'],
      '☝️': ['index', 'point', 'up'],
      '✋': ['hand', 'stop'],
      '🤚': ['raised', 'back', 'hand'],
      '🖐️': ['hand', 'splayed'],
      '🖖': ['vulcan', 'spock'],
      '👋': ['wave', 'hello', 'goodbye'],
      '🤝': ['handshake', 'deal'],
      '👏': ['clap', 'applause'],
      '🙌': ['praise', 'celebration'],
      '👐': ['open', 'hands'],
      '🤲': ['palms', 'up'],
      '🤜': ['right', 'fist', 'bump'],
      '🤛': ['left', 'fist', 'bump'],
      '✊': ['raised', 'fist'],
      '👊': ['fist', 'bump'],
      '🙏': ['pray', 'thanks', 'please'],
      '✍️': ['write', 'writing'],
      '💪': ['muscle', 'strong', 'flex'],
      '❤️': ['heart', 'love', 'red'],
      '🧡': ['orange', 'heart', 'love'],
      '💛': ['yellow', 'heart', 'love'],
      '💚': ['green', 'heart', 'love'],
      '💙': ['blue', 'heart', 'love'],
      '💜': ['purple', 'heart', 'love'],
      '🖤': ['black', 'heart'],
      '🤍': ['white', 'heart'],
      '🤎': ['brown', 'heart'],
      '💔': ['broken', 'heart', 'sad'],
      '❣️': ['heart', 'exclamation'],
      '💕': ['two', 'hearts', 'love'],
      '💞': ['revolving', 'hearts'],
      '💓': ['beating', 'heart'],
      '💗': ['growing', 'heart'],
      '💖': ['sparkling', 'heart'],
      '💘': ['heart', 'arrow', 'cupid'],
      '💝': ['heart', 'ribbon', 'gift'],
      '💟': ['heart', 'decoration']
    }
    
    const query = emojiSearchQuery.toLowerCase()
    return COMMON_EMOJIS.filter(emoji => {
      const names = emojiNames[emoji] || []
      return names.some(name => name.includes(query))
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    const day = date.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })
    return `${day} ${time}`
  }

  const getRoomIcon = (room: ChatRoom) => {
    switch (room.type) {
      case "private":
        return <MessageCircle className="h-4 w-4 text-purple-500" />
      case "help":
        return <Users className="h-4 w-4 text-blue-500" />
      case "contest":
        return <Zap className="h-4 w-4 text-green-500" />
      case "interview":
        return <Shield className="h-4 w-4 text-red-500" />
      default:
        return <Hash className="h-4 w-4 text-gray-500" />
    }
  }

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case "connected":
        return <Wifi className="h-4 w-4 text-emerald-500" />
      case "connecting":
        return <Wifi className="h-4 w-4 text-amber-500 animate-pulse" />
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

  if (!token || !user) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${
        isDark 
          ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' 
          : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
      }`}>
        <div className={`text-center p-8 rounded-2xl shadow-2xl border backdrop-blur-sm ${
          isDark 
            ? 'bg-slate-800/80 border-slate-700' 
            : 'bg-white/90 border-white/50'
        }`}>
          <div className="relative mb-6">
            <div className={`absolute inset-0 rounded-full blur-xl ${
              isDark ? 'bg-purple-500/20' : 'bg-blue-500/20'
            }`}></div>
            <MessageCircle className={`relative h-16 w-16 mx-auto ${
              isDark ? 'text-purple-400' : 'text-blue-500'
            }`} />
          </div>
          <h2 className={`text-2xl font-bold mb-3 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>Authentication Required</h2>
          <p className={`text-lg mb-4 ${
            isDark ? 'text-slate-300' : 'text-gray-600'
          }`}>Please log in to access the chat feature. If already logged in , please refresh once..</p>
          <p className={`text-sm font-mono px-4 py-2 rounded-lg ${
            isDark ? 'text-red-400 bg-red-900/20' : 'text-red-600 bg-red-50'
          }`}>
            Authentication token is missing
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`h-screen flex transition-all duration-300 relative overflow-hidden ${
        isDark 
          ? 'bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800' 
          : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50'
      }`}
      style={{ height: "calc(100vh - 64px)" }}
    >
      {/* Sticky Back to Chats Button - Mobile Only */}
      {activeRoom && (
        <button
          onClick={() => {
            setIsSidebarShrunk(false);
            setIsSidebarOpen(true);
            setActiveRoom(null); // Optional: clear active room to go back to room list
          }}
          className={`md:hidden fixed top-20 left-4 z-50 flex items-center space-x-2 px-3 py-2 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 ${
            isDark
              ? 'bg-slate-800/95 text-white border border-slate-600 hover:bg-purple-600 hover:border-purple-500'
              : 'bg-white/95 text-gray-800 border border-gray-300 hover:bg-blue-600 hover:text-white hover:border-blue-500'
          } backdrop-blur-sm`}
          title="Back to Chats"
        >
          <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">Back</span>
        </button>
      )}

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed lg:relative lg:translate-x-0 ${
          isSidebarShrunk ? 'w-16' : 'w-full sm:w-80 lg:w-80'
        } h-full flex flex-col transition-all duration-300 z-40 ${
          isDark
            ? 'bg-slate-800/95 border-slate-700'
            : 'bg-white/95 border-gray-200'
        } backdrop-blur-xl border-r shadow-2xl`}
      >
        {/* Header */}
        <div className={`p-4 sm:p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            {/* Shrink/Expand Button (mobile only) */}
            <div className="md:hidden flex items-center space-x-2">
              <button
                onClick={() => setIsSidebarShrunk(!isSidebarShrunk)}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  isDark
                    ? 'text-slate-400 hover:text-purple-400 hover:bg-slate-700'
                    : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                }`}
                title={isSidebarShrunk ? 'Expand sidebar' : 'Shrink sidebar'}
              >
                {isSidebarShrunk ? <Maximize2 className="h-5 w-5" /> : <Minimize2 className="h-5 w-5" />}
              </button>
            </div>
            
            {!isSidebarShrunk && (
              <>
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className={`p-1.5 sm:p-2 rounded-xl ${
                    isDark ? 'bg-gradient-to-r from-purple-600 to-blue-600' : 'bg-gradient-to-r from-blue-600 to-purple-600'
                  }`}>
                    <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <h1 className={`text-lg sm:text-2xl font-bold bg-gradient-to-r ${
                    isDark
                      ? 'from-purple-400 to-blue-400'
                      : 'from-blue-600 to-purple-600'
                  } bg-clip-text text-transparent`}>
                    Discord Coding
                  </h1>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <button
                    onClick={() => setShowUserSearch(!showUserSearch)}
                    className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 ${
                      isDark
                        ? 'text-slate-400 hover:text-purple-400 hover:bg-slate-700'
                        : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                    title="Start Private Chat"
                  >
                    <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
              <button
                onClick={() => setShowCreateRoom(!showCreateRoom)}
                className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 ${
                  isDark
                    ? 'text-slate-400 hover:text-purple-400 hover:bg-slate-700'
                    : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                }`}
                title="Create Room"
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
            </>
            )}
          </div>

          {/* Connection Status */}
          <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl border backdrop-blur-sm ${
            isDark
              ? 'bg-slate-700/50 border-slate-600'
              : connectionStatus === "connected"
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3">
                {getConnectionStatusIcon()}
                <span className={`text-xs sm:text-sm font-medium ${
                  isDark
                    ? 'text-slate-200'
                    : connectionStatus === "connected"
                      ? 'text-emerald-800'
                      : 'text-gray-800'
                }`}>
                  {getConnectionStatusText()}
                </span>
              </div>
              {connectionStatus === "error" && (
                <button
                  onClick={connectSocket}
                  className={`text-xs px-3 py-1 rounded-md transition-colors ${
                    isDark
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Retry
                </button>
              )}
            </div>
            {lastError && (
              <div className={`mt-2 text-xs ${
                isDark ? 'text-red-400' : 'text-red-600'
              }`}>
                {lastError}
              </div>
            )}
          </div>

          {/* User Search */}
          {showUserSearch && (
            <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl border ${
              isDark
                ? 'bg-slate-700/50 border-slate-600'
                : 'bg-orange-50 border-orange-200'
            }`}>
              <div className="relative mb-3">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                  isDark ? 'text-slate-400' : 'text-gray-500'
                }`} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    searchUsers(e.target.value)
                  }}
                  className={`w-full pl-10 pr-4 py-2 sm:py-3 rounded-lg border transition-all duration-200 text-sm sm:text-base ${
                    isDark
                      ? 'bg-slate-800 text-slate-100 border-slate-600 focus:border-purple-500 placeholder-slate-400'
                      : 'bg-white text-gray-900 border-gray-300 focus:border-blue-500 placeholder-gray-500'
                  } focus:ring-2 focus:ring-opacity-50`}
                />
              </div>
              {searchResults.length > 0 && (
                <div className={`max-h-48 overflow-y-auto rounded-lg border ${
                  isDark
                    ? 'bg-slate-800 border-slate-600'
                    : 'bg-white border-gray-200'
                }`}>
                  {searchResults.map((searchUser) => (
                    <button
                      key={searchUser._id}
                      onClick={() => createPrivateChat(searchUser)}
                      className={`w-full p-3 text-left flex items-center space-x-3 border-b last:border-b-0 transition-colors ${
                        isDark
                          ? 'hover:bg-slate-700 border-slate-600'
                          : 'hover:bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="w-9 h-9 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {searchUser.username[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className={`font-medium ${
                          isDark ? 'text-slate-100' : 'text-gray-900'
                        }`}>
                          {searchUser.username}
                        </div>
                        <div className={`text-sm ${
                          isDark ? 'text-slate-400' : 'text-gray-600'
                        }`}>
                          {searchUser.stats?.problemsSolved.total || 0} problems solved
                        </div>
                      </div>
                      {searchUser.ratings?.globalRank && (
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          isDark ? 'bg-slate-600 text-slate-300' : 'bg-gray-100 text-gray-600'
                        }`}>
                          #{searchUser.ratings.globalRank}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Create Room */}
          {showCreateRoom && (
            <div className={`mb-6 p-4 rounded-xl border ${
              isDark
                ? 'bg-slate-700/50 border-slate-600'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-slate-200' : 'text-gray-700'
                  }`}>
                    Room Name
                  </label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border transition-all duration-200 ${
                      isDark
                        ? 'bg-slate-800 text-slate-100 border-slate-600 focus:border-purple-500'
                        : 'bg-white text-gray-900 border-gray-300 focus:border-blue-500'
                    } focus:ring-2 focus:ring-opacity-50`}
                    placeholder="e.g., LeetCode Warriors"
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-slate-200' : 'text-gray-700'
                  }`}>
                    Description
                  </label>
                  <input
                    type="text"
                    value={roomDescription}
                    onChange={(e) => setRoomDescription(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border transition-all duration-200 ${
                      isDark
                        ? 'bg-slate-800 text-slate-100 border-slate-600 focus:border-purple-500'
                        : 'bg-white text-gray-900 border-gray-300 focus:border-blue-500'
                    } focus:ring-2 focus:ring-opacity-50`}
                    placeholder="Brief description of the room"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-slate-200' : 'text-gray-700'
                  }`}>
                    Type
                  </label>
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value as ChatRoom["type"])}
                    className={`w-full px-3 py-2 rounded-lg border transition-all duration-200 ${
                      isDark
                        ? 'bg-slate-800 text-slate-100 border-slate-600 focus:border-purple-500'
                        : 'bg-white text-gray-900 border-gray-300 focus:border-blue-500'
                    } focus:ring-2 focus:ring-opacity-50`}
                  >
                    <option value="general">General</option>
                    <option value="help">Help</option>
                    <option value="contest">Contest</option>
                    <option value="interview">Interview</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                {roomError && (
                  <div className={`text-sm p-2 rounded ${
                    isDark ? 'text-red-400 bg-red-900/20' : 'text-red-600 bg-red-50'
                  }`}>
                    {roomError}
                  </div>
                )}
                <div className="flex space-x-3 pt-2">
                  <button
                    type="submit"
                    disabled={roomCreating}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isDark
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {roomCreating ? "Creating..." : "Create Room"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateRoom(false)}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      isDark
                        ? 'bg-slate-600 text-slate-200 hover:bg-slate-500'
                        : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Rooms List */}
        <div className="flex-1 overflow-y-auto">
          {rooms.map((room) => (
            <button
              key={room._id}
              onClick={() => {
                setActiveRoom(room)
                // On mobile (screen width < md), shrink sidebar to show mobile overlay
                if (window.innerWidth < 768) {
                  setIsSidebarShrunk(true)
                  setIsSidebarOpen(false)
                } else {
                  setIsSidebarOpen(false) // Close sidebar on mobile after selection
                }
              }}
              className={`w-full ${isSidebarShrunk ? 'p-2' : 'p-4'} text-left border-b flex items-center ${isSidebarShrunk ? 'justify-center' : 'space-x-3'} transition-all duration-200 ${
                isDark
                  ? activeRoom?._id === room._id
                    ? "bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-l-4 border-purple-500"
                    : "hover:bg-slate-700/50 border-slate-700"
                  : activeRoom?._id === room._id
                    ? "bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500"
                    : "hover:bg-gray-50 border-gray-200"
              }`}
              title={isSidebarShrunk ? room.name : undefined}
            >
              <div className="flex-shrink-0">{getRoomIcon(room)}</div>
              {!isSidebarShrunk && (
                <>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium truncate ${
                      isDark ? "text-slate-100" : "text-gray-900"
                    }`}>
                      {room.name}
                    </div>
                    <div className={`text-sm flex items-center space-x-2 mt-1 ${
                      isDark ? "text-slate-400" : "text-gray-600"
                    }`}>
                      <span>{room.participants.length} members</span>
                      {room.messageCount > 0 && <span>• {room.messageCount} messages</span>}
                    </div>
                  </div>
                  {room.isPrivate && <Lock className="h-3 w-3 text-gray-500" />}
                </>
              )}
            </button>
          ))}
        </div>

        {/* Online Users */}
        <div className={`p-4 border-t ${
          isDark
            ? "border-slate-700 bg-slate-800/50"
            : "border-gray-200 bg-gray-50/50"
        }`}>
          <h3 className={`text-sm font-semibold mb-3 flex items-center space-x-2 ${
            isDark ? "text-slate-200" : "text-gray-700"
          }`}>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span>Online Users ({onlineUsers.length})</span>
          </h3>
          <div className="space-y-2 max-h-36 overflow-y-auto">
            {onlineUsers.length > 0 ? (
              onlineUsers.map((onlineUser) => (
                <div key={onlineUser._id} className="flex items-center space-x-3">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className={`text-sm truncate ${
                    isDark ? "text-slate-300" : "text-gray-700"
                  }`}>
                    {onlineUser.username}
                  </span>
                </div>
              ))
            ) : (
              <p className={`text-sm ${
                isDark ? "text-slate-500" : "text-gray-500"
              }`}>
                No users online
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col h-full min-h-0 relative ${
        isSidebarShrunk ? 'md:ml-16' : ''
      }`}>
        {/* Mobile Chat Overlay - Show when sidebar is shrunk */}
        {isSidebarShrunk && activeRoom && (
          <div className="fixed inset-0 z-40 bg-white dark:bg-slate-900 flex flex-col md:hidden">
            {/* Mobile Chat Header */}
            <div className={`p-4 border-b backdrop-blur-xl shadow-lg flex items-center justify-center ${
              isDark
                ? "border-slate-700 bg-slate-800/80"
                : "border-gray-200 bg-white/80"
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  isDark ? 'bg-slate-700' : 'bg-gray-100'
                }`}>
                  {getRoomIcon(activeRoom)}
                </div>
                <div className="text-center">
                  <h2 className={`font-semibold text-lg ${
                    isDark ? "text-slate-100" : "text-gray-900"
                  }`}>
                    {activeRoom.name}
                  </h2>
                  <p className={`text-xs ${
                    isDark ? "text-slate-400" : "text-gray-600"
                  }`}>
                    {activeRoom.participants.length} members • {activeRoom.isPrivate ? (
                      <>
                        <Lock className="h-3 w-3 inline mr-1" />
                        <span>Private</span>
                      </>
                    ) : (
                      <>
                        <Users className="h-3 w-3 inline mr-1" />
                        <span>Public</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Mobile Chat Content */}
            <div className="flex-1 flex flex-col min-h-0">
              {/* Messages for mobile */}
              {/* <button
                className="md:hidden p-2 rounded-full bg-blue-600 text-white shadow hover:bg-blue-700 transition absolute left-2 top-2 z-50"
                onClick={() => setSidebarShrunk(false)}
                aria-label="Show group chats"
              >
                Show Groups
              </button> */}
              {isSidebarShrunk && (
                  <button
                    className="md:hidden p-2 rounded-full bg-blue-600 text-white shadow hover:bg-blue-700 transition absolute left-2 top-2 z-50"
                    onClick={() => {
                      setIsSidebarOpen(true);
                      setIsSidebarShrunk(false);
                    }}
                    aria-label="Show group chats"
                  >
                    Show Groups
                  </button>
                )}
              <div 
                className={`flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-6 ${
                  isDark
                    ? "whatsapp-dark-bg"
                    : "whatsapp-light-bg"
                }`}
                style={isDark ? {
                  backgroundImage: "url('/whatsapp-bg-dark.jpg')",
                  backgroundSize: "400px 400px",
                  backgroundPosition: "center",
                  backgroundRepeat: "repeat",
                  backgroundColor: "#0e1419"
                } : {
                  backgroundImage: "url('/whatsapp-bg-light.png')",
                  backgroundSize: "400px 400px",
                  backgroundPosition: "center",
                  backgroundRepeat: "repeat",
                  backgroundColor: "#e5ddd5"
                }}
              >
                {messages.map((message) => {
                  const isMe = message.sender._id === (user?.id || user?._id || '')
                  return (
                    <div
                      key={message._id}
                      className={`group flex items-start space-x-3 animate-fade-in ${
                        isMe ? "flex-row-reverse space-x-reverse" : ""
                      }`}
                    >
                      {/* Avatar */}
                      {message.sender.profile?.avatar && !message.sender.profile.avatar.startsWith('default:') ? (
                        <img
                          src={message.sender.profile.avatar || "https://thumbs.dreamstime.com/b/default-avatar-profile-icon-vector-social-media-user-photo-183042379.jpg"}
                          alt={message.sender.username}
                          className="w-10 h-10 rounded-full object-cover border-2 border-purple-500 shadow-lg"
                          onError={e => { e.currentTarget.src = "https://thumbs.dreamstime.com/b/default-avatar-profile-icon-vector-social-media-user-photo-183042379.jpg"; }}
                        />
                      ) : (
                        <img
                          src="https://thumbs.dreamstime.com/b/default-avatar-profile-icon-vector-social-media-user-photo-183042379.jpg"
                          alt={message.sender.username}
                          className="w-10 h-10 rounded-full object-cover border-2 border-purple-500 shadow-lg"
                        />
                      )}
  
                      <div className="flex-1 min-w-0 max-w-2xl">
                        <div
                          className={`p-4 rounded-2xl shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl ${
                            isMe
                              ? isDark
                                ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white ml-auto rounded-br-md"
                                : "bg-gradient-to-r from-blue-500 to-purple-500 text-white ml-auto rounded-br-md"
                              : isDark
                                ? "bg-slate-700/80 text-slate-100 rounded-bl-md border border-slate-600"
                                : "bg-white/90 text-gray-900 rounded-bl-md border border-gray-200"
                          }`}
                          style={isMe ? { marginLeft: "auto" } : {}}
                        >
                          <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Mobile Message Input */}
              {activeRoom && (
                <div className={`p-3 sm:p-4 border-t backdrop-blur-xl ${
                  isDark
                    ? "border-slate-700 bg-slate-800/80"
                    : "border-gray-200 bg-white/80"
                }`}>
                  <div className="flex items-end space-x-2">
                    <div className="flex-1 relative min-w-0">
                      <textarea
                        ref={messageInputRef}
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value)
                          handleTyping()
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            sendMessage()
                          }
                        }}
                        rows={1}
                        placeholder={`Message ${activeRoom.name}...`}
                        disabled={!activeRoom || connectionStatus !== "connected" || isSendingMessage}
                        className={`w-full px-3 py-3 rounded-xl border transition-all duration-200 resize-none disabled:opacity-60 disabled:cursor-not-allowed text-base ${
                          isDark
                            ? "bg-slate-700 text-slate-100 border-slate-600 focus:border-purple-500 placeholder-slate-400"
                            : "bg-white text-gray-900 border-gray-300 focus:border-blue-500 placeholder-gray-500"
                        } focus:ring-2 focus:ring-opacity-50`}
                        style={{ 
                          minHeight: '48px', 
                          maxHeight: '120px',
                          paddingRight: '60px' // Make room for send button
                        }}
                      />
                    </div>
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || !activeRoom || connectionStatus !== "connected" || isSendingMessage}
                      className={`flex-shrink-0 p-3 rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:scale-105 ${
                        isDark
                          ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                          : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                      } shadow-lg hover:shadow-xl min-w-[48px] min-h-[48px] flex items-center justify-center`}
                      title="Send Message"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Desktop Chat Header */}
        <div className={`p-4 border-b backdrop-blur-xl shadow-lg z-10 ${
          isDark
            ? "border-slate-700 bg-slate-800/80"
            : "border-gray-200 bg-white/80"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {activeRoom && (
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    isDark ? 'bg-slate-700' : 'bg-gray-100'
                  }`}>
                    {getRoomIcon(activeRoom)}
                  </div>
                  <div>
                    <h2 className={`text-lg font-bold ${
                      isDark ? "text-slate-100" : "text-gray-900"
                    }`}>
                      {activeRoom.name}
                    </h2>
                    <p className={`text-sm flex items-center space-x-2 ${
                      isDark ? "text-slate-400" : "text-gray-600"
                    }`}>
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
            <div className="flex items-center space-x-3">
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                isDark
                  ? 'bg-slate-700/50'
                  : connectionStatus === "connected"
                    ? "bg-emerald-100"
                    : "bg-gray-100"
              }`}>
                {getConnectionStatusIcon()}
                <span className={`text-xs font-medium ${
                  isDark
                    ? "text-slate-200"
                    : connectionStatus === "connected"
                      ? "text-emerald-700"
                      : "text-gray-700"
                }`}>
                  {getConnectionStatusText()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div 
          className={`flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-6 ${
            isDark
              ? "whatsapp-dark-bg"
              : "whatsapp-light-bg"
          }`}
          style={isDark ? {
            backgroundImage: "url('/whatsapp-bg-dark.jpg')",
            backgroundSize: "400px 400px",
            backgroundPosition: "center",
            backgroundRepeat: "repeat",
            backgroundColor: "#0e1419"
          } : {
            backgroundImage: "url('/whatsapp-bg-light.png')",
            backgroundSize: "400px 400px",
            backgroundPosition: "center",
            backgroundRepeat: "repeat",
            backgroundColor: "#e5ddd5"
          }}
        >
          {messages.map((message) => {
            const isMe = message.sender._id === (user.id || user._id)
            return (
              <div
                key={message._id}
                className={`group flex items-start space-x-3 animate-fade-in ${
                  isMe ? "flex-row-reverse space-x-reverse" : ""
                }`}
              >
                {/* Avatar */}
                {message.sender.profile?.avatar && !message.sender.profile.avatar.startsWith('default:') ? (
                  <img
                    src={message.sender.profile.avatar || "https://thumbs.dreamstime.com/b/default-avatar-profile-icon-vector-social-media-user-photo-183042379.jpg"}
                    alt={message.sender.username}
                    className="w-10 h-10 rounded-full object-cover border-2 border-purple-500 shadow-lg"
                    onError={e => { e.currentTarget.src = "https://thumbs.dreamstime.com/b/default-avatar-profile-icon-vector-social-media-user-photo-183042379.jpg"; }}
                  />
                ) : (
                  <img
                    src="https://thumbs.dreamstime.com/b/default-avatar-profile-icon-vector-social-media-user-photo-183042379.jpg"
                    alt={message.sender.username}
                    className="w-10 h-10 rounded-full object-cover border-2 border-purple-500 shadow-lg"
                  />
                )}

                <div className="flex-1 min-w-0 max-w-2xl">
                  {/* Message Header */}
                  <div className={`flex items-center space-x-2 mb-2 ${
                    isMe ? "justify-end" : ""
                  }`}>
                    {isMe ? (
                      <>
                        <span className={`text-xs ${
                          isDark ? "text-slate-400" : "text-gray-500"
                        }`}>
                          {formatTime(message.createdAt)}
                          {message.isEdited && <span className="ml-1">(edited)</span>}
                        </span>
                        <span className={`font-semibold text-sm ${
                          isDark ? "text-purple-400" : "text-blue-600"
                        }`}>
                          {message.sender.username}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className={`font-semibold text-sm ${
                          isDark ? "text-purple-400" : "text-blue-600"
                        }`}>
                          {message.sender.username}
                        </span>
                        <span className={`text-xs ${
                          isDark ? "text-slate-400" : "text-gray-500"
                        }`}>
                          {formatTime(message.createdAt)}
                          {message.isEdited && <span className="ml-1">(edited)</span>}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Reply Context */}
                  {message.replyTo && (
                    <div className={`mb-3 p-3 rounded-lg border-l-4 ${
                      isDark
                        ? "bg-slate-700/50 border-purple-500 text-slate-300"
                        : "bg-blue-50 border-blue-500 text-blue-900"
                    }`}>
                      <span className={`font-medium flex items-center text-sm ${
                        isDark ? "text-purple-400" : "text-blue-600"
                      }`}>
                        <CornerUpLeft className="h-3 w-3 mr-1" />
                        Replying to {message.replyTo.sender.username}:
                      </span>
                      <span className={`block text-xs mt-1 opacity-75 truncate`}>
                        {message.replyTo.content}
                      </span>
                    </div>
                  )}

                  {/* Message Content */}
                  <div
                    className={`p-4 rounded-2xl shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl ${
                      isMe
                        ? isDark
                          ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white ml-auto rounded-br-md"
                          : "bg-gradient-to-r from-blue-500 to-purple-500 text-white ml-auto rounded-br-md"
                        : isDark
                          ? "bg-slate-700/80 text-slate-100 rounded-bl-md border border-slate-600"
                          : "bg-white/90 text-gray-900 rounded-bl-md border border-gray-200"
                    } ${message.type === "code" ? "font-mono text-sm" : ""}`}
                    style={isMe ? { marginLeft: "auto" } : {}}
                  >
                    {message.type === "code" && message.language && (
                      <div className="flex items-center space-x-2 mb-2 text-xs opacity-75">
                        <Code className="h-3.5 w-3.5" />
                        <span className="font-semibold">{message.language}</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  </div>

                  {/* Reactions */}
                  {message.reactions.length > 0 && (
                    <div className={`flex items-center space-x-1 mt-2 ${
                      isMe ? "justify-end" : ""
                    }`}>
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
                          className={`px-2 py-1 rounded-full text-xs transition-all duration-200 hover:scale-110 ${
                            isDark
                              ? "bg-slate-600 hover:bg-slate-500 text-slate-200"
                              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                          }`}
                        >
                          <span>{emoji}</span>
                          <span className="ml-1 font-medium">{count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Message Actions */}
                <div className={`opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center space-x-1 self-start mt-8`}>
                  <button
                    onClick={() => addReaction(message._id, "👍")}
                    className={`p-2 rounded-full transition-all duration-200 hover:scale-110 ${
                      isDark
                        ? "text-slate-400 hover:text-green-400 hover:bg-slate-700"
                        : "text-gray-400 hover:text-green-500 hover:bg-green-50"
                    }`}
                    title="Like"
                    disabled={connectionStatus !== "connected"}
                  >
                    👍
                  </button>
                  <button
                    onClick={() => setReplyTo(message)}
                    className={`p-2 rounded-full transition-all duration-200 hover:scale-110 ${
                      isDark
                        ? "text-slate-400 hover:text-blue-400 hover:bg-slate-700"
                        : "text-gray-400 hover:text-blue-500 hover:bg-blue-50"
                    }`}
                    title="Reply"
                  >
                    <Reply className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}

          {/* Typing Indicators */}
          {activeRoom && isTyping[activeRoom._id] && isTyping[activeRoom._id].length > 0 && (
            <div className={`flex items-center space-x-3 p-4 rounded-2xl w-fit backdrop-blur-sm ${
              isDark
                ? "bg-slate-700/50 border border-slate-600"
                : "bg-white/90 border border-gray-200"
            }`}>
              <div className="flex space-x-1">
                <div className={`w-2 h-2 rounded-full animate-bounce ${
                  isDark ? "bg-purple-400" : "bg-blue-500"
                }`} style={{ animationDelay: "0s" }}></div>
                <div className={`w-2 h-2 rounded-full animate-bounce ${
                  isDark ? "bg-purple-400" : "bg-blue-500"
                }`} style={{ animationDelay: "0.1s" }}></div>
                <div className={`w-2 h-2 rounded-full animate-bounce ${
                  isDark ? "bg-purple-400" : "bg-blue-500"
                }`} style={{ animationDelay: "0.2s" }}></div>
              </div>
              <span className={`text-sm font-medium ${
                isDark ? "text-slate-300" : "text-gray-700"
              }`}>
                {isTyping[activeRoom._id].map((u) => u.username).join(", ")}
                {isTyping[activeRoom._id].length === 1 ? " is" : " are"} typing...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        {activeRoom &&
          (activeRoom.isPrivate ||
            activeRoom.participants.some((u) => u._id === (user.id || user._id))) ? (
          <div className={`p-3 sm:p-4 border-t backdrop-blur-xl ${
            isDark
              ? "border-slate-700 bg-slate-800/80"
              : "border-gray-200 bg-white/80"
          }`}>
            {replyTo && (
              <div className={`mb-3 p-3 rounded-lg flex items-center justify-between border-l-4 ${
                isDark
                  ? "bg-slate-700/50 border-purple-500"
                  : "bg-blue-50 border-blue-500"
              }`}>
                <div className="text-sm">
                  <span className={`font-medium flex items-center ${
                    isDark ? "text-purple-400" : "text-blue-600"
                  }`}>
                    <CornerUpLeft className="h-3.5 w-3.5 mr-2" />
                    Replying to <span className="ml-1 mr-1">{replyTo.sender.username}</span>:
                  </span>
                  <span className={`ml-6 block text-xs mt-1 opacity-75 truncate`}>
                    {replyTo.content.substring(0, 70)}
                    {replyTo.content.length > 70 ? "..." : ""}
                  </span>
                </div>
                <button
                  onClick={() => setReplyTo(null)}
                  className={`p-1 rounded-full transition-colors ${
                    isDark
                      ? "text-slate-400 hover:text-slate-200 hover:bg-slate-600"
                      : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  }`}
                  title="Cancel Reply"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="flex items-end space-x-2">
              <div className="flex-1 relative min-w-0">
                <textarea
                  ref={messageInputRef}
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value)
                    handleTyping()
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  rows={1}
                  placeholder={activeRoom ? `Message ${activeRoom.name}...` : "Select a room to start chatting"}
                  disabled={!activeRoom || connectionStatus !== "connected" || isSendingMessage}
                  className={`w-full px-3 py-3 pr-12 rounded-xl border transition-all duration-200 resize-none disabled:opacity-60 disabled:cursor-not-allowed text-base ${
                    isDark
                      ? "bg-slate-700 text-slate-100 border-slate-600 focus:border-purple-500 placeholder-slate-400"
                      : "bg-white text-gray-900 border-gray-300 focus:border-blue-500 placeholder-gray-500"
                  } focus:ring-2 focus:ring-opacity-50`}
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                />
                
                {/* Emoji Button */}
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 rounded-lg transition-all duration-200 ${
                    isDark
                      ? "text-slate-400 hover:text-slate-200 hover:bg-slate-600"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                  title="Add Emoji"
                >
                  <Smile className="h-5 w-5" />
                </button>

                {/* Emoji Picker */}
                {showEmojiPicker && (
                  <div 
                    ref={emojiPickerRef}
                    className={`absolute bottom-full right-0 mb-2 w-72 sm:w-80 rounded-xl border shadow-2xl backdrop-blur-xl z-50 overflow-hidden ${
                      isDark
                        ? "bg-slate-800/95 border-slate-600"
                        : "bg-white/95 border-gray-200"
                    }`}
                    style={{ maxHeight: '320px' }}
                  >
                    <div className={`p-3 border-b ${isDark ? 'border-slate-600' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className={`text-sm font-medium ${
                          isDark ? 'text-slate-200' : 'text-gray-700'
                        }`}>
                          Choose an emoji
                        </h3>
                        <button
                          onClick={() => {
                            setShowEmojiPicker(false)
                            setEmojiSearchQuery("")
                          }}
                          className={`p-1 rounded-lg transition-colors ${
                            isDark
                              ? "text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                          }`}
                          title="Close"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="relative">
                        <Search className={`absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 ${
                          isDark ? 'text-slate-400' : 'text-gray-500'
                        }`} />
                        <input
                          type="text"
                          placeholder="Search emojis..."
                          value={emojiSearchQuery}
                          onChange={(e) => setEmojiSearchQuery(e.target.value)}
                          className={`w-full pl-8 pr-8 py-2 text-sm rounded-lg border transition-all duration-200 ${
                            isDark
                              ? 'bg-slate-700 text-slate-100 border-slate-600 focus:border-purple-500 placeholder-slate-400'
                              : 'bg-white text-gray-900 border-gray-300 focus:border-blue-500 placeholder-gray-500'
                          } focus:ring-1 focus:ring-opacity-50`}
                        />
                        {emojiSearchQuery && (
                          <button
                            onClick={() => setEmojiSearchQuery("")}
                            className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-0.5 rounded transition-colors ${
                              isDark
                                ? "text-slate-400 hover:text-slate-200"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                            title="Clear search"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="overflow-y-auto" style={{ maxHeight: '240px' }}>
                      <div className="p-3">
                        <div className="grid grid-cols-8 gap-1">
                          {getFilteredEmojis().map((emoji, index) => (
                            <button
                              key={index}
                              onClick={() => insertEmoji(emoji)}
                              className={`w-9 h-9 text-lg rounded-lg transition-all duration-200 hover:scale-110 flex items-center justify-center ${
                                isDark
                                  ? "hover:bg-slate-700"
                                  : "hover:bg-gray-100"
                              }`}
                              title={emoji}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                        {getFilteredEmojis().length === 0 && (
                          <div className={`text-center py-4 text-sm ${
                            isDark ? 'text-slate-400' : 'text-gray-500'
                          }`}>
                            No emojis found matching "{emojiSearchQuery}"
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || !activeRoom || connectionStatus !== "connected" || isSendingMessage}
                className={`flex-shrink-0 p-3 rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:scale-105 ${
                  isDark
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                    : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                } shadow-lg hover:shadow-xl min-w-[48px] min-h-[48px] flex items-center justify-center`}
                title="Send Message"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>

            {connectionStatus !== "connected" && (
              <div className={`mt-2 sm:mt-3 text-xs flex items-center justify-center p-2 rounded-lg ${
                isDark
                  ? "text-amber-400 bg-amber-900/20 border border-amber-800"
                  : "text-amber-700 bg-amber-50 border border-amber-200"
              }`}>
                <AlertCircle className="h-3.5 w-3.5 mr-2" />
                Chat is {connectionStatus}. Tip : You can send Message by joining any existing room , create your own Discord room or start Private Chat.
              </div>
            )}
          </div>
        ) : (
          activeRoom &&
          !activeRoom.isPrivate && (
            <div className={`p-8 border-t flex flex-col items-center justify-center text-center ${
              isDark
                ? "border-slate-700 bg-slate-800/80"
                : "border-gray-200 bg-white/80"
            }`}>
              <div className={`p-4 rounded-full mb-4 ${
                isDark ? 'bg-slate-700' : 'bg-gray-100'
              }`}>
                <Info className={`h-12 w-12 ${
                  isDark ? 'text-purple-400' : 'text-blue-500'
                }`} />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${
                isDark ? "text-slate-100" : "text-gray-900"
              }`}>
                You are not a member of this room
              </h3>
              <p className={`mb-6 max-w-md ${
                isDark ? "text-slate-400" : "text-gray-600"
              }`}>
                Join this room to participate in the conversation and send messages.
              </p>
              <button
  className={`px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-medium transition-all duration-200 hover:scale-105 text-sm sm:text-base ${
    isDark
      ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
      : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
  } shadow-lg hover:shadow-xl flex items-center justify-center`}
  onClick={async () => {
    setJoiningRoom(true);
    try {
      const response = await fetch(`${API_URL}/chats/rooms/${activeRoom._id}/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert(`Failed to join room: ${errorData.message || response.statusText}`);
      }
    } catch (error) {
      console.error("Error joining room:", error);
      alert("An error occurred while trying to join the room.");
    } finally {
      setJoiningRoom(false);
    }
  }}
  disabled={joiningRoom}
>
  {joiningRoom ? (
    <span className="flex items-center space-x-2">
      <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 01-8 8z"/>
      </svg>
      <span>Joining...</span>
    </span>
  ) : (
    "Join Room"
  )}
</button>
            </div>
          )
        )}
      </div>
    </div>
  )
}

export default Chat
