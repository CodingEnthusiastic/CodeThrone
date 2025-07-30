"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import axios from "axios"
import { Search, Plus, Megaphone, AlertCircle, Info, CheckCircle, Calendar, User } from "lucide-react"
import { API_URL, SOCKET_URL } from "../config/api";
import { useTheme } from "../contexts/ThemeContext"

interface Announcement {
  _id: string
  title: string
  content: string
  type: string
  priority: string
  createdAt: string
  createdBy: {
    username: string
  }
}

const Announcements: React.FC = () => {
  const { user } = useAuth()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState("")
  const [selectedPriority, setSelectedPriority] = useState("")
  const [sortBy, setSortBy] = useState<"recent" | "priority">("recent")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    content: "",
    type: "general",
    priority: "medium",
  })
  const { isDark } = useTheme();

  useEffect(() => {
    fetchAnnouncements()
  }, [selectedType, selectedPriority, sortBy])

  const fetchAnnouncements = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedType) params.append("type", selectedType)
      if (selectedPriority) params.append("priority", selectedPriority)
      if (sortBy) params.append("sortBy", sortBy)

      const token = localStorage.getItem("token")
      const response = await axios.get(`${API_URL}/announcements?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      setAnnouncements(response.data)
    } catch (error) {
      console.error("Error fetching announcements:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      const token = localStorage.getItem("token")
      const response = await axios.post(
        `${API_URL}/announcements`,
        {
          title: newAnnouncement.title,
          content: newAnnouncement.content,
          type: newAnnouncement.type,
          priority: newAnnouncement.priority,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )
      setAnnouncements([response.data, ...announcements])
      setNewAnnouncement({ title: "", content: "", type: "general", priority: "medium" })
      setShowCreateForm(false)
    } catch (error) {
      console.error("Error creating announcement:", error)
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "medium":
        return <Info className="h-4 w-4 text-yellow-500" />
      case "low":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "low":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "maintenance":
        return <AlertCircle className="h-4 w-4" />
      case "feature":
        return <CheckCircle className="h-4 w-4" />
      case "event":
        return <Calendar className="h-4 w-4" />
      default:
        return <Megaphone className="h-4 w-4" />
    }
  }

  const filteredAnnouncements = announcements.filter(
    (announcement) =>
      announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      announcement.content.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const allTypes = [...new Set(announcements.map((a) => a.type))]
  const allPriorities = ["high", "medium", "low"]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 relative ${
      isDark
        ? "bg-gradient-to-br from-[#181824] via-[#23243a] to-[#181824]"
        : "bg-gradient-to-br from-[#f0f4ff] via-[#eaf0fa] to-[#f7faff]"
    }`}>
      {/* Galaxy Stars Animation for Dark Mode */}
      {isDark && (
        <>
          <style>{`
            @keyframes galaxy-drift {
              0%, 100% {
                transform: translateX(0px) translateY(0px) rotate(0deg);
                opacity: 0.8;
              }
              25% {
                transform: translateX(30px) translateY(-20px) rotate(90deg);
                opacity: 1;
              }
              50% {
                transform: translateX(-15px) translateY(25px) rotate(180deg);
                opacity: 0.6;
              }
              75% {
                transform: translateX(40px) translateY(10px) rotate(270deg);
                opacity: 0.9;
              }
            }
            @keyframes stellar-twinkle {
              0%, 100% { opacity: 0.3; transform: scale(0.8) rotate(0deg); }
              25% { opacity: 0.8; transform: scale(1.2) rotate(90deg); }
              50% { opacity: 1; transform: scale(1) rotate(180deg); }
              75% { opacity: 0.5; transform: scale(1.1) rotate(270deg); }
            }
            @keyframes cosmic-float {
              0% { transform: translateY(100vh) translateX(0px) rotate(0deg); opacity: 0; }
              10% { opacity: 0.6; }
              90% { opacity: 0.6; }
              100% { transform: translateY(-100px) translateX(50px) rotate(360deg); opacity: 0; }
            }
            @keyframes nebula-pulse {
              0%, 100% { 
                transform: scale(1) rotate(0deg);
                opacity: 0.1;
              }
              50% { 
                transform: scale(1.1) rotate(180deg);
                opacity: 0.3;
              }
            }
            .galaxy-drift {
              animation: galaxy-drift 8s ease-in-out infinite;
            }
            .stellar-twinkle {
              animation: stellar-twinkle 3s ease-in-out infinite;
            }
            .cosmic-float {
              animation: cosmic-float 12s linear infinite;
            }
            .nebula-pulse {
              animation: nebula-pulse 15s ease-in-out infinite;
            }
          `}</style>
          
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {/* Nebula backgrounds */}
            <div className="absolute top-1/4 left-1/6 w-96 h-96 bg-gradient-to-br from-purple-900/20 to-blue-900/20 nebula-pulse rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 right-1/6 w-80 h-80 bg-gradient-to-br from-indigo-900/20 to-violet-900/20 nebula-pulse rounded-full blur-3xl" style={{ animationDelay: '7s' }}></div>
            <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-br from-cyan-900/15 to-teal-900/15 nebula-pulse rounded-full blur-2xl" style={{ animationDelay: '3s' }}></div>
            
            {/* Galaxy stars */}
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={`galaxy-star-${i}`}
                className={`stellar-twinkle absolute ${
                  i % 8 === 0 ? 'w-1 h-1 bg-blue-300' :
                  i % 8 === 1 ? 'w-0.5 h-0.5 bg-purple-300' :
                  i % 8 === 2 ? 'w-1.5 h-1.5 bg-cyan-300' :
                  i % 8 === 3 ? 'w-0.5 h-0.5 bg-white' :
                  i % 8 === 4 ? 'w-1 h-1 bg-indigo-300' :
                  i % 8 === 5 ? 'w-0.5 h-0.5 bg-violet-300' :
                  i % 8 === 6 ? 'w-1 h-1 bg-teal-300' : 'w-0.5 h-0.5 bg-pink-300'
                } rounded-full`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${3 + Math.random() * 2}s`,
                }}
              />
            ))}
            
            {/* Cosmic shooting stars */}
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={`cosmic-star-${i}`}
                className={`cosmic-float absolute w-2 h-2 ${
                  i % 4 === 0 ? 'bg-gradient-to-r from-blue-400 to-cyan-400' :
                  i % 4 === 1 ? 'bg-gradient-to-r from-purple-400 to-pink-400' :
                  i % 4 === 2 ? 'bg-gradient-to-r from-indigo-400 to-blue-400' :
                  'bg-gradient-to-r from-violet-400 to-purple-400'
                } rounded-full blur-sm`}
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 12}s`,
                  animationDuration: `${12 + Math.random() * 8}s`,
                }}
              />
            ))}

            {/* Floating galaxy particles */}
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={`galaxy-particle-${i}`}
                className={`galaxy-drift absolute ${
                  i % 5 === 0 ? 'w-3 h-3 bg-blue-500/30' :
                  i % 5 === 1 ? 'w-2 h-2 bg-purple-500/30' :
                  i % 5 === 2 ? 'w-2.5 h-2.5 bg-cyan-500/30' :
                  i % 5 === 3 ? 'w-2 h-2 bg-indigo-500/30' :
                  'w-3 h-3 bg-violet-500/30'
                } rounded-full blur-sm`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDuration: `${8 + Math.random() * 4}s`,
                  animationDelay: `${Math.random() * 8}s`,
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* Light Mode Celestial Animation */}
      {!isDark && (
        <>
          <style>{`
            @keyframes light-constellation {
              0%, 100% {
                transform: translateY(0px) translateX(0px) rotate(0deg);
                opacity: 0.4;
              }
              25% {
                transform: translateY(-10px) translateX(15px) rotate(90deg);
                opacity: 0.7;
              }
              50% {
                transform: translateY(5px) translateX(-8px) rotate(180deg);
                opacity: 0.9;
              }
              75% {
                transform: translateY(-20px) translateX(20px) rotate(270deg);
                opacity: 0.5;
              }
            }
            @keyframes light-sparkle-dance {
              0%, 100% { opacity: 0.2; transform: scale(0.8) rotate(0deg); }
              50% { opacity: 0.8; transform: scale(1.3) rotate(180deg); }
            }
            @keyframes light-stardust {
              0% { transform: translateY(100px) translateX(0px) rotate(0deg); opacity: 0; }
              10% { opacity: 0.5; }
              90% { opacity: 0.5; }
              100% { transform: translateY(-100px) translateX(40px) rotate(360deg); opacity: 0; }
            }
            @keyframes aurora-glow {
              0%, 100% { 
                background: linear-gradient(45deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1));
                transform: scale(1) rotate(0deg);
              }
              33% { 
                background: linear-gradient(45deg, rgba(236, 72, 153, 0.1), rgba(59, 130, 246, 0.1));
                transform: scale(1.1) rotate(120deg);
              }
              66% { 
                background: linear-gradient(45deg, rgba(34, 197, 94, 0.1), rgba(236, 72, 153, 0.1));
                transform: scale(0.9) rotate(240deg);
              }
            }
            .light-constellation {
              animation: light-constellation 7s ease-in-out infinite;
            }
            .light-sparkle-dance {
              animation: light-sparkle-dance 2.8s ease-in-out infinite;
            }
            .light-stardust {
              animation: light-stardust 9s linear infinite;
            }
            .aurora-glow {
              animation: aurora-glow 12s ease-in-out infinite;
            }
          `}</style>
          
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {/* Aurora backgrounds */}
            <div className="absolute top-1/5 left-1/4 w-80 h-80 aurora-glow rounded-full blur-3xl opacity-40"></div>
            <div className="absolute bottom-1/4 right-1/3 w-96 h-96 aurora-glow rounded-full blur-3xl opacity-30" style={{ animationDelay: '4s' }}></div>
            <div className="absolute top-2/3 left-1/6 w-64 h-64 aurora-glow rounded-full blur-2xl opacity-35" style={{ animationDelay: '8s' }}></div>
            
            {/* Constellation stars */}
            {Array.from({ length: 35 }).map((_, i) => (
              <div
                key={`constellation-${i}`}
                className={`light-sparkle-dance absolute ${
                  i % 7 === 0 ? 'w-1.5 h-1.5 bg-blue-400/60' :
                  i % 7 === 1 ? 'w-1 h-1 bg-purple-400/60' :
                  i % 7 === 2 ? 'w-1.5 h-1.5 bg-pink-400/60' :
                  i % 7 === 3 ? 'w-1 h-1 bg-indigo-400/60' :
                  i % 7 === 4 ? 'w-1.5 h-1.5 bg-cyan-400/60' :
                  i % 7 === 5 ? 'w-1 h-1 bg-violet-400/60' : 'w-1.5 h-1.5 bg-teal-400/60'
                } rounded-full`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2.8}s`,
                  animationDuration: `${2.8 + Math.random() * 1.5}s`,
                }}
              />
            ))}
            
            {/* Stardust particles */}
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={`stardust-${i}`}
                className={`light-stardust absolute w-1 h-1 ${
                  i % 5 === 0 ? 'bg-blue-300/50' :
                  i % 5 === 1 ? 'bg-purple-300/50' :
                  i % 5 === 2 ? 'bg-pink-300/50' :
                  i % 5 === 3 ? 'bg-cyan-300/50' : 'bg-indigo-300/50'
                } rounded-full`}
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 9}s`,
                  animationDuration: `${9 + Math.random() * 4}s`,
                }}
              />
            ))}

            {/* Floating constellation elements */}
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={`light-float-${i}`}
                className={`light-constellation absolute ${
                  i % 4 === 0 ? 'w-3 h-3 bg-gradient-to-br from-blue-200/40 to-purple-200/40' :
                  i % 4 === 1 ? 'w-2.5 h-2.5 bg-gradient-to-br from-pink-200/40 to-cyan-200/40' :
                  i % 4 === 2 ? 'w-3 h-3 bg-gradient-to-br from-indigo-200/40 to-violet-200/40' :
                  'w-2.5 h-2.5 bg-gradient-to-br from-teal-200/40 to-blue-200/40'
                } rounded-full blur-sm`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDuration: `${7 + Math.random() * 3}s`,
                  animationDelay: `${Math.random() * 7}s`,
                }}
              />
            ))}
          </div>
        </>
      )}
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Announcements</h1>
              <p className="text-gray-600">Stay updated with the latest news and updates</p>
            </div>
            {user && user.role === "admin" && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Announcement
              </button>
            )}
          </div>

          {showCreateForm && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Create New Announcement</h3>
              <form onSubmit={handleCreateAnnouncement}>
                <input
                  type="text"
                  required
                  placeholder="Title"
                  className="w-full mb-3 px-3 py-2 border rounded-md"
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                />
                <textarea
                  rows={5}
                  required
                  placeholder="Content"
                  className="w-full mb-3 px-3 py-2 border rounded-md"
                  value={newAnnouncement.content}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <select
                    value={newAnnouncement.type}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, type: e.target.value })}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="general">General</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="feature">Feature</option>
                    <option value="event">Event</option>
                  </select>
                  <select
                    value={newAnnouncement.priority}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, priority: e.target.value })}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
                <div className="flex space-x-3">
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Publish
                  </button>
                  <button type="button" onClick={() => setShowCreateForm(false)} className="px-4 py-2 border rounded-md">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search announcements..."
                className="w-full pl-10 pr-4 py-2 border rounded-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2 border rounded-md"
            >
              <option value="">All Types</option>
              {allTypes.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-4 py-2 border rounded-md"
            >
              <option value="">All Priorities</option>
              {allPriorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "recent" | "priority")}
              className="px-4 py-2 border rounded-md"
            >
              <option value="recent">Most Recent</option>
              <option value="priority">By Priority</option>
            </select>
            <button
              onClick={() => {
                setSelectedType("")
                setSelectedPriority("")
                setSearchTerm("")
                setSortBy("recent")
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Clear Filters
            </button>
          </div>

          {/* Announcements */}
          <div className="space-y-4">
            {filteredAnnouncements.map((announcement) => (
              <div key={announcement._id} className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      <div className="flex items-center mr-3">
                        {getTypeIcon(announcement.type)}
                        <span className="ml-1 text-sm font-medium text-gray-600 capitalize">{announcement.type}</span>
                      </div>
                      <div className="flex items-center">
                        {getPriorityIcon(announcement.priority)}
                        <span
                          className={`ml-1 px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(announcement.priority)}`}
                        >
                          {announcement.priority.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <Link
                      to={`/announcements/${announcement._id}`}
                      className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                    >
                      {announcement.title}
                    </Link>

                    <p className="text-gray-700 mt-2 line-clamp-2">
                      {announcement.content.length > 150
                        ? `${announcement.content.substring(0, 150)}...`
                        : announcement.content}
                    </p>

                    <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          <span>By {announcement.createdBy?.username || "Unknown"}</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>{new Date(announcement.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Link
                        to={`/announcements/${announcement._id}`}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Read more →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredAnnouncements.length === 0 && (
            <div className="text-center py-12 text-gray-600">
              <Megaphone className="mx-auto h-12 w-12 mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">No announcements found</p>
              <p>Check back later for updates and news.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Announcements
