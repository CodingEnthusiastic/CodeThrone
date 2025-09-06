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
  Settings,
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

function AnimatedAiResponse({ response }: { response: string }) {
  const [displayed, setDisplayed] = useState("")

  useEffect(() => {
    let i = 0
    setDisplayed("")
    const interval = setInterval(() => {
      if (i < response.length - 1) {
        setDisplayed((prev) => prev + response[i])
        i++
      } else {
        clearInterval(interval)
      }
    }, 12)

    return () => clearInterval(interval)
  }, [response])

  return (
    <div className="flex justify-start">
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
  // Reset code to starting template from DB
  const handleResetCode = () => {
    if (problem?.codeTemplates && language in problem.codeTemplates) {
      setCode(problem.codeTemplates[language] || "")
    }
  }
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
  const [showSettings, setShowSettings] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [solutions, setSolutions] = useState<Solution[]>([])
  const [isSolved, setIsSolved] = useState(false)
  const [tabSwitchCount, setTabSwitchCount] = useState(0)
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiResponse, setAiResponse] = useState("")
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
  const [potdCoinsEarned, setPotdCoinsEarned] = useState<number | null>(null);
  // New state variable for visualizer
  const [isVisualizerMaximized, setIsVisualizerMaximized] = useState(false);


  // Auto-scroll chat to bottom in both minimized and maximized mode when new answer appears
  useEffect(() => {
    if (chatHistoryRef.current) {
      requestAnimationFrame(() => {
        chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight
      })
    }
  }, [chatHistory, aiResponse, isAiMaximized])

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
      setAiResponse(session.messages?.length > 0 ? session.messages[session.messages.length - 1].response : "")
    } catch (error) {
      console.error("Error loading chat session:", error)
    } finally {
      setLoadingHistory(false)
    }
  }

  // Clear current chat and start fresh
  const startNewChat = () => {
    setChatHistory([])
    setAiResponse("")
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

    setAiLoading(true)
    setAiResponse("")

    try {
      const examplesText = problem.examples
      .map((ex, i) => `Example ${i + 1}:\nInput: ${ex.input}\nOutput: ${ex.output}\nExplanation: ${ex.explanation || ""}`)
      .join("\n\n");

    const context = `
    Here is the problem statement:
    Title: ${problem.title}
    Description: ${problem.description}
    Constraints: ${problem.constraints}
    Examples:
    ${examplesText}
    
    INSTRUCTION:
    - DO NOT use Markdown symbols like "**", "__", "*", or "\`\`\`".
    - DO NOT format code using triple backticks or indentation blocks.
    - WHENEVER you give a code block:
      - First write: PYTHON CODE (or the language name)
      - Then leave one line
      - Then, write the code on a new line, plain text, no formatting
      - After code , if there is further text , again leave one line
      - Wrap code between comment lines like:
    PYTHON CODE

    // START OF CODE
    (code goes here)
    // END OF CODE

    - Everything else should be in plain readable text.
    
    User question: ${aiPrompt}
    `.trim();

    // Direct Gemini API call for general AI chat
    let chatHistoryForGemini = [];
    chatHistoryForGemini.push({ role: "user", parts: [{ text: context }] });
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

      setAiResponse(generatedText)

      const newChatEntry = {
        prompt: aiPrompt,
        response: generatedText,
      }

      setChatHistory((prev) => [...prev, newChatEntry])

      requestAnimationFrame(() => {
        const container = chatHistoryRef.current
        if (!container) return
        const scrollTarget = container.scrollHeight - container.clientHeight / 2
        container.scrollTo({ top: scrollTarget, behavior: "smooth" })
      })

      await saveChatMessage(aiPrompt, generatedText)
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
      setAiResponse("Something went wrong while generating the response.");
    }

    } finally {
      setAiLoading(false)
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

  // Add near other state declarations
  const [editorSettings, setEditorSettings] = useState({
    tabSize: 2, // Default to 2 spaces
    insertSpaces: true,
    fontSize: 14,
    lineNumbers: true,
    wordWrap: false,
  });

  // Temporary settings for the dropdown (before applying)
  const [tempEditorSettings, setTempEditorSettings] = useState({
    tabSize: 2,
    insertSpaces: true,
    fontSize: 14,
    lineNumbers: true,
    wordWrap: false,
  });

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('editorSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setEditorSettings(settings);
      setTempEditorSettings(settings); // Sync temp settings
    }
  }, []);

  // Handle applying settings
  const handleApplySettings = () => {
    setEditorSettings(tempEditorSettings);
    localStorage.setItem('editorSettings', JSON.stringify(tempEditorSettings));
    setShowSettings(false);
  };

  // Handle closing settings without applying
  const handleCloseSettings = () => {
    // Reset temp settings to current settings
    setTempEditorSettings(editorSettings);
    setShowSettings(false);
  };

  // Handle opening settings (sync temp with current)
  const handleOpenSettings = () => {
    setTempEditorSettings(editorSettings);
    setShowSettings(true);
  };

  // Close settings when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSettings && event.target instanceof Element) {
        const settingsDropdown = document.querySelector('.settings-dropdown');
        const settingsButton = document.querySelector('.settings-button');
        
        if (settingsDropdown && !settingsDropdown.contains(event.target) && 
            settingsButton && !settingsButton.contains(event.target)) {
          handleCloseSettings();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSettings, editorSettings]);

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
        let duration = 3000; // 3 seconds
        let animationEnd = Date.now() + duration;
        let defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 999999 };

        let interval: any = setInterval(function () {
          let timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            clearInterval(interval);
            return;
          }

          let particleCount = 50 * (timeLeft / duration);
          confetti(Object.assign({}, defaults, { particleCount, origin: { x: Math.random(), y: Math.random() * 0.6 } }));
        }, 250);


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
          setPotdCoinsEarned(response.data.potd.coinsEarned); // <-- This is missing
          // setTimeout(() => {
          //   alert(
          //     `🎉 Congratulations! You solved today's Problem of the Day and earned ${response.data.potd.coinsEarned} coins! 🪙`
          //   );
          // }, 1000);
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
                  <span className="text-gray-600 dark:text-gray-400 text-sm">
                    Acceptance: {problem.acceptanceRate.toFixed(2)}% ({problem.submissions} submissions)
                  </span>
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
                  <button
                    onClick={handleRun}
                    disabled={running || !token}
                    className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                    title={!token ? "Please login to run code" : ""}
                  >
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
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !token}
                    className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                    title={!token ? "Please login to submit code" : ""}
                  >
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
                    📝 Viewing code from submission: {selectedSubmission.status} (
                    {new Date(selectedSubmission.date).toLocaleDateString()})
                  </p>
                </div>
              )}
            </div>

            {/* Code Editor - FIXED: Proper scrolling configuration */}
            <div className="flex-1 relative p-4">
              <div className="absolute inset-4 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden shadow-inner">
                <CodeMirrorEditor
                  value={code}
                  onChange={setCode}
                  language={language}
                  disabled={false}
                  settings={editorSettings} // Pass settings
                  className="h-full w-full"
                  height="100%"
                />
              </div>
            </div>
          </div>

          {/* Console/Results Panel */}
          <div className="w-96 bg-white dark:bg-gray-850 flex flex-col shadow-lg">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <FileText className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                Console Output
                {(running || submitting) && (
                  <div className="ml-2 flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                    <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">
                      {running ? "Running..." : "Submitting..."}
                    </span>
                  </div>
                )}
              </h4>
            </div>
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900 max-h-[500px]">
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
                      <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        Passed: <span className="font-bold">{runResult.passedTests}</span>/<span className="font-bold">{runResult.totalTests}</span>
                      </div>
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
                              result.passed
                                ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20"
                                : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
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
                                    result.passed
                                      ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200"
                                      : "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200"
                                  }`}
                                >
                                  {result.actualOutput}
                                </pre>
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
                            <h4 className="text-sm font-bold text-yellow-800 dark:text-yellow-200"> Problem of the Day Bonus! </h4>
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
                            <Clock className="h-4 w-4 mr-1 opacity-70" />
                            <span className="text-gray-600 dark:text-gray-300">Runtime:</span>
                            <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                              {submissionResult.executionTime}ms
                            </span>
                          </div>
                          <div className="flex items-center">
                            <Memory className="h-4 w-4 mr-1 opacity-70" />
                            <span className="text-gray-600 dark:text-gray-300">Memory:</span>
                            <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                              {submissionResult.memory}MB
                            </span>
                          </div>
                        </div>
                        {submissionResult.testResults.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                              Test Results (First 3):
                            </h4>
                            {submissionResult.testResults.slice(0, 3).map((result, index) => (
                              <div key={index} className={`border rounded-lg p-3 shadow-sm ${
                                  result.passed
                                    ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20"
                                    : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
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
                                        result.passed
                                          ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200"
                                          : "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200"
                                      }`}
                                    >
                                      {result.actualOutput}
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {!runResult && !submissionResult && !running && !submitting && (
                <div className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
                  <Code className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Run your code to see the output here...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Maximized AI View
  if (isAiMaximized) {
    return (
      <div className="fixed inset-0 bg-gray-100 dark:bg-gray-950 z-50 flex mt-[64px]">
        {/* Sidebar for Chat History */}
        <div className="w-80 bg-white dark:bg-gray-850 border-r border-gray-200 dark:border-gray-750 flex flex-col shadow-lg">
          <div className="p-4 border-b border-gray-200 dark:border-gray-750">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <History className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                Chat History
              </h2>
              <button
                onClick={startNewChat}
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                title="Start New Chat"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Problem: <span className="font-medium text-gray-900 dark:text-white">{problem.title}</span>
            </div>
          </div>
          {/* Chat History List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingHistory ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300 mx-auto mb-2"></div>
                <p>Loading chat history...</p>
              </div>
            ) : (
              <>
                {allChatHistory.length === 0 && (
                  <p className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">No chat history yet.</p>
                )}
                {allChatHistory.map((session) => (
                  <button
                    key={session.sessionId}
                    onClick={() => loadChatSession(session.sessionId)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors shadow-sm ${
                      selectedHistorySession === session.sessionId
                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600 text-blue-900 dark:text-blue-100"
                        : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
                    }`}
                  >
                    <div className="font-medium text-sm truncate">
                      {session.problemTitle}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(session.date).toLocaleDateString()} • {session.messageCount} messages
                    </div>
                    {session.lastMessage && (
                      <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 truncate">
                        Last: "{session.lastMessage}"
                      </div>
                    )}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Main Chat Content */}
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-750 bg-white dark:bg-gray-850 flex items-center justify-between shadow-sm flex-shrink-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <Bot className="h-5 w-5 mr-3 text-indigo-600" />
              AI Assistant - {problem.title}
            </h2>
            <button
              onClick={toggleAiMaximized}
              className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors font-medium border border-transparent dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
              title="Minimize AI Chat"
            >
              <Minimize2 className="h-5 w-5 mr-2" />
              Minimize
            </button>
          </div>

          {/* Chat Messages */}
          <div ref={chatHistoryRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {chatHistory.length === 0 && aiResponse === "" && (
              <div className="text-center text-gray-500 dark:text-gray-400 py-12">
                <MessageSquare className="h-10 w-10 mx-auto mb-4 opacity-60" />
                <p className="text-lg font-medium">Start a conversation with the AI assistant!</p>
                <p className="text-sm mt-2">Ask about optimal approaches, data structures, or edge cases.</p>
                <div className="mt-6 flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
                  {getContextualPrompts().map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => setAiPrompt(prompt)}
                      className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors border border-blue-200 dark:border-blue-700 shadow-sm"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chatHistory.map((chat, index) => (
              <div key={index} className="space-y-4">
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="max-w-3xl bg-blue-600 text-white p-3 rounded-xl shadow-md">
                    <div className="flex items-center mb-1">
                      <User className="h-4 w-4 mr-2" />
                      <span className="text-sm font-medium">You</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap break-words">{chat.prompt}</p>
                  </div>
                </div>
                {/* AI Response */}
                <AnimatedAiResponse response={chat.response} />
              </div>
            ))}
            {aiLoading && (
              <div className="flex justify-start">
                <div className="max-w-3xl bg-blue-50 dark:bg-blue-900/30 text-gray-900 dark:text-gray-100 p-3 rounded-xl shadow-md">
                  <div className="flex items-center mb-1">
                    <Bot className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium">AI Assistant</span>
                  </div>
                  <div className="flex items-center mt-2">
                    <div className="animate-pulse flex space-x-2">
                      <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
                      <div className="h-2 w-2 bg-blue-400 rounded-full delay-75"></div>
                      <div className="h-2 w-2 bg-blue-400 rounded-full delay-150"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {aiResponse && !aiLoading && chatHistory[chatHistory.length -1]?.response !== aiResponse && (
              <AnimatedAiResponse response={aiResponse} />
            )}
             <div ref={bottomRef} /> {/* For auto-scrolling to bottom */}
          </div>

          {/* AI Chat Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-750 bg-white dark:bg-gray-850 flex-shrink-0 shadow-lg">
            <div className="flex items-center space-x-3">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    generateResponse()
                  }
                }}
                rows={1}
                className="flex-1 p-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none overflow-hidden pr-12 shadow-sm"
                placeholder="Ask the AI assistant about this problem..."
                disabled={aiLoading}
                style={{ maxHeight: '150px' }}
              />
              <button
                onClick={generateResponse}
                disabled={aiLoading}
                className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
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
    )
  }

  // Maximized DSA Visualizer View
  if (isVisualizerMaximized) {
    return (
      <div className="fixed inset-0 bg-gray-100 dark:bg-gray-950 z-50 flex flex-col mt-[64px]">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-750 bg-white dark:bg-gray-850 flex items-center justify-between shadow-sm flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <GraduationCap className="h-5 w-5 mr-3 text-emerald-600" />
            DSA Visualizer Learning
          </h2>
          <button
            onClick={toggleVisualizerMaximized}
            className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors font-medium border border-transparent dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
            title="Minimize Visualizer"
          >
            <Minimize2 className="h-5 w-5 mr-2" />
            Minimize
          </button>
        </div>
        <div className="flex-1">
          <iframe
            src="https://coderarmyrishabh.netlify.app/"
            title="DSA Visualizer"
            className="w-full h-full border-0"
            allowFullScreen
          ></iframe>
        </div>
      </div>
    );
  }

  // Maximized Complexity Analysis AI View
  if (isComplexityAiMaximized) {
    // Function to extract Big O notation and description
    const extractComplexity = (response: string) => {
      const timeMatch = response.match(/Time Complexity\s*[:is]*\s*(O\([^)]+\))/i);
      const spaceMatch = response.match(/Space Complexity\s*[:is]*\s*(O\([^)]+\))/i);

      // Fallback: find first O(...) in the text if not found
      const fallbackO = response.match(/O\([^)]+\)/g);

      const timeComplexity = timeMatch
        ? timeMatch[1]
        : fallbackO && fallbackO.length > 0
          ? fallbackO[0]
          : "N/A";
      const spaceComplexity = spaceMatch
        ? spaceMatch[1]
        : fallbackO && fallbackO.length > 1
          ? fallbackO[1]
          : "N/A";

      // Remove complexity lines from the response to get only the justification
      const justification = response
        .replace(/Time Complexity\s*[:is]*\s*O\([^)]+\)\s*\.?/gi, "")
        .replace(/Space Complexity\s*[:is]*\s*O\([^)]+\)\s*\.?/gi, "")
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
                  value={code}
                  onChange={setCode}
                  language={language}
                  disabled={false}
                  settings={editorSettings} // Pass settings
                  className="h-full w-full"
                  height="100%"
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

  {(submissionResult || runResult) && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] transition-opacity duration-300">
    <div className="bg-white dark:bg-gray-850 border border-gray-300 dark:border-gray-700 rounded-xl shadow-2xl p-6 w-[90%] max-w-md text-center animate-fade-in">
      <div className="text-4xl mb-4">
        {submissionResult?.status === "Accepted" ? "🎉" : "⚠️"}
      </div>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
  {submissionResult?.status === "Accepted" ? (
    potdCoinsEarned ? (
      <>
        🎉 Congratulations! Your POTD solution was accepted.
        <div className="mt-2 text-yellow-500 text-sm">
  💰 You’ve earned <span className="font-semibold">{potdCoinsEarned}</span> CodeCoins!
</div>

      </>
    ) : (
      "🎉 Congratulations! Your solution was accepted."
    )
  ) : (
    "❌ Oops! Your submission didn’t pass."
  )}
</h2>

      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
        {submissionResult?.status || runResult?.status}
      </p>
      <button
        onClick={() => {
          setSubmissionResult(null);
          setRunResult(null);
        }}
        className="px-4 py-2 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 shadow-sm"
      >
        OK
      </button>
    </div>
  </div>
)}

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex flex-col transition-colors duration-200">
      {/* Mobile & Desktop Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden pt-2 md:pt-4">
        {/* Problem Description Panel - Full width on mobile, half width on desktop */}
        <div className="w-full md:w-1/2 flex flex-col bg-white dark:bg-gray-850 md:border-r border-gray-200 dark:border-gray-750 shadow-lg">
          <div className="px-4 md:px-6 pt-4">
            <button
              onClick={() => navigate("/problems")}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center mb-2 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Problems
            </button>
          </div>
          <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-750 flex-shrink-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {problem.title}
            </h1>
            <div className="flex items-center space-x-4">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium border ${getDifficultyColor(problem.difficulty)}`}
              >
                {problem.difficulty}
              </span>
              {isSolved && (
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm rounded-full flex items-center">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Solved
                </span>
              )}
              <span className="text-gray-600 dark:text-gray-400 text-sm">
                Acceptance: {problem.acceptanceRate.toFixed(2)}% ({problem.submissions} submissions)
              </span>
            </div>
          </div>

          <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-900">
            <nav className="flex overflow-x-auto md:overflow-x-visible scrollbar-hide space-x-0" style={{ WebkitOverflowScrolling: 'touch' }}>
              <button
                onClick={() => handleTabChange("description")}
                className={`flex-shrink-0 py-3 px-3 md:px-4 text-xs md:text-sm font-medium text-center border-b-2 transition-all duration-200 min-w-max ${
                  activeTab === "description"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-700 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-900 dark:hover:text-gray-100"
                } flex items-center justify-center space-x-1 md:space-x-2`}
              >
                <BookOpen className="h-4 md:h-5 w-4 md:w-5" />
                <span>Description</span>
              </button>
              <button
                onClick={() => handleTabChange("editorial")}
                className={`flex-shrink-0 py-3 px-3 md:px-4 text-xs md:text-sm font-medium text-center border-b-2 transition-all duration-200 min-w-max ${
                  activeTab === "editorial"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-700 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-900 dark:hover:text-gray-100"
                } flex items-center justify-center space-x-1 md:space-x-2`}
              >
                <FileText className="h-4 md:h-5 w-4 md:w-5" />
                <span>Editorial</span>
              </button>
              <button
                onClick={() => handleTabChange("submissions")}
                className={`flex-shrink-0 py-3 px-3 md:px-4 text-xs md:text-sm font-medium text-center border-b-2 transition-all duration-200 min-w-max ${
                  activeTab === "submissions"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-700 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-900 dark:hover:text-gray-100"
                } flex items-center justify-center space-x-1 md:space-x-2`}
              >
                <History className="h-4 md:h-5 w-4 md:w-5" />
                <span>Submissions</span>
              </button>
              <button
                onClick={() => handleTabChange("solutions")}
                className={`flex-shrink-0 py-3 px-3 md:px-4 text-xs md:text-sm font-medium text-center border-b-2 transition-all duration-200 min-w-max ${
                  activeTab === "solutions"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-700 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-900 dark:hover:text-gray-100"
                } flex items-center justify-center space-x-1 md:space-x-2`}
              >
                <Code className="h-4 md:h-5 w-4 md:w-5" />
                <span>Solutions</span>
              </button>
            </nav>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-gray-900 custom-scrollbar">
            {activeTab === "description" && (
              <div className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-200">
                <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">Problem Description</h2>
                <div dangerouslySetInnerHTML={{ __html: problem.description }} className="mb-6" />

                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Examples</h3>
                {problem.examples.map((example, index) => (
                  <div key={index} className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Example {index + 1}:</p>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">Input:</span>{" "}
                        <pre className="inline bg-gray-200 dark:bg-gray-700 p-1 rounded font-mono text-gray-900 dark:text-gray-100">
                          {example.input}
                        </pre>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">Output:</span>{" "}
                        <pre className="inline bg-gray-200 dark:bg-gray-700 p-1 rounded font-mono text-gray-900 dark:text-gray-100">
                          {example.output}
                        </pre>
                      </div>
                      {example.explanation && (
                        <div>
                          <span className="font-semibold text-gray-800 dark:text-gray-200">Explanation:</span>{" "}
                          <span className="text-gray-700 dark:text-gray-300">{example.explanation}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Constraints</h3>
                <div 
                className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm mb-6"
                dangerouslySetInnerHTML={{ __html: problem.constraints }} />

                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100 mt-6">Tags</h3>
                <div className="flex flex-wrap gap-2 mb-6">
                  {problem.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs font-medium rounded-full border border-blue-200 dark:border-blue-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Companies</h3>
                <div className="flex flex-wrap gap-2">
                  {problem.companies.map((company, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 text-xs font-medium rounded-full border border-purple-200 dark:border-purple-700"
                    >
                      {company}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "editorial" && (
              <div className="text-gray-800 dark:text-gray-200">
                <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">Editorial</h2>
                {editorial ? (
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                    {editorial.written && (
                      <div className="prose dark:prose-invert max-w-none mb-6" dangerouslySetInnerHTML={{ __html: editorial.written }} />
                    )}
                    {editorial.videoUrl && (
                      <div className="mt-4">
                        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Video Editorial</h3>
                        <div className="relative" style={{ paddingBottom: "56.25%", height: 0 }}>
                          <iframe
                            src={editorial.videoUrl}
                            title="Video Editorial"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="absolute top-0 left-0 w-full h-full rounded-lg"
                          ></iframe>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <Video className="h-8 w-8 mx-auto mb-2 opacity-50 text-gray-600 dark:text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-400">Editorial not available yet.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "submissions" && (
              <div className="text-gray-800 dark:text-gray-200">
                <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">Your Submissions</h2>
                {submissions.length > 0 ? (
                  <div className="space-y-4">
                    {submissions.map((submission) => (
                      <div
                        key={submission._id}
                        onClick={() => handleSubmissionClick(submission)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 shadow-sm ${
                          selectedSubmission?._id === submission._id
                            ? "border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(submission.status)}
                            <span className={`font-semibold text-lg ${getStatusColor(submission.status)}`}>
                              {submission.status}
                            </span>
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(submission.date).toLocaleString()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-700 dark:text-gray-300">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1 opacity-70" /> Runtime:{" "}
                            <span className="ml-1 font-medium">{submission.runtime}ms</span>
                          </div>
                          <div className="flex items-center">
                            <Memory className="h-4 w-4 mr-1 opacity-70" /> Memory:{" "}
                            <span className="ml-1 font-medium">{submission.memory}MB</span>
                          </div>
                          <div className="flex items-center col-span-2">
                            <Code className="h-4 w-4 mr-1 opacity-70" /> Language:{" "}
                            <span className="ml-1 font-medium">{submission.language}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <History className="h-8 w-8 mx-auto mb-2 opacity-50 text-gray-600 dark:text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-400">No submissions yet. Run or submit your code!</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "solutions" && (
              <div className="text-gray-800 dark:text-gray-200">
                <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">Official Solutions</h2>
                {solutions.length > 0 ? (
                  <div className="space-y-6">
                    {solutions.map((solution, index) => (
                      <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            Solution ({solution.language})
                          </h3>
                          <button
                            onClick={() => copyToClipboard(solution.completeCode)}
                            className="flex items-center px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium transition-colors border border-transparent dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                          >
                            <Copy className="h-4 w-4 mr-2" /> Copy Code
                          </button>
                        </div>
                        <CodeMirrorEditor
                          value={solution.completeCode}
                          onChange={() => {}} 
                          language={solution.language}
                          disabled={true}
                          className="border border-gray-300 dark:border-gray-700 rounded-lg"
                          height="400px"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <Code className="h-8 w-8 mx-auto mb-2 opacity-50 text-gray-600 dark:text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-400">Official solutions not available yet.</p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Mobile Code Editor Section - Only visible on mobile */}
          <div className="block md:hidden border-t border-gray-200 dark:border-gray-750">
            {/* Mobile Code Editor Header */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center text-sm">
                    <Code className="h-4 w-4 mr-2 text-emerald-500" />
                    Code Editor
                  </h3>
                  <select
                    value={language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="ml-3 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-xs"
                  >
                    <option value="cpp">C++20</option>
                    <option value="java">Java</option>
                    <option value="python">Python</option>
                    <option value="c">C</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Maximize button removed for mobile */}
                  <button
                    onClick={handleResetCode}
                    className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
                    title="Reset Code"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Code Editor */}
            <div className="h-64 border-b border-gray-200 dark:border-gray-750">
              <CodeMirrorEditor
                value={code}
                onChange={setCode}
                language={language}
                disabled={false}
                settings={editorSettings}
                className="h-full w-full"
                height="100%"
              />
            </div>

            {/* Mobile Run/Submit Buttons and Console */}
            <div className="bg-gray-50 dark:bg-gray-900">
              <div className="px-4 py-3 flex items-center justify-end space-x-2 border-b border-gray-200 dark:border-gray-750">
                <button
                  onClick={handleRun}
                  disabled={running || !token}
                  className="flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  title={!token ? "Please login to run code" : ""}
                >
                  {running ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-1"></div>
                      <span className="hidden sm:inline">Running...</span>
                      <span className="sm:hidden">Run</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 mr-1" />
                      Run
                    </>
                  )}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !token}
                  className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  title={!token ? "Please login to submit code" : ""}
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-1"></div>
                      <span className="hidden sm:inline">Submitting...</span>
                      <span className="sm:hidden">Submit</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3 w-3 mr-1" />
                      Submit
                    </>
                  )}
                </button>
              </div>

              {/* Mobile Console Output */}
              <div className="px-4 py-3">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center mb-2 text-sm">
                  <FileText className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                  Console Output
                  {(running || submitting) && (
                    <div className="ml-2 flex items-center">
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-500 border-t-transparent"></div>
                      <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                        {running ? "Running..." : "Submitting..."}
                      </span>
                    </div>
                  )}
                </h4>
                
                <div className="max-h-48 overflow-y-auto bg-gray-100 dark:bg-gray-800 rounded p-3">
                  {(running || submitting) && !runResult && !submissionResult && (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mx-auto mb-2"></div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {running ? "Running your code..." : "Submitting your solution..."}
                      </p>
                    </div>
                  )}

                  {runResult && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 mr-2">Run Result:</span>
                          <span className={`font-semibold text-sm ${getStatusColor(runResult.status)}`}>{runResult.status}</span>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          Passed: {runResult.passedTests}/{runResult.totalTests}
                        </div>
                      </div>
                      {runResult.error ? (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2 text-xs">
                          <div className="text-red-800 dark:text-red-300 font-medium mb-1">Error:</div>
                          <pre className="text-red-700 dark:text-red-200 font-mono break-words whitespace-pre-wrap">{runResult.error}</pre>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-600 dark:text-gray-400">All tests passed!</div>
                      )}
                    </div>
                  )}

                  {submissionResult && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 mr-2">Submission Result:</span>
                          <span className={`font-semibold text-sm ${getStatusColor(submissionResult.status)}`}>{submissionResult.status}</span>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          Passed: {submissionResult.passedTests}/{submissionResult.totalTests}
                        </div>
                      </div>
                      {submissionResult.error ? (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2 text-xs">
                          <div className="text-red-800 dark:text-red-300 font-medium mb-1">Error:</div>
                          <pre className="text-red-700 dark:text-red-200 font-mono break-words whitespace-pre-wrap">{submissionResult.error}</pre>
                        </div>
                      ) : (
                        <div className="text-xs text-green-600 dark:text-green-400 font-medium">🎉 Solution accepted!</div>
                      )}
                    </div>
                  )}

                  {!runResult && !submissionResult && !running && !submitting && (
                    <div className="text-gray-500 dark:text-gray-400 text-xs text-center py-4">
                      <Code className="h-5 w-5 mx-auto mb-1 opacity-50" />
                      <p>Run your code to see the output here...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Code Editor Panel - Hidden on mobile */}
        <div className="hidden md:flex w-1/2 flex-col bg-white dark:bg-gray-850 shadow-lg relative">
          {/* Code Editor Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                  <Code className="h-5 w-5 mr-2 text-emerald-500" />
                  Code Editor
                </h3>
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="ml-4 px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm shadow-sm"
                >
                  <option value="cpp">C++20</option>
                  <option value="java">Java</option>
                  <option value="python">Python</option>
                  <option value="c">C</option>
                </select>
              </div>
              
              {/* Right side container with relative positioning for dropdown */}
              <div className="flex items-center space-x-3 relative">
                {/* Settings Button */}
                <button
                  onClick={handleOpenSettings}
                  className="settings-button p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  title="Editor Settings"
                >
                  <Settings className="h-4 w-4" /> Settings
                </button>

                {/* Action Buttons */}
                {(runResult || submissionResult) && (
                  <button
                    onClick={() => {
                      setRunResult(null)
                      setSubmissionResult(null)
                    }}
                    className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm font-medium border border-transparent dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                    title="Clear Results"
                  >
                    Clear Results
                  </button>
                )}
                <button
                  onClick={handleResetCode}
                  className="flex items-center px-3 py-1.5 bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 text-red-700 dark:text-red-200 rounded-lg transition-colors text-sm font-medium border border-transparent dark:border-red-700 hover:border-red-400 dark:hover:border-red-500"
                  title="Reset code to starting template"
                >
                  <History className="h-4 w-4 mr-2" />
                  Reset Code
                </button>
                <button
                  onClick={toggleCodeEditorMaximized}
                  className="flex items-center px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm font-medium border border-transparent dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                  title="Maximize Code Editor"
                >
                  <Maximize2 className="h-4 w-4 mr-2" />
                  Maximize
                </button>

                {/* Settings Dropdown - Now properly positioned relative to its container */}
                {showSettings && (
                  <div className="settings-dropdown absolute top-12 right-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 z-50 min-w-64">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Editor Settings</h3>
                      <button
                        onClick={handleCloseSettings}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
                        title="Close"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Tab Size</label>
                        <select
                          value={tempEditorSettings.tabSize}
                          onChange={(e) => {
                            setTempEditorSettings({ ...tempEditorSettings, tabSize: Number(e.target.value) });
                          }}
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm"
                        >
                          <option value={2}>2 spaces</option>
                          <option value={4}>4 spaces</option>
                          <option value={8}>8 spaces</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Font Size</label>
                        <select
                          value={tempEditorSettings.fontSize}
                          onChange={(e) => {
                            setTempEditorSettings({ ...tempEditorSettings, fontSize: Number(e.target.value) });
                          }}
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm"
                        >
                          <option value={12}>12px</option>
                          <option value={14}>14px</option>
                          <option value={16}>16px</option>
                          <option value={18}>18px</option>
                        </select>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="wordWrap"
                          checked={tempEditorSettings.wordWrap}
                          onChange={(e) => {
                            setTempEditorSettings({ ...tempEditorSettings, wordWrap: e.target.checked });
                          }}
                          className="mr-2"
                        />
                        <label htmlFor="wordWrap" className="text-sm">Word Wrap</label>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end space-x-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                      <button
                        onClick={handleCloseSettings}
                        className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleApplySettings}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Warnings Section */}
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
                  📝 Viewing code from submission: {selectedSubmission.status} (
                  {new Date(selectedSubmission.date).toLocaleDateString()})
                </p>
              </div>
            )}
          </div>

          {/* Code Editor */}
          <div className="flex-1 relative p-4">
            <div className="absolute inset-4 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden shadow-inner">
              <CodeMirrorEditor
                value={code}
                onChange={setCode}
                language={language}
                disabled={false}
                settings={editorSettings} // Pass settings
                className="h-full w-full"
                height="100%"
              />
            </div>
          </div>

          {/* Run/Submit Buttons and Console */}
          <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-900">
            <div className="p-4 flex items-center justify-end space-x-3">
              <button
                onClick={handleRun}
                disabled={running || !token}
                className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                title={!token ? "Please login to run code" : ""}
              >
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
              <button
                onClick={handleSubmit}
                disabled={submitting || !token}
                className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                title={!token ? "Please login to submit code" : ""}
              >
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

            {/* Console Output (Minimized View) */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-900">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center mb-3">
                <FileText className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                Console Output
                {(running || submitting) && (
                  <div className="ml-2 flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                    <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">
                      {running ? "Running..." : "Submitting..."}
                    </span>
                  </div>
                )}
              </h4>
              <div className="max-h-60 overflow-y-auto bg-gray-100 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700 custom-scrollbar">
                {/* Show loading state */}
                {(running || submitting) && !runResult && !submissionResult && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mx-auto mb-2"></div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {running ? "Running your code..." : "Submitting your solution..."}
                    </p>
                  </div>
                )}

                {runResult && (
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Run Result:</span>
                        <span className={`font-semibold ${getStatusColor(runResult.status)}`}>{runResult.status}</span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Passed: {runResult.passedTests}/{runResult.totalTests}
                      </div>
                    </div>
                    {runResult.error ? (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2 text-sm">
                        <div className="text-red-800 dark:text-red-300 font-medium mb-1">Error:</div>
                        <pre className="text-red-700 dark:text-red-200 font-mono break-words">{runResult.error}</pre>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {runResult.testResults.slice(0, 1).map((result, index) => (
                          <div key={index} className={`border rounded-lg p-2 text-xs ${
                              result.passed
                                ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20"
                                : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center">
                                {result.passed ? (
                                  <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400 mr-1" />
                                ) : (
                                  <XCircle className="h-3 w-3 text-red-600 dark:text-red-400 mr-1" />
                                )}
                                <span className="font-medium text-xs text-gray-900 dark:text-gray-100"> Test Case {index + 1} </span>
                              </div>
                            </div>
                            {!result.passed && (
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Expected:</div>
                                  <pre className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 overflow-x-auto">
                                    {result.expectedOutput}
                                  </pre>
                                </div>
                                <div>
                                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Your Output:
                                  </div>
                                  <pre className="bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-700 p-2 rounded text-red-800 dark:text-red-200 overflow-x-auto">
                                    {result.actualOutput}
                                  </pre>
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
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
                          Submission Result:
                        </span>
                        <span className={`font-semibold ${getStatusColor(submissionResult.status)}`}>
                          {submissionResult.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Passed: {submissionResult.passedTests}/{submissionResult.totalTests}
                      </div>
                    </div>
                    {/* POTD Coin Award Notification */}
                    {submissionResult.potd && submissionResult.potd.awarded && (
                      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl p-3 mb-2 shadow-inner">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="w-6 h-6 bg-yellow-400 dark:bg-yellow-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                              🪙
                            </div>
                          </div>
                          <div className="ml-2">
                            <p className="text-xs text-yellow-700 dark:text-yellow-300">
                              You earned <span className="font-semibold">{submissionResult.potd.coinsEarned} coins</span>!
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {submissionResult.error ? (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2 text-sm">
                        <div className="text-red-800 dark:text-red-300 font-medium mb-1">Error:</div>
                        <pre className="text-red-700 dark:text-red-200 font-mono break-words">{submissionResult.error}</pre>
                      </div>
                    ) : (
                      <div>
                        <div className="grid grid-cols-2 gap-3 text-xs mb-2">
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 text-gray-500 dark:text-gray-400 mr-1" />
                            <span className="text-gray-600 dark:text-gray-300">Runtime:</span>
                            <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                              {submissionResult.executionTime}ms
                            </span>
                          </div>
                          <div className="flex items-center">
                            <Memory className="h-3 w-3 text-gray-500 dark:text-gray-400 mr-1" />
                            <span className="text-gray-600 dark:text-gray-300">Memory:</span>
                            <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                              {submissionResult.memory}MB
                            </span>
                          </div>
                        </div>
                        {submissionResult.testResults.length > 0 && (
                          <div className="space-y-1">
                            <h4 className="font-semibold text-xs text-gray-900 dark:text-gray-100">
                              Test Results (First 3):
                            </h4>
                            {submissionResult.testResults.slice(0, 3).map((result, index) => (
                              <div key={index} className={`border rounded-lg p-2 ${
                                  result.passed
                                    ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20"
                                    : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center">
                                    {result.passed ? (
                                      <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400 mr-1" />
                                    ) : (
                                      <XCircle className="h-3 w-3 text-red-600 dark:text-red-400 mr-1" />
                                    )}
                                    <span className="font-medium text-xs text-gray-900 dark:text-gray-100"> Test Case {index + 1} </span>
                                  </div>
                                </div>
                                {!result.passed && (
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Expected:</div>
                                      <pre className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 overflow-x-auto">
                                        {result.expectedOutput}
                                      </pre>
                                    </div>
                                    <div>
                                      <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Your Output:
                                      </div>
                                      <pre className="bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-700 p-2 rounded text-red-800 dark:text-red-200 overflow-x-auto">
                                        {result.actualOutput}
                                      </pre>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {!runResult && !submissionResult && !running && !submitting && (
                  <div className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                    <Code className="h-6 w-6 mx-auto mb-1 opacity-50" />
                    <p>Run your code to see the output here...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Floating Buttons Container */}
          <div className="fixed bottom-4 md:bottom-8 right-4 md:right-8 z-40 flex flex-col space-y-2 md:space-y-4">
            {/* DSA Visualizer Learning Button */}
            <button
              onClick={handleDsaVisualizerClick}
              className="p-3 md:p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-emerald-500 focus:ring-opacity-75 animate-bounce-slow"
              title="DSA Visualizer Learning"
              style={{ width: '78px', height: '78px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <GraduationCap className="h-8 md:h-10 w-8 md:w-10" />
            </button>

            {/* Analyse Time and Space Complexity Button */}
            <button
              onClick={toggleComplexityAiMaximized}
              className="p-3 md:p-4 bg-orange-600 hover:bg-orange-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-orange-500 focus:ring-opacity-75 animate-bounce-slow"
              title="Analyse Time and Space Complexity of Current Code"
              style={{ width: '78px', height: '78px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Zap className="h-8 md:h-10 w-8 md:w-10" />
            </button>

            {/* Existing Floating AI Chat Button */}
            <button
              onClick={toggleAiMaximized}
              className="p-3 md:p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-opacity-75 animate-bounce-slow"
              title="Open AI Chat"
              style={{ width: '78px', height: '78px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Bot className="h-8 md:h-10 w-8 md:w-10" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProblemDetail
