"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import axios from "axios"
import {
  Play,
  Send,
  Clock,
  MemoryStickIcon as Memory,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Trophy,
  Timer,
  Code,
  AlertCircle,
} from "lucide-react"
import SmartCodeEditor from "../components/SmartCodeEditor"

interface Problem {
  _id: string
  title: string
  description: string
  difficulty: string
  constraints: string
  examples: {
    input: string
    output: string
    explanation: string
  }[]
  testCases: {
    input: string
    output: string
    isPublic: boolean
  }[]
  codeTemplates: {
    [key: string]: string
  }
}

interface Contest {
  _id: string
  name: string
  endTime: string
  status: string
}

interface RunResult {
  status: string
  passedTests: number
  totalTests: number
  testResults: {
    input: string
    expectedOutput: string
    actualOutput: string
    passed: boolean
    executionTime: number
    memory: number
  }[]
  executionTime: number
  memory: number
  error?: string
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

const Button: React.FC<{
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
  variant?: "default" | "outline" | "success" | "danger"
  size?: "sm" | "default" | "lg"
}> = ({ children, onClick, disabled = false, className = "", variant = "default", size = "default" }) => {
  const baseClasses =
    "inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"

  const variantClasses = {
    default: "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg",
    outline: "border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400",
    success: "bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-md hover:shadow-lg",
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

const Badge: React.FC<{ children: React.ReactNode; className?: string; variant?: string }> = ({
  children,
  className = "",
  variant = "default",
}) => (
  <span
    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border bg-blue-100 text-blue-800 border-blue-200 ${className}`}
  >
    {children}
  </span>
)

const Select: React.FC<{
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
}> = ({ value, onValueChange, children }) => (
  <select
    value={value}
    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onValueChange(e.target.value)}
    className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
  >
    {children}
  </select>
)

const SelectOption: React.FC<{ value: string; children: React.ReactNode }> = ({ value, children }) => (
  <option value={value}>{children}</option>
)

const ContestProblemDetail: React.FC = () => {
  const { id, problemId } = useParams<{ id: string; problemId: string }>()
  console.log("🧩 URL params:", { id, problemId })
  const contestId = id
  const { user, token } = useAuth(); // ✅ Get token from auth context
  const navigate = useNavigate()
  const [problem, setProblem] = useState<Problem | null>(null)
  const [contest, setContest] = useState<Contest | null>(null)
  const [code, setCode] = useState("")
  const [language, setLanguage] = useState("cpp")
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const [submissionResult, setSubmissionResult] = useState<RunResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState("")
  const [tabSwitchCount, setTabSwitchCount] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (contestId && problemId) {
      console.log("🎯 Loading contest problem:", { contestId, problemId })
      setLoading(true)
      fetchContest()
    }
  }, [contestId, problemId])

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
    // Anti-cheat: Detect tab switching
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount((prev) => prev + 1)
        if (tabSwitchCount >= 2) {
          alert("Tab switching detected! This may affect your submission.")
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [tabSwitchCount])

  useEffect(() => {
    // Anti-cheat: Prevent pasting, copying, and right-click
    const preventActions = (e: Event) => {
      e.preventDefault()
      alert("Copy/paste operations are not allowed in contest mode!")
    }

    const preventRightClick = (e: MouseEvent) => {
      e.preventDefault()
      alert("Right-click is disabled in contest mode!")
    }

    const textarea = textareaRef.current
    if (textarea) {
      textarea.addEventListener("paste", preventActions)
      textarea.addEventListener("copy", preventActions)
      textarea.addEventListener("cut", preventActions)
      textarea.addEventListener("contextmenu", preventRightClick)

      return () => {
        textarea.removeEventListener("paste", preventActions)
        textarea.removeEventListener("copy", preventActions)
        textarea.removeEventListener("cut", preventActions)
        textarea.removeEventListener("contextmenu", preventRightClick)
      }
    }
  }, [])

  const fetchProblem = async () => {
    try {
      console.log("🔍 Fetching problem details for:", problemId)
      const response = await axios.get(`http://localhost:5000/api/problems/${problemId}`)
      console.log("✅ Problem details fetched:", response.data)
      setProblem(response.data)
      if (response.data?.codeTemplates) {
        setCode(response.data.codeTemplates[language] || "")
      }
    } catch (error) {
      console.error("❌ Error fetching problem:", error)
    }
  }

  const fetchContest = async () => {
    try {
      console.log("🔍 Fetching contest info for:", contestId)
      const response = await axios.get(`http://localhost:5000/api/contests/${contestId}/problem/${problemId}`)
      console.log("✅ Contest info fetched:", response.data)

      // Handle the response structure properly
      if (response.data.contest) {
        setContest(response.data.contest)
      }
      if (response.data.problem) {
        setProblem(response.data.problem)
        if (response.data.problem.codeTemplates) {
          setCode(response.data.problem.codeTemplates[language] || "")
        }
      }
    } catch (error) {
      console.error("❌ Error fetching contest:", error)
    } finally {
      setLoading(false)
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

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage)
    if (problem?.codeTemplates) {
      setCode(problem.codeTemplates[newLanguage] || "")
    }
  }

  const handleRun = async () => {
    if (!code.trim()) {
      alert("Please write some code before running!")
      return
    }

    if (!token) {
      alert('Please login to run code.');
      return;
    }

    setRunning(true)
    setRunResult(null)

    try {
      const response = await axios.post(`http://localhost:5000/api/problems/${problemId}/run`, {
        code,
        language,
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      setRunResult(response.data)
    } catch (error: any) {
      console.error("Error running code:", error)
      if (error.response?.status === 401) {
        alert('Authentication failed. Please login again.');
        return;
      }
      setRunResult({
        status: "Error",
        passedTests: 0,
        totalTests: 0,
        testResults: [],
        executionTime: 0,
        memory: 0,
        error: error.response?.data?.error || "Failed to run code",
      })
    } finally {
      setRunning(false)
    }
  }

  const handleSubmit = async () => {
    console.log('📤 Contest problem submit initiated');
    console.log('🔍 Current contest status:', contest?.status);
    console.log('🔍 Problem ID:', problemId);
    console.log('🔍 Contest ID:', contestId);
    console.log('🔍 User ID:', user?.id);
    console.log('🔍 Code length:', code.length);
    console.log('🔍 Language:', language);
    
    if (!code.trim()) {
      alert("Please write some code before submitting!")
      return
    }

    if (!token) {
      alert('Please login to submit solutions.');
      return;
    }

    if (contest?.status === "ended") {
      alert("Contest has ended. Submissions are no longer accepted.")
      return
    }

    setSubmitting(true)
    setSubmissionResult(null)

    try {
      console.log('🧪 Submitting code for contest problem...');
      console.log('📡 Making API call to submit problem solution...');
      const response = await axios.post(`http://localhost:5000/api/problems/${problemId}/submit`, {
        code,
        language,
      }, {
        headers: { 
          'Authorization': `Bearer ${token}`, // ✅ Use token from auth context
          'Content-Type': 'application/json'
        }
      })
      console.log('✅ Problem submission response:', response.data);
      setSubmissionResult(response.data)
      
      // If submission was successful, update contest score
      if (response.data.status === 'Accepted' && response.data.passedTests === response.data.totalTests) {
        console.log('🎉 All test cases passed, updating contest score...');
        console.log('📊 Submission details for contest update:', {
          contestId,
          problemId,
          passedTests: response.data.passedTests,
          totalTests: response.data.totalTests,
          timeSubmitted: new Date().toISOString()
        });
        try {
          const contestResponse = await axios.post(
            `http://localhost:5000/api/contests/${contestId}/submit/${problemId}`,
            {
              score: 100, // Base score, will be calculated dynamically on backend
              timeSubmitted: new Date().toISOString(),
              passedTests: response.data.passedTests,
              totalTests: response.data.totalTests
            },
            {
              headers: { 
                'Authorization': `Bearer ${token}`, // ✅ Use token from auth context
                'Content-Type': 'application/json'
              }
            }
          );
          console.log('✅ Contest score updated:', contestResponse.data);
          
          // Show success message with score details
          if (contestResponse.data.scoreAwarded) {
            alert(`🎉 Problem solved! You earned ${contestResponse.data.scoreAwarded} points!`);
          }
        } catch (contestError) {
          console.error('❌ Error updating contest score:', contestError);
          alert('Problem solved but failed to update contest score. Please contact support.');
        }
      } else {
        console.log('⚠️ Submission not fully successful:', {
          status: response.data.status,
          passedTests: response.data.passedTests,
          totalTests: response.data.totalTests
        });
      }
    } catch (error: any) {
      console.error("Error submitting solution:", error)
      console.error('📊 Submission error details:', error.response?.data);
      if (error.response?.status === 401) {
        alert('Authentication failed. Please login again.');
        return;
      }
      setSubmissionResult({
        status: "Error",
        passedTests: 0,
        totalTests: 0,
        testResults: [],
        executionTime: 0,
        memory: 0,
        error: error.response?.data?.error || "Submission failed",
      })
      alert(`Submission failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setSubmitting(false)
    }
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Accepted":
      case "Success":
        return "text-green-600"
      case "Wrong Answer":
      case "Failed":
        return "text-red-600"
      case "Compilation Error":
      case "Error":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Accepted":
      case "Success":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "Wrong Answer":
      case "Failed":
        return <XCircle className="h-5 w-5 text-red-600" />
      case "Compilation Error":
      case "Error":
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading problem...</p>
        </div>
      </div>
    )
  }

  console.log("Problem and contest loaded:", { problem, contest })

  if (!problem || !contest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Problem not found</h2>
          <p className="text-gray-600">The problem you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Contest Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/contest/${contestId}/problems`)}
                className="flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Contest
              </Button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">{contest.name}</h1>
                <p className="text-sm text-gray-600">{problem.title}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {tabSwitchCount > 0 && (
                <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
                  Tab switches: {tabSwitchCount}
                </Badge>
              )}
              <div className="flex items-center space-x-2">
                <Timer className="h-5 w-5 text-red-600" />
                <span className="text-xl font-bold text-red-600">{timeRemaining}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Problem Description Panel */}
          <Card className="h-fit">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-gray-900">{problem.title}</CardTitle>
                <Badge className={getDifficultyColor(problem.difficulty)}>{problem.difficulty}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-900">Problem Description</h3>
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg">
                  {problem.description}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-900">Examples</h3>
                {problem.examples.map((example, index) => (
                  <div key={index} className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="mb-3">
                      <strong className="text-sm font-semibold text-gray-700">Input:</strong>
                      <pre className="bg-white p-3 rounded-md mt-1 text-sm font-mono border border-gray-300">
                        {example.input}
                      </pre>
                    </div>
                    <div className="mb-3">
                      <strong className="text-sm font-semibold text-gray-700">Output:</strong>
                      <pre className="bg-white p-3 rounded-md mt-1 text-sm font-mono border border-gray-300">
                        {example.output}
                      </pre>
                    </div>
                    {example.explanation && (
                      <div>
                        <strong className="text-sm font-semibold text-gray-700">Explanation:</strong>
                        <p className="mt-1 text-sm text-gray-600 bg-blue-50 p-2 rounded-md">{example.explanation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-900">Constraints</h3>
                <div className="whitespace-pre-wrap text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  {problem.constraints}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Code Editor Panel */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Code className="h-5 w-5 mr-2" />
                  Code Editor
                </CardTitle>
                <Select value={language} onValueChange={handleLanguageChange}>
                  <SelectOption value="cpp">C++20</SelectOption>
                  <SelectOption value="java">Java</SelectOption>
                  <SelectOption value="python">Python</SelectOption>
                  <SelectOption value="c">C</SelectOption>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <SmartCodeEditor
                  value={code}
                  onChange={setCode}
                  language={language}
                  disabled={contest.status === "ended"}
                  placeholder="Write your code here..."
                  className="h-96"
                  contestMode={true} // Enable contest mode restrictions
                />
                <div className="absolute bottom-2 right-2 bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold">
                  Copy/Paste Disabled
                </div>
              </div>

              <div className="flex space-x-4">
                <Button
                  onClick={handleRun}
                  disabled={running}
                  variant="outline"
                  className="flex items-center bg-transparent"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {running ? "Running..." : "Run Code"}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || contest.status === "ended"}
                  variant="success"
                  className="flex items-center"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {submitting ? "Submitting..." : "Submit Solution"}
                </Button>
              </div>

              {/* Results Panel */}
              <Card className="bg-gray-50">
                <CardHeader>
                  <CardTitle className="text-lg">Console Output</CardTitle>
                </CardHeader>
                <CardContent className="h-80 overflow-y-auto">
                  {runResult && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(runResult.status)}
                          <span className={`font-semibold text-lg ${getStatusColor(runResult.status)}`}>
                            {runResult.status}
                          </span>
                        </div>
                        <span className="text-sm text-gray-600 font-medium">
                          Passed: {runResult.passedTests}/{runResult.totalTests} test cases
                        </span>
                      </div>

                      {runResult.error ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <div className="text-red-800 font-semibold mb-2">Error:</div>
                          <div className="text-red-700 text-sm font-mono bg-red-100 p-2 rounded">{runResult.error}</div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {runResult.testResults.slice(0, 3).map((result, index) => (
                            <div
                              key={index}
                              className={`border-2 rounded-lg p-3 ${
                                result.passed ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-sm">Test Case {index + 1}</span>
                                <div className="flex items-center space-x-3 text-xs text-gray-600">
                                  <span className="flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {result.executionTime}ms
                                  </span>
                                  <span className="flex items-center">
                                    <Memory className="h-3 w-3 mr-1" />
                                    {result.memory}MB
                                  </span>
                                </div>
                              </div>
                              {!result.passed && (
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                  <div>
                                    <div className="font-semibold text-gray-700 mb-1">Expected:</div>
                                    <pre className="bg-white p-2 rounded text-xs border">{result.expectedOutput}</pre>
                                  </div>
                                  <div>
                                    <div className="font-semibold text-gray-700 mb-1">Your Output:</div>
                                    <pre className="bg-white p-2 rounded text-xs border">{result.actualOutput}</pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {submissionResult && (
                    <div className="space-y-4 border-t-2 pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(submissionResult.status)}
                          <span className={`font-bold text-lg ${getStatusColor(submissionResult.status)}`}>
                            Final Result: {submissionResult.status}
                          </span>
                        </div>
                        <span className="text-sm text-gray-600 font-medium">
                          {submissionResult.passedTests}/{submissionResult.totalTests} test cases passed
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center bg-blue-50 p-3 rounded-lg">
                          <Clock className="h-5 w-5 text-blue-500 mr-2" />
                          <div>
                            <div className="text-sm text-gray-600">Runtime</div>
                            <div className="font-bold text-blue-600">{submissionResult.executionTime}ms</div>
                          </div>
                        </div>
                        <div className="flex items-center bg-purple-50 p-3 rounded-lg">
                          <Memory className="h-5 w-5 text-purple-500 mr-2" />
                          <div>
                            <div className="text-sm text-gray-600">Memory</div>
                            <div className="font-bold text-purple-600">{submissionResult.memory}MB</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {!runResult && !submissionResult && (
                    <div className="text-center py-12 text-gray-500">
                      <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">Run your code to see the output here...</p>
                      <p className="text-sm mt-2">Test your solution before submitting</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default ContestProblemDetail
