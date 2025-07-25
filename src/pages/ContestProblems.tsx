"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import axios from "axios"
import { Trophy, Users, BookOpen, Award, Code, CheckCircle, ArrowLeft, Timer, Play } from "lucide-react"

interface Contest {
  _id: string
  name: string
  description: string
  bannerImage: string
  startTime: string
  endTime: string
  duration: number
  status: string
  problems: {
    _id: string
    title: string
    difficulty: string
    score: number
    order: number
  }[]
  participants: {
    user: {
      _id: string
      username: string
    }
    score: number
    rank: number
    submissions: {
      problem: string
      score: number
      timeSubmitted: string
      penalty: number
      attempts: number
    }[]
  }[]
  editorial: string
}

interface ProblemEditorial {
  _id: string
  title: string
  difficulty: string
  editorial: {
    written: string
    videoUrl?: string
    thumbnailUrl?: string
    duration?: number
  }
  referenceSolution: {
    language: string
    completeCode: string
  }[]
}

// Custom Components
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-lg border border-gray-100 ${className}`}>{children}</div>
)

const CardHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="p-6">{children}</div>

const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`p-6 pt-0 ${className}`}>{children}</div>
)

const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <h3 className={`text-xl font-bold leading-tight tracking-tight ${className}`}>{children}</h3>
)

const CardDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <p className={`text-sm text-gray-600 leading-relaxed ${className}`}>{children}</p>
)

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
    sm: "h-9 px-4 text-sm",
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

const Badge: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${className}`}>
    {children}
  </span>
)

const ContestProblems: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const contestId = id
  const { user } = useAuth()
  const navigate = useNavigate()
  const [contest, setContest] = useState<Contest | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("problems")
  const [timeRemaining, setTimeRemaining] = useState("")
  const [editorials, setEditorials] = useState<ProblemEditorial[]>([])
  const [loadingEditorials, setLoadingEditorials] = useState(false)
// editorials = true
  useEffect(() => {
    if (contestId) {
      fetchContestProblems()
    }
  }, [contestId])

  useEffect(() => {
    // Update timer every second
    const timer = setInterval(() => {
      if (contest) {
        updateTimeRemaining()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [contest])

  useEffect(() => {
    // Fetch editorials when editorial tab is accessed and contest is ended
    if (activeTab === "editorial" && canViewEditorial() && editorials.length === 0) {
      fetchEditorials()
    }
  }, [activeTab, contest])

  const fetchContestProblems = async () => {
    try {
      console.log("🔍 Fetching contest problems for:", contestId)
      const response = await axios.get(`http://localhost:5000/api/contests/${contestId}/problems`)
      console.log("✅ Contest problems fetched:", response.data)
      setContest(response.data)
    } catch (error) {
      console.error("❌ Error fetching contest problems:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEditorials = async () => {
    if (!contest) return

    setLoadingEditorials(true)
    try {
      console.log("📚 Fetching editorials for contest problems")
      const editorialPromises = contest.problems.map((problem) =>
        axios.get(`http://localhost:5000/api/problems/${problem._id}/editorial`),
      )

      const responses = await Promise.all(editorialPromises)
      const editorialData = responses.map((response) => response.data)
      setEditorials(editorialData)
      console.log("✅ Editorials fetched:", editorialData.length)
    } catch (error) {
      console.error("❌ Error fetching editorials:", error)
    } finally {
      setLoadingEditorials(false)
    }
  }

  const updateTimeRemaining = () => {
    if (!contest) return

    const now = new Date()
    const end = new Date(contest.endTime)
    const diff = end.getTime() - now.getTime()

    if (diff <= 0) {
      setTimeRemaining("Contest Ended")
      return
    }

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    setTimeRemaining(
      `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
    )
  }

  const handleProblemClick = (problemId: string) => {
    console.log("🎯 Navigating to problem:", { contestId, problemId })
    navigate(`/contest/${contestId}/problem/${problemId}`)
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-100 text-green-800 border-green-200"
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "Hard":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const isProblemSolved = (problemId: string) => {
    if (!user || !contest) return false
    
    console.log('🔍 Checking if problem is solved:', {
      problemId,
      userId: user.id,
      participantsCount: contest.participants.length
    })
    
    const participant = contest.participants.find((p) => {
      const participantUserId = p.user._id || p.user.id || p.user
      const currentUserId = user.id || user._id
      console.log('👤 Comparing user IDs:', { participantUserId, currentUserId })
      return participantUserId.toString() === currentUserId.toString()
    })
    
    if (!participant) {
      console.log('❌ User not found in participants')
      return false
    }
    
    console.log('✅ Participant found:', {
      username: participant.user.username || 'N/A',
      submissionsCount: participant.submissions.length
    })
    
    const hasSolvedSubmission = participant.submissions.some((sub) => {
      const submissionProblemId = sub.problem._id || sub.problem
      const isSameProblem = submissionProblemId.toString() === problemId.toString()
      const hasScore = sub.score > 0
      
      console.log('📝 Checking submission:', {
        submissionProblemId,
        problemId,
        isSameProblem,
        score: sub.score,
        hasScore
      })
      
      return isSameProblem && hasScore
    })
    
    console.log('🎯 Problem solved status:', hasSolvedSubmission)
    return hasSolvedSubmission
  }

  const canViewEditorial = () => {
    return contest?.status === "ended" || getActualContestStatus() === "ended"
  }

  const getActualContestStatus = () => {
    if (!contest) return "ended"

    const now = new Date()
    const start = new Date(contest.startTime)
    const end = new Date(contest.endTime)

    if (now < start) return "upcoming"
    if (now >= start && now <= end) return "ongoing"
    return "ended"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading contest...</p>
        </div>
      </div>
    )
  }

  if (!contest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Contest not found</h2>
          <p className="text-gray-600">The contest you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  const actualStatus = getActualContestStatus()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Button variant="outline" size="sm" onClick={() => navigate("/contest")} className="flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contests
          </Button>
        </div>

        {/* Contest Header */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex-1">
                <CardTitle className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                  {contest.name}
                  {actualStatus === "ongoing" && (
                    <div className="ml-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                      LIVE
                    </div>
                  )}
                </CardTitle>
                <CardDescription className="text-gray-600 text-base">{contest.description}</CardDescription>
              </div>
              <div className="mt-4 md:mt-0 md:ml-6 text-right">
                <div className="text-sm text-gray-600 mb-1">Time Remaining</div>
                <div className={`text-3xl font-bold ${actualStatus === "ongoing" ? "text-red-600" : "text-gray-600"}`}>
                  {timeRemaining}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="flex items-center text-gray-600">
                <Timer className="h-5 w-5 mr-3 text-blue-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-500">Duration</p>
                  <p className="text-lg font-bold">{formatDuration(contest.duration)}</p>
                </div>
              </div>
              <div className="flex items-center text-gray-600">
                <Users className="h-5 w-5 mr-3 text-green-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-500">Participants</p>
                  <p className="text-lg font-bold">{contest.participants.length}</p>
                </div>
              </div>
              <div className="flex items-center text-gray-600">
                <Code className="h-5 w-5 mr-3 text-purple-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-500">Problems</p>
                  <p className="text-lg font-bold">{contest.problems.length}</p>
                </div>
              </div>
              <div className="flex items-center text-gray-600">
                <Trophy className="h-5 w-5 mr-3 text-yellow-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-500">Status</p>
                  <p className="text-lg font-bold capitalize">{actualStatus}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-lg p-2 inline-flex space-x-2">
            {[
              { id: "problems", label: "Problems", icon: <Code className="h-4 w-4" /> },
              { id: "rankings", label: "Rankings", icon: <Award className="h-4 w-4" /> },
              {
                id: "editorial",
                label: "Editorial",
                icon: <BookOpen className="h-4 w-4" />,
                disabled: !canViewEditorial(),
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                disabled={tab.disabled}
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                } ${tab.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {tab.icon}
                <span className="ml-2">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "problems" && (
          <div className="grid grid-cols-1 gap-6">
            {contest.problems
              .sort((a, b) => (a.order || 0) - (b.order || 0))
              .map((problem, index) => {
                const solved = isProblemSolved(problem._id)
                console.log('🎮 Rendering problem:', {
                  title: problem.title,
                  id: problem._id,
                  solved
                })
                
                return (
                  <Card
                    key={problem._id}
                    className={`hover:shadow-xl transition-all duration-300 cursor-pointer group ${
                      solved ? 'ring-2 ring-green-200 bg-green-50' : ''
                    }`}
                    onClick={() => handleProblemClick(problem._id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`flex items-center justify-center w-12 h-12 rounded-xl font-bold text-lg shadow-lg ${
                            solved 
                              ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                              : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                          }`}>
                            {solved ? '✓' : String.fromCharCode(65 + index)}
                          </div>
                          <div>
                            <h3 className={`text-xl font-bold flex items-center transition-colors ${
                              solved 
                                ? 'text-green-700 group-hover:text-green-600' 
                                : 'text-gray-900 group-hover:text-blue-600'
                            }`}>
                              {problem.title}
                              {solved && <CheckCircle className="h-6 w-6 text-green-600 ml-3" />}
                            </h3>
                            <div className="flex items-center space-x-4 mt-2">
                              <Badge className={getDifficultyColor(problem.difficulty)}>{problem.difficulty}</Badge>
                              <span className="text-sm text-gray-600 font-medium">Score: {problem.score} points</span>
                              {solved && (
                                <Badge className="bg-green-100 text-green-800 border-green-200">
                                  ✓ Solved
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <Button
                            variant={solved ? "success" : "outline"}
                            size="sm"
                            className={solved 
                              ? 'bg-green-600 hover:bg-green-700 text-white' 
                              : 'group-hover:bg-blue-50 group-hover:border-blue-300'
                            }
                            onClick={(e) => {
                              e.stopPropagation()
                              handleProblemClick(problem._id)
                            }}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            {solved ? 'Solved' : 'Solve Problem'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
          </div>
        )}

        {activeTab === "rankings" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <Award className="h-6 w-6 mr-3 text-yellow-500" />
                Live Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contest.participants
                  .sort((a, b) => b.score - a.score) // Sort by score descending
                  .map((participant, index) => (
                    <div
                      key={participant.user._id}
                      className={`flex items-center justify-between p-4 rounded-xl transition-all duration-200 ${
                        index < 3
                          ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 shadow-md"
                          : "bg-gray-50 hover:bg-gray-100"
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div
                          className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg shadow-md ${
                            index === 0
                              ? "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white"
                              : index === 1
                                ? "bg-gradient-to-r from-gray-300 to-gray-500 text-white"
                                : index === 2
                                  ? "bg-gradient-to-r from-orange-400 to-orange-600 text-white"
                                  : "bg-gradient-to-r from-blue-400 to-blue-600 text-white"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-bold text-lg text-gray-900">
                            {participant.user.username}
                            {participant.user._id === user?.id && (
                              <span className="ml-2 text-sm text-blue-600 font-medium">(You)</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {participant.submissions.filter((sub) => sub.score > 0).length} problems solved
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">{Math.round(participant.score)}</div>
                        <div className="text-sm text-gray-600">points</div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "editorial" && (
          <div className="space-y-8">
            {loadingEditorials ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading editorials...</p>
                </CardContent>
              </Card>
            ) : editorials.length > 0 ? (
              editorials.map((editorial, index) => (
                <Card key={editorial._id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center text-2xl">
                        <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-lg font-bold text-sm mr-3">
                          {String.fromCharCode(65 + index)}
                        </div>
                        {editorial.title}
                      </CardTitle>
                      <Badge className={getDifficultyColor(editorial.difficulty)}>{editorial.difficulty}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Editorial Content */}
                    {editorial.editorial?.written && (
                      <div>
                        <h4 className="text-lg font-semibold mb-3 text-gray-900">Solution Explanation</h4>
                        <div className="prose prose-lg max-w-none bg-gray-50 p-6 rounded-lg border">
                          <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                            {editorial.editorial.written}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Video Editorial */}
                    {editorial.editorial?.videoUrl && (
                      <div>
                        <h4 className="text-lg font-semibold mb-3 text-gray-900 flex items-center">
                          <Play className="h-5 w-5 mr-2" />
                          Video Solution
                        </h4>
                        <div className="bg-gray-100 p-4 rounded-lg">
                          <a
                            href={editorial.editorial.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Watch Video Solution
                            {editorial.editorial.duration && (
                              <span className="ml-2 text-sm text-gray-600">
                                ({Math.floor(editorial.editorial.duration / 60)}:
                                {(editorial.editorial.duration % 60).toString().padStart(2, "0")})
                              </span>
                            )}
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Reference Solutions */}
                    {editorial.referenceSolution && editorial.referenceSolution.length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold mb-3 text-gray-900 flex items-center">
                          <Code className="h-5 w-5 mr-2" />
                          Reference Solutions
                        </h4>
                        <div className="space-y-4">
                          {editorial.referenceSolution.map((solution, solutionIndex) => (
                            <div key={solutionIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                              <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                                <span className="font-semibold text-gray-700 capitalize">{solution.language}</span>
                              </div>
                              <pre className="p-4 bg-gray-50 text-sm font-mono overflow-x-auto">
                                <code>{solution.completeCode}</code>
                              </pre>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-2xl">
                    <BookOpen className="h-6 w-6 mr-3 text-blue-500" />
                    Contest Editorial
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-gray-500">
                    <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Editorial will be available after the contest ends</p>
                    <p className="text-sm mt-2">Check back later for detailed problem explanations and solutions</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ContestProblems