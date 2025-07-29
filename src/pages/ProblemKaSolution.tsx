"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useParams } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import axios from "axios"
import {
  Play,
  Send,
  Clock,
  MemoryStickIcon as Memory,
  CheckCircle,
  XCircle,
  BookOpen,
  Video,
  Code,
  FileText,
  MessageSquare,
  Bot,
  Eye,
  Calendar,
  User,
  Copy,
  Maximize2,
  Minimize2,
  History,
  Plus,
  ArrowLeft,
  Zap, // For complexity analysis
  GraduationCap, // For visualizer
} from "lucide-react"
import CodeMirrorEditor from "../components/CodeMirrorEditor"
import { API_URL } from "../config/api"
import confetti from "canvas-confetti";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";


interface Problem {
  _id: string
  title: string
  description: string
  difficulty: string
  tags: string[]
  companies: string[]
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
  acceptanceRate: number
  submissions: number
  accepted: number
  editorial?: {
    written?: string
    videoUrl?: string
    thumbnailUrl?: string
    duration?: number
  }
  codeTemplates?: Record<string, string>
}

interface Submission {
  _id: string
  status: string
  language: string
  runtime: number
  memory: number
  date: string
  code?: string
}

interface Solution {
  language: string
  completeCode: string
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
  potd?: {
    awarded: boolean
    coinsEarned: number
    totalCoins: number
    reason: string
  }
}

// Helper component for user chat bubbles
function UserChatBubble({ message }: { message: string }) {
  return (
    <div className="flex justify-end mb-4">
      <div className="max-w-3xl bg-blue-100 dark:bg-blue-900/50 text-gray-900 dark:text-gray-100 p-3 rounded-xl shadow-md">
        <div className="flex items-center mb-1">
          <User className="h-4 w-4 mr-2 text-blue-800 dark:text-blue-200" />
          <span className="text-sm font-medium">You</span>
        </div>
        <div className="text-sm whitespace-pre-wrap break-words">
          {message}
        </div>
      </div>
    </div>
  );
}

function AnimatedAiResponse({ response }: { response: string }) {
  const [displayed, setDisplayed] = useState("")

  useEffect(() => {
    let i = 0
    setDisplayed("") // Reset displayed when response changes
    const interval = setInterval(() => {
      if (i < response.length) {
        setDisplayed((prev) => prev + response[i])
        i++
      } else {
        clearInterval(interval)
      }
    }, 12)

    return () => clearInterval(interval)
  }, [response])

  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-3xl bg-blue-50 dark:bg-blue-900/30 text-gray-900 dark:text-gray-100 p-3 rounded-xl shadow-md">
        <div className="flex items-center mb-1">
          <Bot className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium">AI Assistant</span>
        </div>
        <div
          className="text-sm whitespace-pre-wrap break-words"
          dangerouslySetInnerHTML={{
            __html: displayed.replace(
              /\*\*(.*?)\*\*/g,
              "<strong class='font-bold text-gray-900 dark:text-gray-100'>$1</strong>",
            ),
          }}
        />
      </div>
    </div>
  )
}

const ProblemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user, token, updateCoins } = useAuth()
  const [problem, setProblem] = useState<Problem | null>(null)
  const [code, setCode] = useState("")
  const [language, setLanguage] = useState("cpp")
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const [submissionResult, setSubmissionResult] = useState<RunResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("description")
  const [editorial, setEditorial] = useState<any>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [solutions, setSolutions] = useState<Solution[]>([])
  const [isSolved, setIsSolved] = useState(false)
  const [tabSwitchCount, setTabSwitchCount] = useState(0)
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [aiPrompt, setAiPrompt] = useState("")
  const [currentAnimatingAiResponse, setCurrentAnimatingAiResponse] = useState<string>("") // Changed from aiResponse
  const [aiLoading, setAiLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState<{ prompt: string; response: string }[]>([])
  const [isAiMaximized, setIsAiMaximized] = useState(false)
  const [isCodeEditorMaximized, setIsCodeEditorMaximized] = useState(false)
  const chatHistoryRef = useRef<HTMLDivElement>(null)
  const [showAcceptedCard, setShowAcceptedCard] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate();
  // New state variables for complexity analysis
  const [isComplexityAiMaximized, setIsComplexityAiMaximized] = useState(false);
  const [complexityCodeInput, setComplexityCodeInput] = useState("");
  const [complexityAiResponse, setComplexityAiResponse] = useState("");
  const [complexityAiLoading, setComplexityAiLoading] = useState(false);
  const [complexityChatHistory, setComplexityChatHistory] = useState<{ prompt: string; response: string }[]>([]);

  // New state variable for visualizer
  const [isVisualizerMaximized, setIsVisualizerMaximized] = useState(false);


  // Auto-scroll chat to bottom in both minimized and maximized mode when new answer appears
  useEffect(() => {
    if (chatHistoryRef.current) {
      requestAnimationFrame(() => {
        chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight
      })
    }
  }, [chatHistory, currentAnimatingAiResponse, isAiMaximized]) // Updated dependency to currentAnimatingAiResponse

  // Manual scroll to bottom handler
  const scrollChatToBottom = () => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight
    }
  }

  const [allChatHistory, setAllChatHistory] = useState<
    {
      sessionId: string
      problemId: string
      problemTitle: string
      date: string
      lastMessage: string
      messageCount: number
      updatedAt: string
    }[]
  >([])
  const [selectedHistorySession, setSelectedHistorySession] = useState<string | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string>("")
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Predefined quick prompts for better user experience
  const quickPrompts = [
    "What's the optimal approach to solve this problem?",
    "What data structures should I use?",
    "Can you explain the algorithm with time complexity?",
    "What are the edge cases I should consider?",
    "How can I optimize my solution?",
    "Explain the problem with an example",
    "What are common mistakes to avoid?",
  ]

  // Generate contextual prompts based on problem
  const getContextualPrompts = () => {
    if (!problem) return quickPrompts

    const contextualPrompts = [...quickPrompts]

    // Add difficulty-specific prompts
    if (problem.difficulty === "Hard") {
      contextualPrompts.push("Break down this complex problem into smaller subproblems")
      contextualPrompts.push("What advanced algorithms are applicable here?")
    } else if (problem.difficulty === "Easy") {
      contextualPrompts.push("What's the simplest approach to solve this?")
    }

    // Add tag-specific prompts
    if (problem.tags?.includes("Dynamic Programming")) {
      contextualPrompts.push("How can I identify the DP pattern here?")
      contextualPrompts.push("What's the recurrence relation?")
    }
    if (problem.tags?.includes("Graph")) {
      contextualPrompts.push("Should I use DFS or BFS for this graph problem?")
    }
    if (problem.tags?.includes("Tree")) {
      contextualPrompts.push("What tree traversal method should I use?")
    }
    if (problem.tags?.includes("Array")) {
      contextualPrompts.push("Are there any array manipulation techniques I should consider?")
    }

    return contextualPrompts
  }

  // Load chat history from database
  useEffect(() => {
    if (user) {
      loadUserChatHistory()
    }
  }, [user])

  // Generate unique session ID
  const generateSessionId = () => {
    return `${problem?._id}_${user?.username}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Initialize session when problem loads
  useEffect(() => {
    if (problem && user && !currentSessionId) {
      setCurrentSessionId(generateSessionId())
    }
  }, [problem, user])

  // Load user's chat history from database
  const loadUserChatHistory = async () => {
    try {
      setLoadingHistory(true)
      const response = await axios.get(`${API_URL}/chat/history`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      setAllChatHistory(response.data)
    } catch (error) {
      console.error("Error loading chat history:", error)
    } finally {
      setLoadingHistory(false)
    }
  }

  // Save chat message to database
  const saveChatMessage = async (prompt: string, response: string) => {
    try {
      const sessionId = currentSessionId || generateSessionId()
      if (!currentSessionId) {
        setCurrentSessionId(sessionId)
      }

      await axios.post(
        `${API_URL}/chat/save`,
        {
          sessionId,
          problemId: problem?._id,
          problemTitle: problem?.title,
          prompt,
          response,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      )

      // Refresh history to show new message
      loadUserChatHistory()
    } catch (error) {
      console.error("Error saving chat message:", error)
    }
  }

  // Load a previous chat session
  const loadChatSession = async (sessionId: string) => {
    try {
      setLoadingHistory(true)
      const response = await axios.get(`${API_URL}/chat/session/${sessionId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      const session = response.data
      setChatHistory(session.messages || [])
      setSelectedHistorySession(sessionId)
      setCurrentSessionId(sessionId)
      setCurrentAnimatingAiResponse(session.messages?.length > 0 ? session.messages[session.messages.length - 1].response : "")
    } catch (error) {
      console.error("Error loading chat session:", error)
    } finally {
      setLoadingHistory(false)
    }
  }

  // Clear current chat and start fresh
  const startNewChat = () => {
    setChatHistory([])
    setCurrentAnimatingAiResponse("") // Clear current animating response
    setSelectedHistorySession(null)
    setCurrentSessionId(generateSessionId())
  }

  // Toggle AI maximized view
  const toggleAiMaximized = () => {
    setIsAiMaximized(!isAiMaximized)
  }

  // Toggle Code Editor maximized view
  const toggleCodeEditorMaximized = () => {
    setIsCodeEditorMaximized(!isCodeEditorMaximized)
  }

  // Toggle Complexity Analysis AI maximized view
  const toggleComplexityAiMaximized = () => {
    setIsComplexityAiMaximized(!isComplexityAiMaximized);
    // When opening, pre-fill with current code
    if (!isComplexityAiMaximized) {
      setComplexityCodeInput(code);
      setComplexityAiResponse(""); // Clear previous response
      setComplexityChatHistory([]); // Clear previous chat history
    }
  };

  // Toggle DSA Visualizer maximized view
  const toggleVisualizerMaximized = () => {
    setIsVisualizerMaximized(!isVisualizerMaximized);
  };

  // Handle DSA Visualizer button click
  const handleDsaVisualizerClick = () => {
    setIsVisualizerMaximized(true);
  };

  // Copy to clipboard function
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert("Code copied to clipboard!")
    } catch (err) {
      console.error("Failed to copy text: ", err)
      const textArea = document.createElement("textarea")
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      try {
        document.execCommand("copy")
        alert("Code copied to clipboard!")
      } catch (fallbackErr) {
        console.error("Fallback copy failed: ", fallbackErr)
        alert("Failed to copy code")
      }
      document.body.removeChild(textArea)
    }
  }

  useEffect(() => {
    if (id) {
      fetchProblem()
      if (user) {
        checkIfSolved()
      }
    }
  }, [id, user])

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
    // Anti-cheat: Prevent pasting
    const preventPaste = (e: Event) => {
      e.preventDefault()
      alert("Pasting is not allowed in coding challenges!")
    }

    const textarea = textareaRef.current
    if (textarea) {
      textarea.addEventListener("paste", preventPaste)
      return () => textarea.removeEventListener("paste", preventPaste)
    }
  }, [])

  const fetchProblem = async () => {
    try {
      const response = await axios.get(`${API_URL}/problems/${id}`)
      setProblem(response.data)
      setCode(response.data.codeTemplates?.[language] || "")
    } catch (error) {
      console.error("Error fetching problem:", error)
    } finally {
      setLoading(false)
    }
  }

  const generateResponse = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Please enter a prompt.", {
        icon: "💡",
        style: {
          borderRadius: "10px",
          background: "#333",
          color: "#fff",
        },
      });
      return
    }

    if (!token) {
      toast.error("Please login to use AI chat feature.", {
        icon: "🔑",
        style: {
          borderRadius: "10px",
          background: "#333",
          color: "#fff",
        },
      });
      return
    }

    if (!problem) {
      toast.error("Problem data not loaded yet. Please wait.", {
        icon: "⏳",
        style: {
          borderRadius: "10px",
          background: "#333",
          color: "#fff",
        },
      });
      return
    }

    setAiLoading(true);
    setCurrentAnimatingAiResponse(""); // Clear any previous animating response

    // Add user's prompt to history immediately, with an empty response placeholder
    setChatHistory((prev) => [...prev, { prompt: aiPrompt, response: "" }]);


    try {
      const problemData = {
        title: problem.title,
        description: problem.description,
        difficulty: problem.difficulty,
        tags: problem.tags,
        companies: problem.companies,
        constraints: problem.constraints,
        examples: problem.examples,
      }

      // Direct Gemini API call for general AI chat
      let chatHistoryForGemini = [];
      chatHistoryForGemini.push({ role: "user", parts: [{ text: aiPrompt }] });
      const payload = { contents: chatHistoryForGemini };
      // const apiKey = process.env.GEMINI_API_KEY || ""; // Using the provided API key
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`; // Using gemini-2.0-flash as per default

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      let generatedText = "No response received.";
      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        generatedText = result.candidates[0].content.parts[0].text;
      }

      setCurrentAnimatingAiResponse(generatedText); // Set current AI response for animation

      // Calculate animation duration and delay updating chatHistory
      const animationDuration = generatedText.length * 12; // 12ms per character

      setTimeout(async () => {
          // Update the last entry in chatHistory with the actual AI response
          setChatHistory((prev) => {
              const updatedHistory = [...prev];
              // Assuming the last added entry is the current one for the AI's response
              if (updatedHistory.length > 0 && updatedHistory[updatedHistory.length - 1].response === "") {
                  updatedHistory[updatedHistory.length - 1].response = generatedText;
              }
              return updatedHistory;
          });
          setCurrentAnimatingAiResponse(""); // Clear animating response state
          setAiLoading(false); // End loading state

          // Auto-scroll after chat history is updated and animation is complete
          requestAnimationFrame(() => {
              const container = chatHistoryRef.current
              if (!container) return
              container.scrollTop = container.scrollHeight
          });

      }, animationDuration + 50); // Add a small buffer for smooth transition


      await saveChatMessage(aiPrompt, generatedText) // Save the complete turn to DB
      setAiPrompt("")
    } catch (error: any) {
      console.error("AI Error:", error);
      if (error.response?.status === 429 || error.response?.data?.error?.includes("quota")) {
      toast.error("🚫 API quota exceeded! Please try again later.", {
        icon: "⚠️",
        duration: 7000,
        style: {
          borderRadius: "10px",
          background: "#1f2937",
          color: "#fff",
        },
      });
    } else {
      // If error, set a static error message and clear animation
      setCurrentAnimatingAiResponse("Something went wrong while generating the response.");
      setAiLoading(false);
      // Also update the last chat history entry with the error message
      setChatHistory((prev) => {
        const updatedHistory = [...prev];
        if (updatedHistory.length > 0 && updatedHistory[updatedHistory.length - 1].response === "") {
            updatedHistory[updatedHistory.length - 1].response = "Something went wrong while generating the response.";
        }
        return updatedHistory;
      });
    }

    } finally {
      // `setAiLoading(false)` and `setCurrentAnimatingAiResponse("")` are handled in setTimeout for success
      // In case of immediate error, they are handled in catch block
    }
  }

  // Function to generate complexity analysis
  const generateComplexityAnalysis = async () => {
    if (!complexityCodeInput.trim()) {
      toast.error("Please enter code to analyze.", {
        icon: "✍️",
        style: { borderRadius: "10px", background: "#333", color: "#fff" },
      });
      return;
    }

    if (!token) {
      toast.error("Please login to use AI analysis feature.", {
        icon: "🔑",
        style: { borderRadius: "10px", background: "#333", color: "#fff" },
      });
      return;
    }

    setComplexityAiLoading(true);
    setComplexityAiResponse("");

    try {
      const prompt = `Analyze the time and space complexity of the following code. Provide the complexities in Big O notation and a brief 3-4 line justification for each.
      Code:
      \`\`\`${language}
      ${complexityCodeInput}
      \`\`\``;

      // Direct Gemini API call for complexity analysis
      let chatHistoryForGemini = [];
      chatHistoryForGemini.push({ role: "user", parts: [{ text: prompt }] });
      const payload = { contents: chatHistoryForGemini };
      // const apiKey = process.env.GEMINI_API_KEY || ""; // Using the provided API key
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`; // Using gemini-1.5-flash as requested

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      let generatedText = "Failed to get a response from the AI. Please try again.";
      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        generatedText = result.candidates[0].content.parts[0].text;
      }

      setComplexityAiResponse(generatedText);
      setComplexityChatHistory((prev) => [...prev, { prompt: complexityCodeInput, response: generatedText }]);

      // Auto-scroll to bottom of complexity chat
      requestAnimationFrame(() => {
        if (bottomRef.current) {
          bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
      });

    } catch (error) {
      console.error("Complexity AI Error:", error);
      toast.error("Something went wrong while analyzing complexity.", {
        icon: "❌",
        style: { borderRadius: "10px", background: "#333", color: "#fff" },
      });
      setComplexityAiResponse("Error analyzing complexity. Please try again.");
    } finally {
      setComplexityAiLoading(false);
    }
  };


  const checkIfSolved = async () => {
    if (!user || !id || !token) return

    try {
      const response = await axios.get(`${API_URL}/profile/${user.username}/solved`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      const solvedProblems = response.data.solvedProblems
      setIsSolved(solvedProblems.some((p: any) => p._id === id))
    } catch (error) {
      console.error("Error checking solved status:", error)
    }
  }

  const fetchEditorial = async () => {
    try {
      const response = await axios.get(`${API_URL}/problems/${id}/editorial`)
      setEditorial(response.data.editorial)
    } catch (error) {
      console.error("Error fetching editorial:", error)
    }
  }

  const fetchSubmissions = async () => {
    if (!user || !token) return

    try {
      const response = await axios.get(`${API_URL}/problems/${id}/submissions`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      setSubmissions(response.data.submissions)
    } catch (error) {
      console.error("Error fetching submissions:", error)
    }
  }

  const fetchSolutions = async () => {
    try {
      const response = await axios.get(`${API_URL}/problems/${id}/solutions`)
      setSolutions(response.data.solutions)
    } catch (error) {
      console.error("Error fetching solutions:", error)
    }
  }

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage)
    if (problem?.codeTemplates) {
      setCode(problem.codeTemplates[newLanguage] || "")
    } else {
      setCode("")
    }
  }

  const handleRun = async () => {
    if (!code.trim()) {
      toast.error("Please write some code before running!", {
        icon: "✍️",
        style: {
          borderRadius: "10px",
          background: "#333",
          color: "#fff",
        },
      });
      return
    }

    if (!token) {
      toast.error("Please login to run code.", {
        icon: "🔑",
        style: {
          borderRadius: "10px",
          background: "#333",
          color: "#fff",
        },
      });
      return
    }

    setRunning(true)
    setRunResult(null)

    try {
      console.log("🔑 Running code with token:", token.substring(0, 20) + "...")
      const response = await axios.post(
        `${API_URL}/problems/${id}/run`,
        {
          code,
          language,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      )
      setRunResult(response.data)
    } catch (error: any) {
      console.error("Error running code:", error)
      if (error.response?.status === 401) {
        toast.error("Authentication failed. Please login again.", {
          icon: "🔒",
          style: {
            borderRadius: "10px",
            background: "#333",
            color: "#fff",
          },
        });
        return
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
    if (!code.trim()) {
      toast.error("Please write some code before submitting!", {
        icon: "✍️",
        style: {
          borderRadius: "10px",
          background: "#333",
          color: "#fff",
        },
      });
      return
    }

    if (!token) {
      toast.error("Please login to submit solutions.", {
        icon: "🔑",
        style: {
          borderRadius: "10px",
          background: "#333",
          color: "#fff",
        },
      });
      return
    }

    setSubmitting(true)
    setSubmissionResult(null)

    try {
      console.log("🔑 Submitting solution with token:", token.substring(0, 20) + "...")
      const response = await axios.post(
        `${API_URL}/problems/${id}/submit`,
        {
          code,
          language,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      )

      setSubmissionResult(response.data)

      if (response.data.status === "Accepted") {
        setIsSolved(true);

        // 🎉 Trigger confetti animation
        confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.6 },
        });

        // ✅ Show success toast
        toast.success("🎉 Solution Accepted!", {
          icon: "✅",
          duration: 5000,
          style: {
            borderRadius: "10px",
            background: "#333",
            color: "#fff",
          },
        });

        setShowAcceptedCard(true); // Show the flash card

        if (response.data.potd && response.data.potd.awarded) {
          updateCoins(response.data.potd.totalCoins);
          setTimeout(() => {
            alert(
              `🎉 Congratulations! You solved today's Problem of the Day and earned ${response.data.potd.coinsEarned} coins! 🪙`
            );
          }, 1000);
        }
      }


      if (activeTab === "submissions") {
        fetchSubmissions()
      }
    } catch (error: any) {
      console.error("Error submitting solution:", error)
      if (error.response?.status === 401) {
        toast.error("Authentication failed. Please login again.", {
          icon: "🔒",
          style: {
            borderRadius: "10px",
            background: "#333",
            color: "#fff",
          },
        });
        return
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
    } finally {
      setSubmitting(false)
    }
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    if (tab === "editorial" && !editorial) {
      fetchEditorial()
    } else if (tab === "submissions" && submissions.length === 0) {
      fetchSubmissions()
    } else if (tab === "solutions" && solutions.length === 0) {
      fetchSolutions()
    }
  }

  const handleSubmissionClick = (submission: Submission) => {
    setSelectedSubmission(submission)
    if (submission.code) {
      setCode(submission.code)
      setLanguage(submission.language)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800"
      case "Medium":
        return "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800"
      case "Hard":
        return "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800"
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
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
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
      case "Wrong Answer":
      case "Failed":
        return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
      case "Compilation Error":
      case "Error":
        return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
      default:
        return <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950 transition-colors duration-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 animate-pulse">Loading problem details...</p>
        </div>
      </div>
    )
  }

  if (!problem) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950 transition-colors duration-200">
        <div className="text-center bg-white dark:bg-gray-850 p-8 rounded-lg shadow-lg border border-gray-200 dark:border-gray-750">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Problem not found</h2>
          <p className="text-gray-600 dark:text-gray-400">
            The problem you're looking for doesn't exist or has been removed.
          </p>
        </div>
      </div>
    )
  }

  // Maximized Code Editor View
  if (isCodeEditorMaximized) {
    return (
      <div className="fixed inset-0 bg-gray-100 dark:bg-gray-950 mt-[64px] flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-850 border-b border-gray-200 dark:border-gray-750 px-6 py-4 flex-shrink-0 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Code className="h-6 w-6 mr-3 text-emerald-500" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{problem.title}</h1>
                <div className="flex items-center space-x-4 mt-1">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(problem.difficulty)}`}
                  >
                    {problem.difficulty}
                  </span>
                  {isSolved && (
                    <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded-full flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Solved
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
              >
                <option value="cpp">C++20</option>
                <option value="java">Java</option>
                <option value="python">Python</option>
                <option value="c">C</option>
              </select>
              {(runResult || submissionResult) && (
                <button
                  onClick={() => {
                    setRunResult(null)
                    setSubmissionResult(null)
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm font-medium border border-transparent dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                  title="Clear Results"
                >
                  Clear Results
                </button>
              )}
              <button
                onClick={toggleCodeEditorMaximized}
                className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors font-medium border border-transparent dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                title="Minimize Code Editor"
              >
                <Minimize2 className="h-5 w-5 mr-2" />
                Minimize
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Code Editor */}
          <div className="flex-1 flex flex-col bg-white dark:bg-gray-850 border-r border-gray-200 dark:border-gray-750">
            {/* Editor Header */}
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                  <Code className="h-4 w-4 mr-2 text-emerald-500" />
                  Code Editor
                </h3>
                <div className="flex items-center space-x-3">
                  <button onClick={handleRun} disabled={running || !token} className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50" title={!token ? "Please login to run code" : ""} >
                    {running ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Run
                      </>
                    )}
                  </button>
                  <button onClick={handleSubmit} disabled={submitting || !token} className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50" title={!token ? "Please login to submit code" : ""} >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit
                      </>
                    )}
                  </button>
                </div>
              </div>
              {/* Warnings */}
              {tabSwitchCount > 0 && (
                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-yellow-800 dark:text-yellow-300 text-sm">
                    ⚠️ Tab switching detected ({tabSwitchCount} times). This may affect your submission.
                  </p>
                </div>
              )}
              {selectedSubmission && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-blue-800 dark:text-blue-300 text-sm">
                    📝 Viewing code from submission: {selectedSubmission.status} ( {new Date(selectedSubmission.date).toLocaleDateString()})
                  </p>
                </div>
              )}
            </div>
            {/* Code Editor - FIXED: Proper scrolling configuration */}
            <div className="flex-1 relative p-4">
              <div className="absolute inset-4 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden shadow-inner">
                <CodeMirrorEditor value={code} onChange={setCode} language={language} disabled={false} className="h-full w-full" height="100%" style={{ height: "100%" }} options={{ scrollbarStyle: "native", viewportMargin: 10, lineWrapping: true, }} />
              </div>
            </div>
          </div>
          {/* Console/Results Panel */}
          <div className="w-96 bg-white dark:bg-gray-850 flex flex-col shadow-lg">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <FileText className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                Console Output {(running || submitting) && (
                  <div className="ml-2 flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                    <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">
                      {running ? "Running..." : "Submitting..."}
                    </span>
                  </div>
                )}
              </h4>
            </div>
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900">
              {/* Show loading state */}
              {(running || submitting) && !runResult && !submissionResult && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">
                    {running ? "Running your code..." : "Submitting your solution..."}
                  </p>
                </div>
              )}
              {/* Rest of the console content remains the same */}
              {runResult && (
                <div className="mb-4 space-y-4">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <span className="text-base font-medium text-gray-700 dark:text-gray-300 mr-2">Run Result:</span>
                        <span className={`font-bold text-lg ${getStatusColor(runResult.status)}`}>{runResult.status}</span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 font-medium"> Passed: <span className="font-bold">{runResult.passedTests}</span>/<span className="font-bold">{runResult.totalTests}</span> </div>
                    </div>
                    {runResult.error ? (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-3 shadow-sm">
                        <div className="text-red-800 dark:text-red-300 text-sm font-medium mb-1">Error:</div>
                        <pre className="text-red-700 dark:text-red-200 text-sm font-mono break-words bg-red-100/50 dark:bg-red-900/50 p-2 rounded">
                          {runResult.error}
                        </pre>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {runResult.testResults.map((result, index) => (
                          <div key={index} className={`border rounded-lg p-3 shadow-sm ${
                            result.passed ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20" : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                          }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center">
                                {result.passed ? (
                                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 mr-2" />
                                )}
                                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                  Test Case {index + 1}
                                </span>
                              </div>
                              <div className="flex items-center space-x-3 text-xs text-gray-600 dark:text-gray-400">
                                <span>{result.executionTime}ms</span>
                                <span>{result.memory}MB</span>
                              </div>
                            </div>
                            <div className="space-y-2 text-xs">
                              <div>
                                <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Input:</div>
                                <pre className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 overflow-x-auto">
                                  {result.input}
                                </pre>
                              </div>
                              <div>
                                <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Expected:</div>
                                <pre className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 overflow-x-auto">
                                  {result.expectedOutput}
                                </pre>
                              </div>
                              <div>
                                <div className={`p-2 rounded border overflow-x-auto ${
                                    result.passed ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200" : "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200"
                                  }`}
                                >
                                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Your Output:</div>
                                  <pre>
                                    {result.actualOutput}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {submissionResult && (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <span className="text-base font-medium text-gray-700 dark:text-gray-300 mr-2">
                          Submission Result:
                        </span>
                        <span className={`font-bold text-lg ${getStatusColor(submissionResult.status)}`}>
                          {submissionResult.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        Passed: <span className="font-bold">{submissionResult.passedTests}</span>/<span className="font-bold">{submissionResult.totalTests}</span>
                      </div>
                    </div>
                    {/* POTD Coin Award Notification */}
                    {submissionResult.potd && submissionResult.potd.awarded && (
                      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl p-4 mb-4 shadow-inner">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-yellow-400 dark:bg-yellow-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
                              🪙
                            </div>
                          </div>
                          <div className="ml-3">
                            <h4 className="text-sm font-bold text-yellow-800 dark:text-yellow-200">
                              Problem of the Day Bonus!
                            </h4>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300">
                              You earned <span className="font-semibold">{submissionResult.potd.coinsEarned} coins</span>{" "}
                              for solving today's Problem of the Day! 🎉
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {submissionResult.error ? (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 shadow-sm">
                        <div className="text-red-800 dark:text-red-300 text-sm font-medium mb-1">Error:</div>
                        <pre className="text-red-700 dark:text-red-200 text-sm font-mono break-words bg-red-100/50 dark:bg-red-900/50 p-2 rounded">
                          {submissionResult.error}
                        </pre>
                      </div>
                    ) : (
                      <div>
                        <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-1" />
                            <span className="text-gray-600 dark:text-gray-300">Runtime:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                              {submissionResult.executionTime} ms
                            </span>
                          </div>
                          <div className="flex items-center">
                            <Memory className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-1" />
                            <span className="text-gray-600 dark:text-gray-300">Memory:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                              {submissionResult.memory} MB
                            </span>
                          </div>
                        </div>
                        <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Test Case Results:</h5>
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                          {submissionResult.testResults.map((result, index) => (
                            <div key={index} className={`border rounded-lg p-3 shadow-sm ${
                              result.passed ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20" : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                            }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center">
                                  {result.passed ? (
                                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 mr-2" />
                                  )}
                                  <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                    Test Case {index + 1}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-3 text-xs text-gray-600 dark:text-gray-400">
                                  <span>{result.executionTime}ms</span>
                                  <span>{result.memory}MB</span>
                                </div>
                              </div>
                              <div className="space-y-2 text-xs">
                                <div>
                                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Input:</div>
                                  <pre className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 overflow-x-auto">
                                    {result.input}
                                  </pre>
                                </div>
                                <div>
                                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Expected:</div>
                                  <pre className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 overflow-x-auto">
                                    {result.expectedOutput}
                                  </pre>
                                </div>
                                <div>
                                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Your Output:</div>
                                  <pre className={`p-2 rounded border overflow-x-auto ${
                                      result.passed ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200" : "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200"
                                    }`}
                                  >
                                    {result.actualOutput}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Maximized Complexity AI View
  if (isComplexityAiMaximized) {
    // Function to extract Big O notation and description
    const extractComplexity = (response: string) => {
      const timeMatch = response.match(/Time Complexity:\s*(O\(.*?\))/i);
      const spaceMatch = response.match(/Space Complexity:\s*(O\(.*?\))/i);

      const timeComplexity = timeMatch ? timeMatch[1] : "N/A";
      const spaceComplexity = spaceMatch ? spaceMatch[1] : "N/A";

      // Remove the complexity lines from the response to get only the justification
      const justification = response
        .replace(/Time Complexity:\s*O\(.*?\)\s*\.?/gi, "")
        .replace(/Space Complexity:\s*O\(.*?\)\s*\.?/gi, "")
        .trim();

      return { timeComplexity, spaceComplexity, justification };
    };

    const { timeComplexity, spaceComplexity, justification } = extractComplexity(complexityAiResponse);

    return (
      <div className="fixed inset-0 bg-gray-100 dark:bg-gray-950 mt-[64px] flex flex-col z-50">
        {/* Header */}
        <div className="bg-white dark:bg-gray-850 border-b border-gray-200 dark:border-gray-750 px-6 py-4 flex-shrink-0 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Zap className="h-6 w-6 mr-3 text-orange-500" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Complexity Analysis AI</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Analyse time and space complexity of your code.</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleComplexityAiMaximized}
                className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors font-medium border border-transparent dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                title="Minimize Complexity Analysis AI"
              >
                <Minimize2 className="h-5 w-5 mr-2" />
                Minimize
              </button>
            </div>
          </div>
        </div>

        {/* Main Content - Split Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Pane: Code Editor */}
          <div className="flex-1 flex flex-col bg-white dark:bg-gray-850 border-r border-gray-200 dark:border-gray-750">
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-900 flex-shrink-0 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <Code className="h-4 w-4 mr-2 text-emerald-500" />
                Your Code
              </h3>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              >
                <option value="cpp">C++20</option>
                <option value="java">Java</option>
                <option value="python">Python</option>
                <option value="c">C</option>
              </select>
            </div>
            <div className="flex-1 relative p-4">
              <div className="absolute inset-4 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden shadow-inner">
                <CodeMirrorEditor
                  value={complexityCodeInput}
                  onChange={setComplexityCodeInput}
                  language={language}
                  disabled={false}
                  className="h-full w-full"
                  height="100%"
                  style={{ height: "100%" }}
                  options={{ scrollbarStyle: "native", viewportMargin: 10, lineWrapping: true }}
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-900 flex-shrink-0 flex justify-end">
              <button
                onClick={generateComplexityAnalysis}
                disabled={complexityAiLoading || !token || !complexityCodeInput.trim()}
                className="flex items-center px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50"
                title={!token ? "Please login to analyze code" : !complexityCodeInput.trim() ? "Please enter code to analyze" : ""}
              >
                {complexityAiLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Analyze Complexity
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Pane: Analysis Results */}
          <div className="w-2/5 flex flex-col bg-white dark:bg-gray-850 shadow-lg">
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <Bot className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                AI Complexity Analysis
              </h3>
            </div>
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900">
              {complexityAiLoading && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Analyzing your code for complexity...</p>
                </div>
              )}
              {!complexityAiLoading && complexityAiResponse && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <div className="flex-1 p-3 rounded-lg shadow-md bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 font-bold text-sm">
                      Time Complexity: {timeComplexity}
                    </div>
                    <div className="flex-1 p-3 rounded-lg shadow-md bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300 font-bold text-sm">
                      Space Complexity: {spaceComplexity}
                    </div>
                  </div>
                  <div
                    className="text-sm whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100"
                    dangerouslySetInnerHTML={{
                      __html: justification.replace(
                        /\*\*(.*?)\*\*/g,
                        "<strong class='font-bold text-gray-900 dark:text-gray-100'>$1</strong>",
                      ),
                    }}
                  />
                </div>
              )}
              {!complexityAiLoading && !complexityAiResponse && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Enter your code on the left and click "Analyze Complexity" to get started!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular Problem Detail View
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-200 pt-[64px] flex flex-col">
      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col items-end space-y-4 z-40">
        {/* DSA Visualizer Button */}
        <button
          onClick={handleDsaVisualizerClick}
          className="p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-emerald-500 focus:ring-opacity-75 animate-bounce-slow"
          title="Open DSA Visualizer"
          style={{ width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <GraduationCap className="h-8 w-8" />
        </button>

        {/* Analyse Time and Space Complexity Button */}
        <button
          onClick={toggleComplexityAiMaximized}
          className="p-4 bg-orange-600 hover:bg-orange-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-orange-500 focus:ring-opacity-75 animate-bounce-slow"
          title="Analyse Time and Space Complexity of Current Code"
          style={{ width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Zap className="h-8 w-8" />
        </button>

        {/* Existing Floating AI Chat Button */}
        <button
          onClick={toggleAiMaximized}
          className="p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-opacity-75 animate-bounce-slow"
          title="Open AI Chat"
          style={{ width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Bot className="h-8 w-8" />
        </button>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Problem Description */}
        <div className="flex-1 max-w-[50%] p-6 overflow-y-auto border-r border-gray-200 dark:border-gray-750">
          <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">{problem.title}</h1>
          <div className="flex items-center space-x-4 mb-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getDifficultyColor(problem.difficulty)}`}>
              {problem.difficulty}
            </span>
            {isSolved && (
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm rounded-full flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                Solved
              </span>
            )}
          </div>

          {/* Tabs for Description, Editorial, Submissions, Solutions */}
          <div className="border-b border-gray-200 dark:border-gray-750 mb-6">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => handleTabChange("description")}
                className={`${
                  activeTab === "description"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-500"
                } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
              >
                <FileText className="h-5 w-5 mr-2 inline-block" />
                Description
              </button>
              <button
                onClick={() => handleTabChange("editorial")}
                className={`${
                  activeTab === "editorial"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-500"
                } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
              >
                <BookOpen className="h-5 w-5 mr-2 inline-block" />
                Editorial
              </button>
              <button
                onClick={() => handleTabChange("submissions")}
                className={`${
                  activeTab === "submissions"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-500"
                } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
              >
                <History className="h-5 w-5 mr-2 inline-block" />
                Submissions
              </button>
              <button
                onClick={() => handleTabChange("solutions")}
                className={`${
                  activeTab === "solutions"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-500"
                } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
              >
                <CheckCircle className="h-5 w-5 mr-2 inline-block" />
                Solutions
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === "description" && (
            <div className="prose dark:prose-invert max-w-none">
              <h2 className="text-xl font-semibold mb-3">Problem Description</h2>
              <p className="mb-4">{problem.description}</p>

              <h3 className="text-lg font-semibold mb-2">Constraints</h3>
              <p className="mb-4 whitespace-pre-wrap">{problem.constraints}</p>

              <h3 className="text-lg font-semibold mb-2">Examples</h3>
              {problem.examples.map((example, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm mb-4 border border-gray-200 dark:border-gray-700">
                  <p className="font-medium text-gray-800 dark:text-gray-200 mb-2">Example {index + 1}:</p>
                  <div className="mb-2">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Input:</span>{" "}
                    <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-sm text-gray-900 dark:text-gray-100">{example.input}</code>
                  </div>
                  <div className="mb-2">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Output:</span>{" "}
                    <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-sm text-gray-900 dark:text-gray-100">{example.output}</code>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Explanation:</span>{" "}
                    <p className="inline">{example.explanation}</p>
                  </div>
                </div>
              ))}

              {problem.tags && problem.tags.length > 0 && (
                <>
                  <h3 className="text-lg font-semibold mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {problem.tags.map((tag, index) => (
                      <span key={index} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </>
              )}

              {problem.companies && problem.companies.length > 0 && (
                <>
                  <h3 className="text-lg font-semibold mb-2">Companies</h3>
                  <div className="flex flex-wrap gap-2">
                    {problem.companies.map((company, index) => (
                      <span key={index} className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full text-sm font-medium">
                        {company}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "editorial" && (
            <div className="prose dark:prose-invert max-w-none">
              <h2 className="text-xl font-semibold mb-3">Editorial</h2>
              {editorial ? (
                <>
                  {editorial.written && (
                    <div className="mb-6">
                      <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{editorial.written}</p>
                    </div>
                  )}
                  {editorial.videoUrl && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Video Explanation</h3>
                      <div className="relative" style={{ paddingBottom: '56.25%', height: 0 }}>
                        <iframe
                          src={editorial.videoUrl.replace("watch?v=", "embed/")}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title="Video Explanation"
                          className="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
                        ></iframe>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">No editorial available yet.</p>
              )}
            </div>
          )}

          {activeTab === "submissions" && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Your Submissions</h2>
              {submissions.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">No submissions yet.</p>
              ) : (
                <div className="space-y-4">
                  {submissions.map((submission) => (
                    <div
                      key={submission._id}
                      className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => handleSubmissionClick(submission)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(submission.status)}
                          <span className={`font-semibold ${getStatusColor(submission.status)}`}>
                            {submission.status}
                          </span>
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(submission.date).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
                        <span>Language: {submission.language}</span>
                        <span>Runtime: {submission.runtime}ms</span>
                        <span>Memory: {submission.memory}MB</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "solutions" && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Community Solutions</h2>
              {solutions.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">No community solutions available yet.</p>
              ) : (
                <div className="space-y-6">
                  {solutions.map((solution, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Language: {solution.language}
                        </span>
                        <button
                          onClick={() => copyToClipboard(solution.completeCode)}
                          className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm transition-colors flex items-center"
                        >
                          <Copy className="h-4 w-4 mr-1" /> Copy
                        </button>
                      </div>
                      <CodeMirrorEditor
                        value={solution.completeCode}
                        onChange={() => {}} // Read-only
                        language={solution.language}
                        disabled={true} // Make it read-only
                        options={{
                          readOnly: true,
                          lineWrapping: true,
                          scrollbarStyle: "native",
                        }}
                        className="rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700"
                        height="300px" // Fixed height for solutions
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Panel - Code Editor and Console */}
        <div className="flex-1 max-w-[50%] flex flex-col bg-white dark:bg-gray-850">
          {/* Code Editor */}
          <div className="flex-1 flex flex-col border-b border-gray-200 dark:border-gray-750">
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                  <Code className="h-4 w-4 mr-2 text-emerald-500" />
                  Code Editor
                </h3>
                <div className="flex items-center space-x-3">
                  <select
                    value={language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    <option value="cpp">C++20</option>
                    <option value="java">Java</option>
                    <option value="python">Python</option>
                    <option value="c">C</option>
                  </select>
                  <button
                    onClick={toggleCodeEditorMaximized}
                    className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                    title="Maximize Code Editor"
                  >
                    <Maximize2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
              {/* Warnings */}
              {tabSwitchCount > 0 && (
                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-yellow-800 dark:text-yellow-300 text-sm">
                    ⚠️ Tab switching detected ({tabSwitchCount} times). This may affect your submission.
                  </p>
                </div>
              )}
              {selectedSubmission && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-blue-800 dark:text-blue-300 text-sm">
                    📝 Viewing code from submission: {selectedSubmission.status} ( {new Date(selectedSubmission.date).toLocaleDateString()})
                  </p>
                </div>
              )}
            </div>
            <div className="flex-1 relative p-4">
              <div className="absolute inset-4 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden shadow-inner">
                <CodeMirrorEditor value={code} onChange={setCode} language={language} disabled={false} className="h-full w-full" height="100%" style={{ height: "100%" }} options={{ scrollbarStyle: "native", viewportMargin: 10, lineWrapping: true }} />
              </div>
            </div>
          </div>

          {/* Console and Action Buttons */}
          <div className="h-[250px] flex flex-col bg-white dark:bg-gray-850">
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <FileText className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                Console Output {(running || submitting) && (
                  <div className="ml-2 flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                    <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">
                      {running ? "Running..." : "Submitting..."}
                    </span>
                  </div>
                )}
              </h4>
            </div>
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900">
              {(running || submitting) && !runResult && !submissionResult && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">
                    {running ? "Running your code..." : "Submitting your solution..."}
                  </p>
                </div>
              )}
              {runResult && (
                <div className="mb-4 space-y-4">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <span className="text-base font-medium text-gray-700 dark:text-gray-300 mr-2">Run Result:</span>
                        <span className={`font-bold text-lg ${getStatusColor(runResult.status)}`}>{runResult.status}</span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 font-medium"> Passed: <span className="font-bold">{runResult.passedTests}</span>/<span className="font-bold">{runResult.totalTests}</span> </div>
                    </div>
                    {runResult.error ? (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-3 shadow-sm">
                        <div className="text-red-800 dark:text-red-300 text-sm font-medium mb-1">Error:</div>
                        <pre className="text-red-700 dark:text-red-200 text-sm font-mono break-words bg-red-100/50 dark:bg-red-900/50 p-2 rounded">
                          {runResult.error}
                        </pre>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {runResult.testResults.map((result, index) => (
                          <div key={index} className={`border rounded-lg p-3 shadow-sm ${
                            result.passed ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20" : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                          }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center">
                                {result.passed ? (
                                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 mr-2" />
                                )}
                                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                  Test Case {index + 1}
                                </span>
                              </div>
                              <div className="flex items-center space-x-3 text-xs text-gray-600 dark:text-gray-400">
                                <span>{result.executionTime}ms</span>
                                <span>{result.memory}MB</span>
                              </div>
                            </div>
                            <div className="space-y-2 text-xs">
                              <div>
                                <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Input:</div>
                                <pre className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 overflow-x-auto">
                                  {result.input}
                                </pre>
                              </div>
                              <div>
                                <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Expected:</div>
                                <pre className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 overflow-x-auto">
                                  {result.expectedOutput}
                                </pre>
                              </div>
                              <div>
                                <div className={`p-2 rounded border overflow-x-auto ${
                                    result.passed ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200" : "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200"
                                  }`}
                                >
                                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Your Output:</div>
                                  <pre>
                                    {result.actualOutput}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {submissionResult && (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <span className="text-base font-medium text-gray-700 dark:text-gray-300 mr-2">
                          Submission Result:
                        </span>
                        <span className={`font-bold text-lg ${getStatusColor(submissionResult.status)}`}>
                          {submissionResult.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        Passed: <span className="font-bold">{submissionResult.passedTests}</span>/<span className="font-bold">{submissionResult.totalTests}</span>
                      </div>
                    </div>
                    {/* POTD Coin Award Notification */}
                    {submissionResult.potd && submissionResult.potd.awarded && (
                      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl p-4 mb-4 shadow-inner">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-yellow-400 dark:bg-yellow-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
                              🪙
                            </div>
                          </div>
                          <div className="ml-3">
                            <h4 className="text-sm font-bold text-yellow-800 dark:text-yellow-200">
                              Problem of the Day Bonus!
                            </h4>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300">
                              You earned <span className="font-semibold">{submissionResult.potd.coinsEarned} coins</span>{" "}
                              for solving today's Problem of the Day! 🎉
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {submissionResult.error ? (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 shadow-sm">
                        <div className="text-red-800 dark:text-red-300 text-sm font-medium mb-1">Error:</div>
                        <pre className="text-red-700 dark:text-red-200 text-sm font-mono break-words bg-red-100/50 dark:bg-red-900/50 p-2 rounded">
                          {submissionResult.error}
                        </pre>
                      </div>
                    ) : (
                      <div>
                        <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-1" />
                            <span className="text-gray-600 dark:text-gray-300">Runtime:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                              {submissionResult.executionTime} ms
                            </span>
                          </div>
                          <div className="flex items-center">
                            <Memory className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-1" />
                            <span className="text-gray-600 dark:text-gray-300">Memory:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                              {submissionResult.memory} MB
                            </span>
                          </div>
                        </div>
                        <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Test Case Results:</h5>
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                          {submissionResult.testResults.map((result, index) => (
                            <div key={index} className={`border rounded-lg p-3 shadow-sm ${
                              result.passed ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20" : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                            }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center">
                                  {result.passed ? (
                                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 mr-2" />
                                  )}
                                  <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                    Test Case {index + 1}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-3 text-xs text-gray-600 dark:text-gray-400">
                                  <span>{result.executionTime}ms</span>
                                  <span>{result.memory}MB</span>
                                </div>
                              </div>
                              <div className="space-y-2 text-xs">
                                <div>
                                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Input:</div>
                                  <pre className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 overflow-x-auto">
                                    {result.input}
                                  </pre>
                                </div>
                                <div>
                                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Expected:</div>
                                  <pre className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 overflow-x-auto">
                                    {result.expectedOutput}
                                  </pre>
                                </div>
                                <div>
                                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Your Output:</div>
                                  <pre className={`p-2 rounded border overflow-x-auto ${
                                      result.passed ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200" : "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200"
                                    }`}
                                  >
                                    {result.actualOutput}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-750 flex justify-between items-center flex-shrink-0">
              <button
                onClick={handleRun}
                disabled={running || !token}
                className="flex items-center px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                title={!token ? "Please login to run code" : ""}
              >
                {running ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    Run Code
                  </>
                )}
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !token}
                className="flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                title={!token ? "Please login to submit code" : ""}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Submit Solution
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Chat Maximized View */}
      {isAiMaximized && (
        <div className="fixed inset-0 bg-gray-100 dark:bg-gray-950 mt-[64px] flex flex-col z-50">
          {/* Header */}
          <div className="bg-white dark:bg-gray-850 border-b border-gray-200 dark:border-gray-750 px-6 py-4 flex-shrink-0 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Bot className="h-6 w-6 mr-3 text-purple-500" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">AI Chat Assistant</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Get help with your problems!</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={startNewChat}
                  className="flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                  title="Start a New Chat"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  New Chat
                </button>
                <button
                  onClick={toggleAiMaximized}
                  className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors font-medium border border-transparent dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                  title="Minimize AI Chat"
                >
                  <Minimize2 className="h-5 w-5 mr-2" />
                  Minimize
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar for Chat History */}
            <div className="w-80 bg-white dark:bg-gray-850 border-r border-gray-200 dark:border-gray-750 flex flex-col">
              <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                  <History className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                  Chat History
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingHistory ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mx-auto mb-2"></div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Loading history...</p>
                  </div>
                ) : (
                  allChatHistory
                    .filter(
                      (session) =>
                        session.problemId === problem?._id && session.sessionId !== currentSessionId,
                    )
                    .map((session) => (
                      <button
                        key={session.sessionId}
                        onClick={() => loadChatSession(session.sessionId)}
                        className={`block w-full text-left p-3 rounded-lg transition-colors duration-200 ${
                          selectedHistorySession === session.sessionId
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
                        }`}
                      >
                        <p className="font-medium text-sm truncate">{session.lastMessage}</p>
                        <p
                          className={`text-xs ${
                            selectedHistorySession === session.sessionId
                              ? "text-blue-200"
                              : "text-gray-500 dark:text-gray-300"
                          }`}
                        >
                          {new Date(session.updatedAt).toLocaleString()}
                        </p>
                      </button>
                    ))
                )}
                {allChatHistory.filter((session) => session.problemId === problem?._id).length === 0 && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm text-center py-4">
                    No chat history for this problem.
                  </p>
                )}
              </div>
            </div>

            {/* Right Main Chat Area */}
            <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
              <div ref={chatHistoryRef} className="flex-1 overflow-y-auto p-6 space-y-4">
                {chatHistory.map((chat, index) => (
                  <React.Fragment key={index}>
                    <UserChatBubble message={chat.prompt} />
                    {chat.response && (
                        <div className="flex justify-start">
                            <div className="max-w-3xl bg-blue-50 dark:bg-blue-900/30 text-gray-900 dark:text-gray-100 p-3 rounded-xl shadow-md">
                                <div className="flex items-center mb-1">
                                    <Bot className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                                    <span className="text-sm font-medium">AI Assistant</span>
                                </div>
                                <div
                                    className="text-sm whitespace-pre-wrap break-words"
                                    dangerouslySetInnerHTML={{
                                        __html: chat.response.replace(
                                            /\*\*(.*?)\*\*/g,
                                            "<strong class='font-bold text-gray-900 dark:text-gray-100'>$1</strong>",
                                        ),
                                    }}
                                />
                            </div>
                        </div>
                    )}
                  </React.Fragment>
                ))}

                {/* Render the current animating AI response */}
                {currentAnimatingAiResponse && (
                    <AnimatedAiResponse response={currentAnimatingAiResponse} />
                )}

                {/* Show typing indicator only if loading and no animating response yet */}
                {aiLoading && !currentAnimatingAiResponse && (
                  <div className="flex justify-start mb-4 animate-pulse">
                    <div className="max-w-xs bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-3 rounded-xl shadow-md">
                      <div className="flex items-center mb-1">
                        <Bot className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-medium">AI Assistant</span>
                      </div>
                      <div className="text-sm">Typing...</div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Quick Prompts */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-750 bg-gray-100 dark:bg-gray-800 flex-shrink-0 overflow-x-auto whitespace-nowrap scrollbar-hide">
                <div className="flex space-x-2 pb-2">
                  {getContextualPrompts().map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => setAiPrompt(prompt)}
                      className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium transition-colors flex-shrink-0"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-750 bg-white dark:bg-gray-850 flex items-center space-x-3 flex-shrink-0">
                <textarea
                  ref={textareaRef}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      generateResponse()
                    }
                  }}
                  placeholder="Ask for hints, optimal solutions, edge cases..."
                  rows={1}
                  className="flex-1 p-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none overflow-hidden pr-10" // Added pr-10 for send button
                  style={{ maxHeight: "150px", minHeight: "48px" }}
                />
                <button
                  onClick={generateResponse}
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                  title="Send Message"
                >
                  {aiLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DSA Visualizer Maximized View */}
      {isVisualizerMaximized && (
        <div className="fixed inset-0 bg-gray-100 dark:bg-gray-950 mt-[64px] flex flex-col z-50">
          {/* Header */}
          <div className="bg-white dark:bg-gray-850 border-b border-gray-200 dark:border-gray-750 px-6 py-4 flex-shrink-0 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <GraduationCap className="h-6 w-6 mr-3 text-emerald-500" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">DSA Visualizer</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Visualize data structures and algorithms.</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={toggleVisualizerMaximized}
                  className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors font-medium border border-transparent dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                  title="Minimize DSA Visualizer"
                >
                  <Minimize2 className="h-5 w-5 mr-2" />
                  Minimize
                </button>
              </div>
            </div>
          </div>
          {/* Visualizer Content Area */}
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            {/* Placeholder for the actual visualizer component */}
            <p className="text-lg">DSA Visualizer coming soon!</p>
          </div>
        </div>
      )}

      {/* Accepted Card Modal */}
      {showAcceptedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
          <div className="bg-white dark:bg-gray-850 p-8 rounded-lg shadow-2xl text-center max-w-md w-full border border-gray-200 dark:border-gray-750 transform scale-95 animate-scale-in">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4 animate-bounce-custom" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Solution Accepted!</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Congratulations! Your solution passed all test cases.
            </p>
            <button
              onClick={() => setShowAcceptedCard(false)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              Great!
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProblemDetail;