"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import axios from "axios"
import { ArrowLeft, Calendar, User, AlertCircle, Info, CheckCircle, Megaphone, Edit, Trash2, Share2, Bookmark } from 'lucide-react'
import { API_URL, SOCKET_URL } from "../config/api";


interface Announcement {
  _id: string
  title: string
  content: string
  type: string
  priority: string
  createdAt: string
  updatedAt?: string
  createdBy: {
    username: string
    _id: string
  }
}

const AnnounceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    title: "",
    content: "",
    type: "",
    priority: "",
  })

  // Add debugging
  console.log("🔍 AnnounceDetail Debug Info:")
  console.log("👤 User object:", user)
  console.log("📧 User email:", user?.email)
  console.log("👤 User username:", user?.username)
  console.log("🔑 User role:", user?.role)
  console.log("🆔 User ID:", user?._id)

  useEffect(() => {
    if (id) {
      fetchAnnouncement()
    }
  }, [id])

  const fetchAnnouncement = async () => {
    try {
      const response = await axios.get(`${API_URL}/announcements/${id}`)
      setAnnouncement(response.data)
      setEditForm({
        title: response.data.title,
        content: response.data.content,
        type: response.data.type,
        priority: response.data.priority,
      })
    } catch (error) {
      console.error("Error fetching announcement:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !announcement) return

    try {
      const token = localStorage.getItem("token")
      const response = await axios.put(`${API_URL}/announcements/${announcement._id}`, editForm, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setAnnouncement(response.data)
      setIsEditing(false)
    } catch (error) {
      console.error("Error updating announcement:", error)
    }
  }

  const handleDelete = async () => {
    if (!user || !announcement) return

    if (window.confirm("Are you sure you want to delete this announcement?")) {
      try {
        const token = localStorage.getItem("token")
        await axios.delete(`${API_URL}/announcements/${announcement._id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        window.location.href = "/announcements"
      } catch (error) {
        console.error("Error deleting announcement:", error)
      }
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case "medium":
        return <Info className="h-5 w-5 text-yellow-500" />
      case "low":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      default:
        return <Info className="h-5 w-5 text-gray-500" />
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
        return <AlertCircle className="h-5 w-5" />
      case "feature":
        return <CheckCircle className="h-5 w-5" />
      case "event":
        return <Calendar className="h-5 w-5" />
      default:
        return <Megaphone className="h-5 w-5" />
    }
  }

  const shareAnnouncement = () => {
    if (navigator.share) {
      navigator.share({
        title: announcement?.title,
        text: announcement?.content,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert("Link copied to clipboard!")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!announcement) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Announcement not found</h2>
          <p className="text-gray-600 mb-6">The announcement you're looking for doesn't exist.</p>
          <Link
            to="/announcements"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Announcements
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link to="/announcements" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Announcements
          </Link>
        </div>

        {/* Announcement Content */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Header Section */}
          <div className="p-8 border-b border-gray-200">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center mb-4">
                  <div className="flex items-center mr-4">
                    {getTypeIcon(announcement.type)}
                    <span className="ml-2 text-sm font-medium text-gray-600 capitalize">{announcement.type}</span>
                  </div>
                  <div className="flex items-center">
                    {getPriorityIcon(announcement.priority)}
                    <span
                      className={`ml-2 px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(announcement.priority)}`}
                    >
                      {announcement.priority.toUpperCase()} PRIORITY
                    </span>
                  </div>
                </div>

                {isEditing ? (
                  <form onSubmit={handleEdit} className="space-y-4">
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full text-3xl font-bold border-none outline-none bg-gray-50 p-2 rounded"
                      required
                    />
                    <div className="flex space-x-4">
                      <select
                        value={editForm.type}
                        onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                        className="px-3 py-2 border rounded-md"
                      >
                        <option value="general">General</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="feature">Feature</option>
                        <option value="event">Event</option>
                      </select>
                      <select
                        value={editForm.priority}
                        onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                        className="px-3 py-2 border rounded-md"
                      >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                      </select>
                    </div>
                    <div className="flex space-x-3">
                      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        Save Changes
                      </button>
                      <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 border rounded-md">
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">{announcement.title}</h1>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 ml-6">
                <button
                  onClick={shareAnnouncement}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  title="Share"
                >
                  <Share2 className="h-5 w-5" />
                </button>
                <button
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  title="Bookmark"
                >
                  <Bookmark className="h-5 w-5" />
                </button>
                {user &&
                  announcement &&
                  (user.role === "admin" ||
                    user.username === announcement.createdBy?.username ||
                    user._id === announcement.createdBy?._id) &&
                  !isEditing && (
                    <>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={handleDelete}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </>
                  )}
              </div>
            </div>

            {/* Meta Information */}
            <div className="flex items-center text-sm text-gray-500 space-x-6">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                <span>Published by {announcement.createdBy?.username || "Admin"}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                <span>
                  {new Date(announcement.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {announcement.updatedAt && announcement.updatedAt !== announcement.createdAt && (
                <div className="flex items-center">
                  <Edit className="h-4 w-4 mr-2" />
                  <span>Updated {new Date(announcement.updatedAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Content Section */}
          <div className="p-8">
            {isEditing ? (
              <textarea
                value={editForm.content}
                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                rows={15}
                className="w-full border rounded-md p-4 text-gray-700 leading-relaxed"
                required
              />
            ) : (
              <div className="prose max-w-none">
                <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-lg">{announcement.content}</div>
              </div>
            )}
          </div>
        </div>

        {/* Related Actions */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/announcements"
              className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              View All Announcements
            </Link>
            <button
              onClick={shareAnnouncement}
              className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share This Announcement
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnnounceDetail
