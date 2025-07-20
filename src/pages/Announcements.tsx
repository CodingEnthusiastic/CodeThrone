"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import axios from "axios"
import { Search, Plus, Megaphone, AlertCircle, Info, CheckCircle, Calendar, User } from "lucide-react"

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
      const response = await axios.get(`http://localhost:5000/api/announcements?${params}`, {
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
        "http://localhost:5000/api/announcements",
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
    <div className="min-h-screen bg-gray-50">
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
  )
}

export default Announcements
