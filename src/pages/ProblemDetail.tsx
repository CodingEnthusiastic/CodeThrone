"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useParams } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import axios from "axios"
import { showError, showSuccess, showInfo } from '../utils/toast';
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
  ArrowDown,
  Trophy,
} from "lucide-react"
import CodeMirrorEditor from "../components/CodeMirrorEditor"
import ConsoleOutput from "../components/ConsoleOutput"
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
  const [selectedSolutionLanguage, setSelectedSolutionLanguage] = useState<string>("cpp")
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
  // Console output ref for auto-scrolling
  const consoleOutputRef = useRef<HTMLDivElement>(null);
  // Active test case tab states
  const [activeTestCaseTab, setActiveTestCaseTab] = useState(0);
  const [activeSubmissionTestCaseTab, setActiveSubmissionTestCaseTab] = useState(0);
  // Result card overlay states
  const [showResultCard, setShowResultCard] = useState(false);
  const [resultCardData, setResultCardData] = useState<{
    type: 'success' | 'failure';
    title: string;
    message: string;
    testCases: { passed: number; total: number };
    executionTime?: number;
    memory?: number;
    coinsEarned?: number;
  } | null>(null);


  // Auto-scroll chat to bottom in both minimized and maximized mode when new answer appears
  useEffect(() => {
    if (chatHistoryRef.current) {
      requestAnimationFrame(() => {
        chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight
      })
    }
  }, [chatHistory, aiResponse, isAiMaximized])

  // Auto-scroll to console output when results are available
  useEffect(() => {
    if ((runResult || submissionResult) && consoleOutputRef.current) {
      setTimeout(() => {
        consoleOutputRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
    }
  }, [runResult, submissionResult]);

  // Manual scroll to bottom handler
  const scrollChatToBottom = () => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight
    }
  }

  // Scroll to console/bottom of page
  const scrollToBottom = () => {
    if (consoleOutputRef.current) {
      consoleOutputRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    } else {
      // Fallback to scroll to bottom of page
      window.scrollTo({ 
        top: document.body.scrollHeight, 
        behavior: 'smooth' 
      });
    }
  }

  // Show result card overlay
  const showResultCardWithData = (data: {
    type: 'success' | 'failure';
    title: string;
    message: string;
    testCases: { passed: number; total: number };
    executionTime?: number;
    memory?: number;
    coinsEarned?: number;
  }) => {
    setResultCardData(data);
    setShowResultCard(true);
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
      // console.error("Error fetching problem:", error)
      showError("Failed to load problem details");
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
      const fetchedSolutions = response.data.solutions;
      setSolutions(fetchedSolutions);
      
      // Auto-select first available language
      if (fetchedSolutions.length > 0) {
        const availableLanguages = ['cpp', 'java', 'python', 'c'];
        const firstAvailable = availableLanguages.find(lang => 
          fetchedSolutions.some((sol: Solution) => sol.language === lang)
        );
        if (firstAvailable) {
          setSelectedSolutionLanguage(firstAvailable);
        }
      }
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
    tabSize: 4, // Default to 4 spaces
    insertSpaces: true,
    fontSize: 14,
    lineNumbers: true,
    wordWrap: false,
  });

  // Temporary settings for the dropdown (before applying)
  const [tempEditorSettings, setTempEditorSettings] = useState({
    tabSize: 4,
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
      // console.error("Error running code:", error)
      showError("Failed to run code: " + (error.response?.data?.message || "Please try again"));
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

        // Show result card overlay
        showResultCardWithData({
          type: 'success',
          title: '🎉 Solution Accepted!',
          message: 'Congratulations! Your solution passed all test cases.',
          testCases: {
            passed: response.data.passedTests || 0,
            total: response.data.totalTests || 0
          },
          executionTime: response.data.executionTime,
          memory: response.data.memory,
          coinsEarned: response.data.potd?.awarded ? response.data.potd.coinsEarned : undefined
        });

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
      } else {
        // Show result card overlay for failure
        showResultCardWithData({
          type: 'failure',
          title: '❌ Solution Failed',
          message: 'Your solution didn\'t pass all test cases. Keep trying!',
          testCases: {
            passed: response.data.passedTests || 0,
            total: response.data.totalTests || 0
          },
          executionTime: response.data.executionTime,
          memory: response.data.memory
        });
      }


      if (activeTab === "submissions") {
        fetchSubmissions()
      }
    } catch (error: any) {
      // console.error("Error submitting solution:", error)
      showError("Submission failed: " + (error.response?.data?.message || "Please try again"));
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

      // Show result card overlay for error
      showResultCardWithData({
        type: 'failure',
        title: '❌ Submission Error',
        message: 'There was an error submitting your solution. Please try again.',
        testCases: { passed: 0, total: 0 }
      });
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
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleRun}
                  disabled={running || !token}
                  className="flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
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
                  className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
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
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
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
                    className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm font-medium border border-transparent dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                    title="Clear Results"
                  >
                    Clear Results
                  </button>
                )}
              </div>
              <button
                onClick={toggleCodeEditorMaximized}
                className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors font-medium border border-transparent dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 ml-2"
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
                  onGoToBottom={scrollToBottom}
                  token={token || undefined}
                />
              </div>
            </div>
          </div>

          {/* Console/Results Panel */}
                    {/* Enhanced Console/Results Panel with Public Test Cases */}
          <div className="w-96 bg-white dark:bg-gray-800 flex flex-col shadow-lg border-l border-gray-200 dark:border-gray-700">
            {/* Console Header */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
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

            <div ref={consoleOutputRef} className="flex-1 p-4 overflow-y-auto bg-white dark:bg-gray-850 min-h-[400px]">
              {/* Show loading state */}
              {(running || submitting) && !runResult && !submissionResult && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">
                    {running ? "Running your code..." : "Submitting your solution..."}
                  </p>
                </div>
              )}

              {/* Enhanced LeetCode-style Run Result */}
              {runResult && !submissionResult && (
                <div className="space-y-4">
                  {/* Status Header */}
                  <div className={`flex items-center space-x-3 px-4 py-3 rounded-lg ${
                    runResult.status === "Accepted" || runResult.status === "Success"
                      ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" 
                      : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                  }`}>
                    {runResult.status === "Accepted" || runResult.status === "Success" ? (
                      <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    )}
                    <div>
                      <div className={`font-bold text-lg ${
                        runResult.status === "Accepted" || runResult.status === "Success"
                          ? "text-green-700 dark:text-green-300" 
                          : "text-red-700 dark:text-red-300"
                      }`}>
                        Run Result: {runResult.status === "Success" ? "Accepted" : runResult.status}
                      </div>
                      {runResult.passedTests !== undefined && runResult.totalTests !== undefined && (
                        <div className="text-gray-600 dark:text-gray-400 text-sm">
                          Passed: {runResult.passedTests}/{runResult.totalTests} • Runtime: {runResult.executionTime || 0}ms
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Test Case Navigation */}
                  {runResult.testResults && runResult.testResults.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                      {/* Test Case Tabs */}
                      <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex overflow-x-auto">
                          {runResult.testResults.map((result, index) => (
                            <button
                              key={index}
                              onClick={() => setActiveTestCaseTab(index)}
                              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200 flex items-center space-x-2 ${
                                activeTestCaseTab === index
                                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800'
                                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                              }`}
                            >
                              {result.passed ? (
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              ) : (
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              )}
                              <span>Case {index + 1}</span>
                              {result.passed ? (
                                <span className="text-green-600 dark:text-green-400">- Passed</span>
                              ) : (
                                <span className="text-red-600 dark:text-red-400">- Failed</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Test Case Content */}
                      {runResult.testResults[activeTestCaseTab] && (
                        <div className="p-4 space-y-4">
                          {/* Input Section */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Input</h4>
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                              <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                                {runResult.testResults[activeTestCaseTab].input || 'No input data'}
                              </pre>
                            </div>
                          </div>

                          {/* Output Section */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Output</h4>
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                              <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                                {runResult.testResults[activeTestCaseTab].actualOutput || 'No output'}
                              </pre>
                            </div>
                          </div>

                          {/* Expected Section */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Expected</h4>
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                              <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                                {runResult.testResults[activeTestCaseTab].expectedOutput || 'No expected output'}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error Display */}
                  {runResult.error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
                        <span className="text-red-800 dark:text-red-300 font-medium">Error</span>
                      </div>
                      <pre className="text-red-700 dark:text-red-200 text-sm font-mono whitespace-pre-wrap">
                        {runResult.error}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Enhanced LeetCode-style Submission Result */}
              {submissionResult && (
                <div className="space-y-4">
                  {/* Status Header */}
                  <div className={`flex items-center space-x-3 px-4 py-3 rounded-lg ${
                    submissionResult.status === "Accepted"
                      ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" 
                      : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                  }`}>
                    {submissionResult.status === "Accepted" ? (
                      <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    )}
                    <div>
                      <div className={`font-bold text-lg ${
                        submissionResult.status === "Accepted"
                          ? "text-green-700 dark:text-green-300" 
                          : "text-red-700 dark:text-red-300"
                      }`}>
                        {submissionResult.status}
                      </div>
                      {submissionResult.passedTests !== undefined && submissionResult.totalTests !== undefined && (
                        <div className="text-gray-600 dark:text-gray-400 text-sm">
                          Passed: {submissionResult.passedTests}/{submissionResult.totalTests} • Runtime: {submissionResult.executionTime || 0}ms
                        </div>
                      )}
                    </div>
                  </div>

                  {/* POTD Coin Award Notification */}
                  {submissionResult.potd && submissionResult.potd.awarded && (
                    <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-yellow-400 dark:bg-yellow-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
                          🪙
                        </div>
                        <div className="ml-3">
                          <h4 className="text-sm font-bold text-yellow-800 dark:text-yellow-200">Problem of the Day Bonus!</h4>
                          <p className="text-xs text-yellow-700 dark:text-yellow-300">
                            You earned <span className="font-semibold">{submissionResult.potd.coinsEarned} coins</span>!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submission Error Display */}
                  {submissionResult.error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
                        <span className="text-red-800 dark:text-red-300 font-medium">Error</span>
                      </div>
                      <pre className="text-red-700 dark:text-red-200 text-sm font-mono whitespace-pre-wrap">
                        {submissionResult.error}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Default Public Test Cases View (shown when no run/submit results) */}
              {!runResult && !submissionResult && !running && !submitting && problem?.testCases && (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">Testcase</h4>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">Test Result</h4>
                      </div>
                    </div>

                    {/* Test Case Tabs */}
                    <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
                      <div className="flex overflow-x-auto">
                        {problem.testCases.filter((tc: any) => tc.isPublic).map((testCase: any, index: number) => (
                          <button
                            key={index}
                            onClick={() => setActiveTestCaseTab(index)}
                            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200 ${
                              activeTestCaseTab === index
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800'
                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                            }`}
                          >
                            Case {index + 1}
                          </button>
                        ))}
                        <button className="px-4 py-3 text-sm font-medium text-gray-400 dark:text-gray-500 cursor-not-allowed">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Test Case Content */}
                    {problem.testCases.filter((tc: any) => tc.isPublic)[activeTestCaseTab] && (
                      <div className="p-4 space-y-4">
                        {/* Input Section */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Input</h4>
                          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                            <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                              {problem.testCases.filter((tc: any) => tc.isPublic)[activeTestCaseTab]?.input || 'No input data'}
                            </pre>
                          </div>
                        </div>

                        {/* Expected Output Section */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Expected</h4>
                          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                            <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                              {problem.testCases.filter((tc: any) => tc.isPublic)[activeTestCaseTab]?.output || 'No expected output'}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ready to Test Message */}
                  <div className="text-center py-6">
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                      <Code className="h-6 w-6 text-gray-400" />
                    </div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Ready to test?</h4>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Run your code to see output</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>
        </div>
      // </div>
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
                  onGoToBottom={scrollToBottom}
                  token={token || undefined}
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
            
            {/* Go to Bottom Button */}
            <div className="mt-3">
              <button
                onClick={scrollToBottom}
                className="flex items-center px-3 py-2 bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 text-sm"
              >
                <ArrowDown className="h-4 w-4 mr-2" />
                Go to Bottom
              </button>
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
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Official Solutions</h2>
                {solutions.length > 0 ? (
                  <div>
                    {/* Language Selection Buttons */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {(['cpp', 'java', 'python', 'c'] as const).map((lang) => {
                        const solution = solutions.find(s => s.language === lang);
                        const isActive = selectedSolutionLanguage === lang;
                        const isAvailable = !!solution;
                        
                        return (
                          <button
                            key={lang}
                            onClick={() => isAvailable && setSelectedSolutionLanguage(lang)}
                            disabled={!isAvailable}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                              isActive && isAvailable
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                : isAvailable
                                ? 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                            }`}
                          >
                            {lang === 'cpp' ? 'C++' : 
                             lang === 'java' ? 'Java' : 
                             lang === 'python' ? 'Python' : 
                             'C'}
                            {!isAvailable && (
                              <span className="ml-1 text-xs">✕</span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Selected Solution Display */}
                    {(() => {
                      const selectedSolution = solutions.find(s => s.language === selectedSolutionLanguage);
                      
                      if (selectedSolution) {
                        return (
                          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {selectedSolutionLanguage === 'cpp' ? 'C++' : 
                                 selectedSolutionLanguage === 'java' ? 'Java' : 
                                 selectedSolutionLanguage === 'python' ? 'Python' : 
                                 'C'} Solution
                              </h3>
                              <button
                                onClick={() => copyToClipboard(selectedSolution.completeCode)}
                                className="flex items-center px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium transition-colors border border-transparent dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                              >
                                <Copy className="h-4 w-4 mr-2" /> Copy Code
                              </button>
                            </div>
                            <div className="p-4">
                              <CodeMirrorEditor
                                value={selectedSolution.completeCode}
                                onChange={() => {}} 
                                language={selectedSolution.language}
                                disabled={true}
                                className="border border-gray-300 dark:border-gray-600 rounded-lg"
                                height="300px"
                                onGoToBottom={scrollToBottom}
                              />
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="text-center py-8 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                            <Code className="h-8 w-8 mx-auto mb-2 opacity-50 text-gray-600 dark:text-gray-400" />
                            <p className="text-gray-600 dark:text-gray-400">
                              Solution not available for {selectedSolutionLanguage === 'cpp' ? 'C++' : 
                                                         selectedSolutionLanguage === 'java' ? 'Java' : 
                                                         selectedSolutionLanguage === 'python' ? 'Python' : 
                                                         'C'}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                              Try selecting a different language from the buttons above.
                            </p>
                          </div>
                        );
                      }
                    })()}
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
                    title="Reset"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Code Editor */}
            <div>
              <CodeMirrorEditor
                value={code}
                onChange={setCode}
                language={language}
                disabled={false}
                settings={editorSettings}
                className="w-full"
                height="24rem"
                onGoToBottom={scrollToBottom}
                token={token || undefined}
              />
            </div>

            {/* Mobile Console Output - Only console, no duplicate buttons */}
            <div className="bg-gray-50 dark:bg-gray-900">
              <ConsoleOutput 
                ref={consoleOutputRef}
                publicTestCases={problem?.testCases?.filter((tc: any) => tc.isPublic) || []}
                runResult={runResult}
                submissionResult={submissionResult}
                running={running}
                submitting={submitting}
              />
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
                  Editor
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
                {/* Run and Submit Buttons */}
                <button
                  onClick={handleRun}
                  disabled={running || !token}
                  className="flex items-center px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 text-sm"
                  title={!token ? "Please login to run code" : ""}
                >
                  {running ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-1.5"></div>
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 mr-1.5" />
                      Run
                    </>
                  )}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !token}
                  className="flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 text-sm"
                  title={!token ? "Please login to submit code" : ""}
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-1.5"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-3 w-3 mr-1.5" />
                      Submit
                    </>
                  )}
                </button>

                {/* Settings Button */}
                <button
                  onClick={handleOpenSettings}
                  className="settings-button p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  title="Editor Settings"
                >
                  <Settings className="h-4 w-4" />
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
                  Reset
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
                onGoToBottom={scrollToBottom}
                token={token || undefined}
              />
            </div>
          </div>

          {/* Console Output Component - Below code editor */}
          <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-900">
            <ConsoleOutput 
              ref={consoleOutputRef}
              publicTestCases={problem?.testCases?.filter((tc: any) => tc.isPublic) || []}
              runResult={runResult}
              submissionResult={submissionResult}
              running={running}
              submitting={submitting}
            />
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

      {/* Result Card Overlay */}
      {showResultCard && resultCardData && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`relative max-w-lg w-full mx-4 transform transition-all duration-500 scale-100 ${
            resultCardData.type === 'success' 
              ? 'bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 border-green-300 dark:from-green-900/30 dark:via-emerald-900/20 dark:to-green-800/30 dark:border-green-600' 
              : 'bg-gradient-to-br from-red-50 via-rose-50 to-red-100 border-red-300 dark:from-red-900/30 dark:via-rose-900/20 dark:to-red-800/30 dark:border-red-600'
          } border-2 rounded-2xl shadow-2xl overflow-hidden`}>
            
            {/* Premium Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full ${
                resultCardData.type === 'success' ? 'bg-green-400' : 'bg-red-400'
              } blur-3xl transform translate-x-16 -translate-y-16`}></div>
              <div className={`absolute bottom-0 left-0 w-24 h-24 rounded-full ${
                resultCardData.type === 'success' ? 'bg-emerald-400' : 'bg-rose-400'
              } blur-2xl transform -translate-x-12 translate-y-12`}></div>
            </div>

            {/* Close Button */}
            <button 
              onClick={() => {
                setShowResultCard(false)
                setResultCardData(null)
              }}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors text-gray-600 dark:text-gray-300"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <div className="relative p-8 text-center">
              {/* Success/Failure Icon with Animation */}
              <div className="relative mb-6">
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${
                  resultCardData.type === 'success' 
                    ? 'bg-green-100 border-4 border-green-300 dark:bg-green-800/50 dark:border-green-500' 
                    : 'bg-red-100 border-4 border-red-300 dark:bg-red-800/50 dark:border-red-500'
                } animate-pulse`}>
                  {resultCardData.type === 'success' ? (
                    <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
                  )}
                </div>
              </div>

              {/* Title with Gradient Text */}
              <h2 className={`text-3xl font-bold mb-3 bg-gradient-to-r ${
                resultCardData.type === 'success' 
                  ? 'from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400' 
                  : 'from-red-600 to-rose-600 dark:from-red-400 dark:to-rose-400'
              } bg-clip-text text-transparent`}>
                {resultCardData.title}
              </h2>

              {/* Message */}
              <p className={`text-lg mb-6 ${
                resultCardData.type === 'success' 
                  ? 'text-green-700 dark:text-green-200' 
                  : 'text-red-700 dark:text-red-200'
              }`}>
                {resultCardData.message}
              </p>
              
              {/* Test Cases Card */}
              <div className={`inline-flex items-center px-6 py-3 rounded-xl mb-6 ${
                resultCardData.type === 'success' 
                  ? 'bg-green-200/50 border border-green-300 text-green-800 dark:bg-green-800/30 dark:border-green-600 dark:text-green-200' 
                  : 'bg-red-200/50 border border-red-300 text-red-800 dark:bg-red-800/30 dark:border-red-600 dark:text-red-200'
              } backdrop-blur-sm`}>
                <div className={`w-3 h-3 rounded-full mr-3 ${
                  resultCardData.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                } animate-pulse`}></div>
                <span className="font-semibold">
                  Test Cases: {resultCardData.testCases.passed}/{resultCardData.testCases.total} passed
                </span>
              </div>

              {/* Performance Stats */}
              {(resultCardData.executionTime !== undefined || resultCardData.memory !== undefined) && (
                <div className="flex justify-center space-x-4 mb-6">
                  {resultCardData.executionTime !== undefined && (
                    <div className={`px-4 py-2 rounded-lg ${
                      resultCardData.type === 'success' 
                        ? 'bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-200' 
                        : 'bg-red-100 dark:bg-red-800/30 text-red-800 dark:text-red-200'
                    }`}>
                      <div className="text-sm font-medium">Runtime</div>
                      <div className="text-lg font-bold">{resultCardData.executionTime}ms</div>
                    </div>
                  )}
                  {resultCardData.memory !== undefined && (
                    <div className={`px-4 py-2 rounded-lg ${
                      resultCardData.type === 'success' 
                        ? 'bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-200' 
                        : 'bg-red-100 dark:bg-red-800/30 text-red-800 dark:text-red-200'
                    }`}>
                      <div className="text-sm font-medium">Memory</div>
                      <div className="text-lg font-bold">{resultCardData.memory}MB</div>
                    </div>
                  )}
                </div>
              )}

              {/* Coins Earned for Success */}
              {resultCardData.type === 'success' && resultCardData.coinsEarned && (
                <div className="mb-6 p-4 bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 rounded-xl border border-yellow-300 dark:border-yellow-600">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-8 h-8 bg-yellow-400 dark:bg-yellow-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
                      🪙
                    </div>
                    <span className="text-xl font-bold text-yellow-800 dark:text-yellow-200">
                      +{resultCardData.coinsEarned} Coins Earned!
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-4 justify-center">
                {resultCardData.type === 'failure' ? (
                  <>
                    <button
                      onClick={() => {
                        setShowResultCard(false)
                        setResultCardData(null)
                      }}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50"
                    >
                      <Code className="w-4 h-4 mr-2 inline" />
                      Try Again
                    </button>
                    <button
                      onClick={() => navigate('/problems')}
                      className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-gray-500 focus:ring-opacity-50"
                    >
                      Other Problems
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => navigate('/problems')}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-green-500 focus:ring-opacity-50"
                    >
                      <Trophy className="w-4 h-4 mr-2 inline" />
                      Solve More Problems
                    </button>
                    <button
                      onClick={() => {
                        setShowResultCard(false)
                        setResultCardData(null)
                      }}
                      className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-gray-500 focus:ring-opacity-50"
                    >
                      Continue Coding
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProblemDetail
