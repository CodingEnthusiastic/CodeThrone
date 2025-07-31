"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { useTheme } from "../contexts/ThemeContext"
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
import CodeMirrorEditor from "../components/CodeMirrorEditor"
import { API_URL, SOCKET_URL } from "../config/api";

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
  <div className={`bg-white rounded-xl shadow-lg border border-gray-100 transition-all duration-300 hover:shadow-xl hover:border-blue-400
               dark:bg-gray-800 dark:border-gray-700 dark:hover:border-blue-500 ${className}`}>
    {children}
  </div>
)

const CardHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="p-6 pb-4">{children}</div>

const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`p-6 pt-0 ${className}`}>{children}</div>
)

const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <h3 className={`text-2xl font-extrabold leading-tight tracking-tight text-gray-900 dark:text-gray-50 ${className}`}>{children}</h3>
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
    "inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none transform hover:scale-105 active:scale-95"

  const variantClasses = {
    default: "bg-blue-600 text-white hover:bg-blue-700 shadow-md",
    outline: "border-2 border-blue-400 bg-white text-blue-700 hover:bg-blue-50 hover:border-blue-500 dark:border-blue-500 dark:bg-transparent dark:text-blue-300 dark:hover:bg-blue-900/20 dark:hover:border-blue-600",
    success: "bg-green-600 text-white hover:bg-green-700 shadow-md",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-md",
  }

  const sizeClasses = {
    sm: "h-9 px-4 text-sm",
    default: "h-11 px-6 text-base",
    lg: "h-12 px-8 text-lg",
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
}) => {
  const variantClasses = {
    default: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600",
    success: "bg-green-100 text-green-800 border-green-200 dark:bg-green-700 dark:text-green-100 dark:border-green-600",
    warning: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-700 dark:text-yellow-100 dark:border-yellow-600",
    danger: "bg-red-100 text-red-800 border-red-200 dark:bg-red-700 dark:text-red-100 dark:border-red-600",
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${variantClasses[variant as keyof typeof variantClasses]} ${className}`}
    >
      {children}
    </span>
  )
}

const Select: React.FC<{
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
}> = ({ value, onValueChange, children }) => (
  <select
    value={value}
    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onValueChange(e.target.value)}
    className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer hover:border-blue-400 bg-white text-gray-900
               dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:border-blue-400"
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
  const { user, token } = useAuth();
  const { isDark } = useTheme()
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
  const editorRef = useRef<HTMLDivElement>(null); // Ref for the editor container to attach event listeners

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
    // Anti-cheat: Prevent pasting, copying, and right-click specifically on the editor area
    const preventActions = (e: Event) => {
      e.preventDefault()
      alert("Copy/paste operations are not allowed in contest mode!")
    }

    const preventRightClick = (e: MouseEvent) => {
      e.preventDefault()
      alert("Right-click is disabled in contest mode!")
    }

    const editorElement = editorRef.current;
    if (editorElement) {
      editorElement.addEventListener("paste", preventActions);
      editorElement.addEventListener("copy", preventActions);
      editorElement.addEventListener("cut", preventActions);
      editorElement.addEventListener("contextmenu", preventRightClick);

      return () => {
        editorElement.removeEventListener("paste", preventActions);
        editorElement.removeEventListener("copy", preventActions);
        editorElement.removeEventListener("cut", preventActions);
        editorElement.removeEventListener("contextmenu", preventRightClick);
      };
    }
  }, []);

  const fetchProblem = async () => {
    try {
      console.log("🔍 Fetching problem details for:", problemId)
      const response = await axios.get(`${API_URL}/problems/${problemId}`)
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
      const response = await axios.get(`${API_URL}/contests/${contestId}/problem/${problemId}`)
      console.log("✅ Contest info fetched:", response.data)

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
      const response = await axios.post(`${API_URL}/problems/${problemId}/run`, {
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
      const response = await axios.post(`${API_URL}/problems/${problemId}/submit`, {
        code,
        language,
      }, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      console.log('✅ Problem submission response:', response.data);
      setSubmissionResult(response.data)
      
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
            `${API_URL}/contests/${contestId}/submit/${problemId}`,
            {
              score: 100,
              timeSubmitted: new Date().toISOString(),
              passedTests: response.data.passedTests,
              totalTests: response.data.totalTests
            },
            {
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          console.log('✅ Contest score updated:', contestResponse.data);
          
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
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-700 dark:text-green-100 dark:border-green-600"
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-700 dark:text-yellow-100 dark:border-yellow-600"
      case "Hard":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-700 dark:text-red-100 dark:border-red-600"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Accepted":
      case "Success":
        return "text-green-600 dark:text-green-400"
      case "Wrong Answer":
      case "Failed":
        return "text-red-600 dark:text-red-400"
      case "Compilation Error":
      case "Error":
        return "text-red-600 dark:text-red-400"
      default:
        return "text-gray-600 dark:text-gray-400"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Accepted":
      case "Success":
        return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
      case "Wrong Answer":
      case "Failed":
        return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
      case "Compilation Error":
      case "Error":
        return <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
      default:
        return <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
    }
  }

  if (loading) {
    if (isDark) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-br from-blue-900 via-purple-900 to-gray-900 blur-2xl opacity-60"></div>
              <div className="relative z-10 flex items-center justify-center">
                <Trophy className="h-20 w-20 text-yellow-400 animate-bounce drop-shadow-lg" />
              </div>
            </div>
            <div className="bg-gray-800/80 rounded-xl shadow-2xl p-8 border border-gray-700 max-w-xs mx-auto">
              <p className="text-lg font-bold text-yellow-300 mb-2">Loading Problem...</p>
              <p className="text-gray-300 mb-4">Please wait while we fetch the contest problem details.</p>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-yellow-400 border-t-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      )
    }
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium text-lg dark:text-gray-300">Loading problem details and contest info...</p>
        </div>
      </div>
    )
  }

  console.log("Problem and contest loaded:", { problem, contest })

  if (!problem || !contest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center dark:bg-gray-950">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4 dark:text-gray-100">Problem or Contest Not Found</h2>
          <p className="text-gray-700 text-lg dark:text-gray-300">The problem or contest you're looking for doesn't exist or is inaccessible.</p>
          <Button onClick={() => navigate('/')} className="mt-8">Go to Homepage</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 font-sans text-gray-900 dark:bg-gray-900 dark:from-gray-950 dark:to-gray-800 dark:text-gray-100">
      {/* Animated Backgrounds (from Discussion.tsx) */}
      {/* Dark Mode Galaxy Animation */}
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
      {/* Dark mode background */}
      <div className="dark:block hidden fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/4 left-1/6 w-96 h-96 bg-gradient-to-br from-purple-900/20 to-blue-900/20 nebula-pulse rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/6 w-80 h-80 bg-gradient-to-br from-indigo-900/20 to-violet-900/20 nebula-pulse rounded-full blur-3xl" style={{ animationDelay: '7s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-br from-cyan-900/15 to-teal-900/15 nebula-pulse rounded-full blur-2xl" style={{ animationDelay: '3s' }}></div>
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
      {/* Light mode background */}
      <div className="dark:hidden block fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/5 left-1/4 w-80 h-80 aurora-glow rounded-full blur-3xl opacity-40"></div>
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 aurora-glow rounded-full blur-3xl opacity-30" style={{ animationDelay: '4s' }}></div>
        <div className="absolute top-2/3 left-1/6 w-64 h-64 aurora-glow rounded-full blur-2xl opacity-35" style={{ animationDelay: '8s' }}></div>
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

      {/* Contest Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm py-4 dark:bg-gray-800 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                <h1 className="text-xl font-extrabold text-gray-900 dark:text-gray-50">{contest.name}</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">{problem.title}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {tabSwitchCount > 0 && (
                <Badge variant="danger" className="animate-pulse">
                  Tab switches: {tabSwitchCount}
                </Badge>
              )}
              <div className="flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-lg shadow-inner text-blue-600
                          dark:bg-blue-900/30 dark:border dark:border-blue-700 dark:text-blue-400">
                <Timer className="h-5 w-5" />
                <span className="text-xl font-bold">{timeRemaining}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Problem Description Panel */}
          <Card className="h-fit">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{problem.title}</CardTitle>
                <Badge className={getDifficultyColor(problem.difficulty)}>{problem.difficulty}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center dark:text-gray-50">
                  <Code className="h-5 w-5 mr-2 text-blue-500 dark:text-blue-400" />
                  Problem Description
                </h3>
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-inner
                            dark:text-gray-200 dark:bg-gray-800 dark:border-gray-700">
                  {problem.description}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center dark:text-gray-50">
                  <Play className="h-5 w-5 mr-2 text-green-500 dark:text-green-400" />
                  Examples
                </h3>
                {problem.examples.map((example, index) => (
                  <div key={index} className="mb-6 p-5 bg-white rounded-xl border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md
                              dark:bg-gray-700 dark:border-gray-600">
                    <div className="mb-4">
                      <strong className="text-sm font-bold text-gray-700 block mb-2 dark:text-gray-200">Input:</strong>
                      <pre className="bg-gray-100 p-3 rounded-lg text-sm font-mono border border-gray-300 overflow-x-auto
                                  dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100">
                        {example.input}
                      </pre>
                    </div>
                    <div className="mb-4">
                      <strong className="text-sm font-bold text-gray-700 block mb-2 dark:text-gray-200">Output:</strong>
                      <pre className="bg-gray-100 p-3 rounded-lg text-sm font-mono border border-gray-300 overflow-x-auto
                                  dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100">
                        {example.output}
                      </pre>
                    </div>
                    {example.explanation && (
                      <div>
                        <strong className="text-sm font-bold text-gray-700 block mb-2 dark:text-gray-200">Explanation:</strong>
                        <p className="mt-1 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200
                                  dark:text-gray-300 dark:bg-blue-900/20 dark:border-blue-700">
                          {example.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center dark:text-gray-50">
                  <AlertCircle className="h-5 w-5 mr-2 text-orange-500 dark:text-orange-400" />
                  Constraints
                </h3>
                <div className="whitespace-pre-wrap text-gray-700 bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-inner
                            dark:text-gray-200 dark:bg-gray-800 dark:border-gray-700">
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
                  <Code className="h-6 w-6 mr-2 text-blue-600 dark:text-blue-500" />
                  Code Editor
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Select value={language} onValueChange={handleLanguageChange}>
                    <SelectOption value="cpp">C++20</SelectOption>
                    <SelectOption value="java">Java</SelectOption>
                    <SelectOption value="python">Python</SelectOption>
                    <SelectOption value="c">C</SelectOption>
                  </Select>
                  {/* Reset Code Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2"
                    onClick={() => {
                      if (problem?.codeTemplates) {
                        setCode(problem.codeTemplates[language] || "");
                      }
                    }}
                  >
                    Reset Code
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="relative" ref={editorRef}> {/* Attach ref here */}
                <CodeMirrorEditor
                  value={code}
                  onChange={setCode}
                  language={language}
                  disabled={contest.status === "ended"}
                  className="h-96 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600"
                  contestMode={true}
                  height="384px"
                />
                <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-bounce-slow
                            dark:bg-red-700">
                  Copy/Paste Disabled
                </div>
              </div>

              <div className="flex space-x-4">
                <Button
                  onClick={handleRun}
                  disabled={running}
                  variant="outline"
                  className="flex-1"
                >
                  <Play className="h-5 w-5 mr-2" />
                  {running ? "Running..." : "Run Code"}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || contest.status === "ended"}
                  variant="success"
                  className="flex-1"
                >
                  <Send className="h-5 w-5 mr-2" />
                  {submitting ? "Submitting..." : "Submit Solution"}
                </Button>
              </div>

              {/* Results Panel */}
              <Card className="bg-gray-50 border-dashed border-gray-200 dark:bg-gray-800 dark:border-dashed dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl text-gray-800 dark:text-gray-50">Console Output</CardTitle>
                </CardHeader>
                <CardContent className="h-96 overflow-y-auto custom-scrollbar">
                  {running && (
                    <div className="text-center py-16 text-gray-600 dark:text-gray-400">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                      <p className="font-semibold text-lg dark:text-gray-400">Executing code...</p>
                      <p className="text-sm mt-2 text-gray-500">Please wait for the results.</p>
                    </div>
                  )}
                  {submitting && (
                    <div className="text-center py-16 text-gray-600 dark:text-gray-400">
                      <div className="animate-bounce-slow rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mx-auto mb-4"></div>
                      <p className="font-semibold text-lg dark:text-gray-400">Submitting solution...</p>
                      <p className="text-sm mt-2 text-gray-500">Evaluating against all test cases.</p>
                    </div>
                  )}

                  {runResult && !running && (
                    <div className="space-y-5 animate-fade-in">
                      <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(runResult.status)}
                          <span className={`font-extrabold text-xl ${getStatusColor(runResult.status)}`}>
                            {runResult.status}
                          </span>
                        </div>
                        <Badge variant={runResult.passedTests === runResult.totalTests ? "success" : "danger"}>
                          Passed: {runResult.passedTests}/{runResult.totalTests} test cases
                        </Badge>
                      </div>

                      {runResult.error ? (
                        <div className="bg-red-100 border border-red-300 rounded-lg p-4 shadow-sm animate-fade-in
                                    dark:bg-red-900/50 dark:border-red-700">
                          <div className="text-red-800 font-bold mb-2 flex items-center dark:text-red-300">
                            <AlertCircle className="h-5 w-5 mr-2" /> Error:
                          </div>
                          <pre className="text-red-700 text-sm font-mono bg-red-50 p-3 rounded border border-red-200 overflow-x-auto
                                      dark:text-red-200 dark:bg-red-900/30 dark:border-red-700">
                            {runResult.error}
                          </pre>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {runResult.testResults.slice(0, 3).map((result, index) => (
                            <div
                              key={index}
                              className={`border-2 rounded-xl p-4 shadow-sm transition-all duration-200 ${
                                result.passed ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/30" : "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/30"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <span className="font-bold text-sm text-gray-800 dark:text-gray-100">Test Case {index + 1}</span>
                                <div className="flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-400">
                                  <span className="flex items-center">
                                    <Clock className="h-4 w-4 mr-1 text-gray-500" />
                                    {result.executionTime}ms
                                  </span>
                                  <span className="flex items-center">
                                    <Memory className="h-4 w-4 mr-1 text-gray-500" />
                                    {result.memory}MB
                                  </span>
                                </div>
                              </div>
                              {!result.passed && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mt-2">
                                  <div>
                                    <div className="font-semibold text-gray-700 mb-1 dark:text-gray-300">Expected Output:</div>
                                    <pre className="bg-white p-3 rounded-md text-xs border border-gray-300 overflow-x-auto max-h-24
                                                dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100">
                                      {result.expectedOutput}
                                    </pre>
                                  </div>
                                  <div>
                                    <div className="font-semibold text-gray-700 mb-1 dark:text-gray-300">Your Output:</div>
                                    <pre className="bg-white p-3 rounded-md text-xs border border-gray-300 overflow-x-auto max-h-24
                                                dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100">
                                      {result.actualOutput}
                                    </pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                           {runResult.totalTests > 3 && (
                              <p className="text-center text-sm text-gray-500 mt-4 dark:text-gray-400">
                                  And {runResult.totalTests - 3} more test cases...
                              </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {submissionResult && !submitting && (
                    <div className="space-y-5 border-t-2 border-blue-200 pt-5 mt-5 animate-fade-in dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(submissionResult.status)}
                          <span className={`font-extrabold text-xl ${getStatusColor(submissionResult.status)}`}>
                            Final Result: {submissionResult.status}
                          </span>
                        </div>
                        <Badge variant={submissionResult.passedTests === submissionResult.totalTests ? "success" : "danger"}>
                          {submissionResult.passedTests}/{submissionResult.totalTests} test cases passed
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-200
                                    dark:bg-blue-900/30 dark:border dark:border-blue-700">
                          <Clock className="h-6 w-6 mr-3 text-blue-500 dark:text-blue-400" />
                          <div>
                            <div className="text-sm text-gray-600 font-medium dark:text-gray-300">Runtime</div>
                            <div className="font-bold text-blue-700 text-lg dark:text-blue-300">{submissionResult.executionTime}ms</div>
                          </div>
                        </div>
                        <div className="flex items-center bg-purple-50 p-4 rounded-lg shadow-sm border border-purple-200
                                    dark:bg-purple-900/30 dark:border dark:border-purple-700">
                          <Memory className="h-6 w-6 mr-3 text-purple-500 dark:text-purple-400" />
                          <div>
                            <div className="text-sm text-gray-600 font-medium dark:text-gray-300">Memory</div>
                            <div className="font-bold text-purple-700 text-lg dark:text-purple-300">{submissionResult.memory}MB</div>
                          </div>
                        </div>
                      </div>
                      {submissionResult.error && (
                        <div className="bg-red-100 border border-red-300 rounded-lg p-4 shadow-sm animate-fade-in
                                    dark:bg-red-900/50 dark:border-red-700">
                          <div className="text-red-800 font-bold mb-2 flex items-center dark:text-red-300">
                            <AlertCircle className="h-5 w-5 mr-2" /> Submission Error:
                          </div>
                          <pre className="text-red-700 text-sm font-mono bg-red-50 p-3 rounded border border-red-200 overflow-x-auto
                                      dark:text-red-200 dark:bg-red-900/30 dark:border-red-700">
                            {submissionResult.error}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                  {!runResult && !submissionResult && !running && !submitting && (
                    <div className="text-center py-16 text-gray-400">
                      <Trophy className="h-16 w-16 mx-auto mb-5 opacity-40 text-blue-400 animate-float dark:text-blue-600" />
                      <p className="font-semibold text-lg text-gray-600 dark:text-gray-400">Run your code to see the output here!</p>
                      <p className="text-sm mt-2 text-gray-500">
                        Test your solution against example cases before a final submission.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tailwind CSS custom animations (add to your global CSS or in a style block if using Next.js/similar) */}
      <style jsx>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }

        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(-5px); }
          50% { transform: translateY(0); }
          75% { transform: translateY(-2px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 4s infinite;
        }

        /* Custom Scrollbar for Light Mode */
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1; /* Tailwind gray-300 */
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8; /* Tailwind gray-400 */
        }

        /* Custom Scrollbar for Dark Mode */
        .dark .custom-scrollbar::-webkit-scrollbar-track {
          background: #374151; /* gray-700 */
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4b5563; /* gray-600 */
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #6b7280; /* gray-500 */
        }
      `}</style>
    </div>
  )
}

export default ContestProblemDetail
