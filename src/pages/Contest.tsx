"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { useTheme } from "../contexts/ThemeContext"
import axios from "axios"
import { Trophy, Clock, Users, Calendar, Star, Play, Award, Eye, Timer, MapPin } from "lucide-react"
// import { useParams } from "react-router-dom"
// import Contest from "./Contest"
import { API_URL, SOCKET_URL } from "../config/api";

interface Contest {
  _id: string
  name: string
  description: string
  bannerImage: string
  startTime: string
  endTime: string
  duration: number
  problems: {
    _id: string
    title: string
    difficulty: string
  }[]
  participants: {
    user: {
      _id: string
      username: string
    }
    score: number
    rank: number
  }[]
  status: string
  createdBy: {
    username: string
  }
}

// Custom Card Components
const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({
  children,
  className = "",
  onClick,
}) => (
  <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 ${className}`} onClick={onClick}>
    {children}
  </div>
)

const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`p-6 ${className}`}>{children}</div>
)

const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`p-6 pt-0 ${className}`}>{children}</div>
)

const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`p-6 pt-0 ${className}`}>{children}</div>
)

const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <h3 className={`text-xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white ${className}`}>{children}</h3>
)

const CardDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <p className={`text-sm text-gray-600 dark:text-gray-300 leading-relaxed ${className}`}>{children}</p>
)

// Custom Button Component
const Button: React.FC<{
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
  variant?: "default" | "outline" | "success" | "secondary"
  size?: "sm" | "default" | "lg"
}> = ({ children, onClick, disabled = false, className = "", variant = "default", size = "default" }) => {
  const baseClasses =
    "inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"

  const variantClasses = {
    default: "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg",
    outline: "border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400",
    success: "bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg",
    secondary: "bg-gray-600 text-white hover:bg-gray-700 shadow-md hover:shadow-lg",
  }

  const sizeClasses = {
    sm: "h-9 px-3 text-sm",
    default: "h-11 px-6 text-sm",
    lg: "h-12 px-8 text-base",
  }

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

// Custom Badge Component
const Badge: React.FC<{
  children: React.ReactNode
  className?: string
  variant?: "default" | "secondary" | "outline" | "success" | "warning" | "error"
}> = ({ children, className = "", variant = "default" }) => {
  const variantClasses = {
    default: "bg-blue-100 text-blue-800 border-blue-200",
    secondary: "bg-gray-100 text-gray-800 border-gray-200",
    outline: "border-2 border-gray-300 bg-white text-gray-700",
    success: "bg-green-100 text-green-800 border-green-200",
    warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
    error: "bg-red-100 text-red-800 border-red-200",
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  )
}

const Contest: React.FC = () => {
  const { user } = useAuth()
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const [contests, setContests] = useState<Contest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")

  useEffect(() => {
    fetchContests()
    // Update contest statuses every minute
    const interval = setInterval(fetchContests, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchContests = async () => {
    try {
      const response = await axios.get(`${API_URL}/contests`)
      // Update contest statuses based on current time
      const updatedContests = response.data.map((contest: Contest) => ({
        ...contest,
        status: getActualContestStatus(contest.startTime, contest.endTime),
      }))
      setContests(updatedContests)
    } catch (error) {
      console.error("Error fetching contests:", error)
    } finally {
      setLoading(false)
    }
  }

  // Function to determine actual contest status based on current time
  const getActualContestStatus = (startTime: string, endTime: string): string => {
    const now = new Date()
    const start = new Date(startTime)
    const end = new Date(endTime)

    if (now < start) {
      return "upcoming"
    } else if (now >= start && now <= end) {
      return "ongoing"
    } else {
      return "ended"
    }
  }

  const registerForContest = async (contestId: string) => {
    if (!user) return
    try {
      await axios.post(`${API_URL}/contests/${contestId}/register`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      fetchContests()
      alert("Successfully registered for contest!")
    } catch (error: any) {
      alert(error.response?.data?.message || "Registration failed")
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "ongoing":
        return "bg-green-100 text-green-800 border-green-200"
      case "ended":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getTimeRemaining = (startTime: string, endTime: string, status: string) => {
    const now = new Date()

    if (status === "upcoming") {
      const start = new Date(startTime)
      const diff = start.getTime() - now.getTime()

      if (diff <= 0) return "Starting now"

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

      if (days > 0) return `${days}d ${hours}h ${minutes}m`
      if (hours > 0) return `${hours}h ${minutes}m`
      return `${minutes}m`
    } else if (status === "ongoing") {
      const end = new Date(endTime)
      const diff = end.getTime() - now.getTime()

      if (diff <= 0) return "Ending now"

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

      if (hours > 0) return `${hours}h ${minutes}m left`
      return `${minutes}m left`
    }

    return ""
  }
  const getDifficultyColor = (difficulty?: string) => {
  switch (difficulty) {
    case "Easy":
      return "bg-green-100 text-green-700 border-green-200";
    case "Medium":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "Hard":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

  const filteredContests = contests.filter((contest) => {
    if (filter === "all") return true
    return contest.status === filter
  })

  const isUserRegistered = (contest: Contest) => {
    if (!user) 
      return false
    // Use user._id for comparison, not user.id
    return contest.participants.some((p) => String(p.user._id) === String(user._id));
  }

  const handleEnterContest = (contestId: string) => {
    console.log("Entering contest:", contestId);
    navigate(`/contest/${contestId}/problems`)
  }
  console.log(loading, "Loading state for contests:", contests);
  if (loading) {
    if (isDark) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-br from-blue-900 via-purple-900 to-gray-900 blur-2xl opacity-60"></div>
              <div className="relative z-10 flex items-center justify-center">
                <Trophy className="h-16 w-16 text-yellow-400 animate-bounce drop-shadow-lg" />
              </div>
            </div>
            <div className="bg-gray-800/80 rounded-xl shadow-2xl p-8 border border-gray-700 max-w-xs mx-auto">
              <p className="text-lg font-bold text-yellow-300 mb-2">Loading Contests...</p>
              <p className="text-gray-300 mb-4">Please wait while we fetch the latest programming competitions.</p>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-yellow-400 border-t-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      )
    }
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300 font-medium">Loading contests...</p>
        </div>
      </div>
    )
  }
  console.log("here");
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center mb-4 sm:mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 sm:p-4 rounded-full shadow-lg">
              <Trophy className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-gray-700 dark:text-white mb-2 sm:mb-4">
            Programming Contests
          </h1>
          <p className="text-base sm:text-xl text-gray-600 dark:text-gray-300 max-w-md sm:max-w-2xl mx-auto">
            Participate in exciting programming competitions and test your skills against other developers
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-1 sm:p-2 inline-flex space-x-1 sm:space-x-2 overflow-x-auto">
            {[
              { id: "all", label: "All Contests", icon: Trophy },
              { id: "upcoming", label: "Upcoming", icon: Calendar },
              { id: "ongoing", label: "Live", icon: Play },
              { id: "ended", label: "Past", icon: Award },
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    filter === tab.id
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700"
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Contests Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-8">
          {filteredContests.map((contest) => {
            // Get actual status for each contest
            const actualStatus = getActualContestStatus(contest.startTime, contest.endTime)
            const userRegistered = isUserRegistered(contest)

            return (
              <Card key={contest._id} className="overflow-hidden group">
                {/* Banner Image */}
                <div className="relative h-36 sm:h-48 bg-gradient-to-br from-blue-600 to-purple-700 overflow-hidden">
                  {contest.bannerImage ? (
                    <img
                      src={contest.bannerImage}
                      alt={contest.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700">
                      <Trophy className="h-16 w-16 text-white opacity-80" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                  <div className="absolute top-4 right-4">
                    <Badge className={`${getStatusColor(actualStatus)} font-semibold`}>
                      {actualStatus === "ongoing" ? "🔴 LIVE" : actualStatus.toUpperCase()}
                    </Badge>
                  </div>
                  {actualStatus === "ongoing" && (
                    <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                      LIVE
                    </div>
                  )}
                </div>

                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors line-clamp-2 text-base sm:text-xl">
                    {contest.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-3 mt-1 sm:mt-2 text-xs sm:text-sm">
                    {contest.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 sm:space-y-4">
                  {/* Contest Stats */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-blue-500" />
                      <div>
                        <p className="text-[10px] sm:text-xs font-medium text-gray-500">Start Time</p>
                        <p className="text-xs sm:text-sm font-semibold">{formatDateTime(contest.startTime)}</p>
                      </div>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Timer className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-green-500" />
                      <div>
                        <p className="text-[10px] sm:text-xs font-medium text-gray-500">Duration</p>
                        <p className="text-xs sm:text-sm font-semibold">{formatDuration(contest.duration)}</p>
                      </div>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-purple-500" />
                      <div>
                        <p className="text-[10px] sm:text-xs font-medium text-gray-500">Participants</p>
                        <p className="text-xs sm:text-sm font-semibold">{contest.participants.length}</p>
                      </div>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Star className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-yellow-500" />
                      <div>
                        <p className="text-[10px] sm:text-xs font-medium text-gray-500">Problems</p>
                        <p className="text-xs sm:text-sm font-semibold">{contest.problems.length}</p>
                      </div>
                    </div>
                  </div>

                  {/* Problems Preview */}
                  {/* Problems Preview */}
                  {contest.problems.length > 0 && (
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">Problems:</p>
                      <div className="flex flex-wrap gap-1 sm:gap-1.5">
                        {actualStatus === "ended"
                          ? contest.problems.slice(0, 3).map((problemObj, index) => (
                          <Badge key={index} className={`${getDifficultyColor(problemObj.problem?.difficulty)} text-[10px] sm:text-xs`}>
                            {problemObj.problem?.title || "Untitled"}
                          </Badge>
                            ))
                          : contest.problems.slice(0, 3).map((problemObj, index) => (
                          <Badge key={index} className={`${getDifficultyColor(problemObj.problem?.difficulty)} text-[10px] sm:text-xs`}>
                            🔒 Locked
                          </Badge>
                            ))}
                        {contest.problems.length > 3 && (
                          <Badge variant="outline" className="text-[10px] sm:text-xs">
                            +{contest.problems.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Time Display */}
                  {actualStatus === "upcoming" && (
                    <div className="bg-blue-50 border border-blue-200 p-2 sm:p-4 rounded-lg">
                      <p className="text-xs sm:text-sm text-blue-700 font-medium mb-1">Contest starts in</p>
                      <p className="text-base sm:text-lg font-bold text-blue-800">
                        {getTimeRemaining(contest.startTime, contest.endTime, actualStatus)}
                      </p>
                    </div>
                  )}

                  {actualStatus === "ongoing" && (
                    <div className="bg-green-50 border border-green-200 p-2 sm:p-4 rounded-lg">
                      <p className="text-xs sm:text-sm text-green-700 font-medium mb-1 flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-1 sm:mr-2 animate-pulse"></div>
                        Contest is LIVE!
                      </p>
                      <p className="text-base sm:text-lg font-bold text-green-800">
                        {getTimeRemaining(contest.startTime, contest.endTime, actualStatus)}
                      </p>
                    </div>
                  )}

                  {/* Leaderboard Preview for Ended Contests */}
                  {actualStatus === "ended" && contest.participants.length > 0 && (
                    <div className="bg-gray-50 border border-gray-200 p-2 sm:p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3 flex items-center text-xs sm:text-base">
                        <Award className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-yellow-500" />
                        Top Performers
                      </h4>
                      <div className="space-y-1 sm:space-y-2">
                        {contest.participants
                          .sort((a, b) => a.rank - b.rank)
                          .slice(0, Math.min(3, contest.participants.length))
                          .map((participant, index) => {
                            console.log("Participant object:", participant); 
                            return(
                            // console.log("Participant object:", participant)
                            <div key={index} className="flex items-center justify-between">
                              <div className="flex items-center">
                                <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[10px] sm:text-xs font-bold flex items-center justify-center ${
                                  index === 0 ? 'bg-yellow-500 text-white' :
                                  index === 1 ? 'bg-gray-400 text-white' :
                                  'bg-orange-600 text-white'
                                }`}>
                                  {participant.rank}
                                </span>
                                <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                                  {participant.user?.username || "Unknown"}
                                </span>
                              </div>
                              <span className="text-xs sm:text-sm font-bold text-blue-600">{participant.score} pts</span>
                            </div>
                          )})}
                      </div>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-0">
                  {/* Action Buttons */}
                  {user ? (
                    <>
                      {/* Upcoming Contest - Show Register/Registered */}
                      {actualStatus === "upcoming" && (
                        <Button
                          onClick={() => registerForContest(contest._id)}
                          disabled={userRegistered}
                          className="w-full"
                          variant={userRegistered ? "success" : "default"}
                          size="lg"
                        >
                          {userRegistered ? (
                            <>
                              <Trophy className="h-5 w-5 mr-2" />
                              Registered ✓
                            </>
                          ) : (
                            <>
                              <Calendar className="h-5 w-5 mr-2" />
                              Register Now
                            </>
                          )}
                        </Button>
                      )}
                      {/* Ongoing Contest - Show Enter Contest or Registration Closed */}
                      {actualStatus === "ongoing" && (
                        <>
                          {userRegistered ? (
                            <Button
                              onClick={() => handleEnterContest(contest._id)}
                              className="w-full bg-green-600 hover:bg-green-700"
                              size="lg"
                            >
                              <Play className="h-5 w-5 mr-2" />
                              Enter Contest
                            </Button>
                          ) : (
                            <Button
                              onClick={() => registerForContest(contest._id)}
                              className="w-full"
                              variant="default"
                              size="lg"
                            >
                              <Calendar className="h-5 w-5 mr-2" />
                              Register Now
                            </Button>
                          )}
                        </>
                      )}

                      {/* Ended Contest - Show View Results */}
                      {actualStatus === "ended" && (
                        <Button 
                          onClick={() => handleEnterContest(contest._id)} 
                          className="w-full" 
                          variant="secondary" 
                          size="lg"
                        >
                          <Eye className="h-5 w-5 mr-2" />
                          View Results
                        </Button>
                      )}
                    </>
                  ) : (
                    /* Not logged in */
                    <Button disabled className="w-full" variant="outline" size="lg">
                      {actualStatus === "upcoming" ? "Login to Register" : "Login Required"}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>

        {/* Empty State */}
        {filteredContests.length === 0 && (
          <div className="text-center py-10 sm:py-16">
            <div className="bg-white rounded-xl shadow-lg p-6 sm:p-12 max-w-xs sm:max-w-md mx-auto">
              <Trophy className="h-10 w-10 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-2 sm:mb-4" />
              <h3 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">No contests found</h3>
              <p className="text-xs sm:text-base text-gray-600">
                {filter === "all" 
                  ? "There are no contests available at the moment. Check back later!" 
                  : `There are no ${filter} contests currently.`}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Contest
