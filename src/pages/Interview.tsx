"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import axios from "axios"
import { Video, Mic, MicOff, VideoOff, User, Bot, Send, RotateCcw, X, Volume2, VolumeX } from "lucide-react"
import { useAuth } from '../contexts/AuthContext' // Import your auth context
import { useTheme } from '../contexts/ThemeContext' // Import theme context
import { API_URL, SOCKET_URL } from "../config/api";
/*
 * AI VIDEO SETUP INSTRUCTIONS:
 * 1. Download the video from: https://youtu.be/1bdKVv5iyEQ
 * 2. Convert it to MP4 format
 * 3. Place the video file in the public folder as: public/ai-avatar.mp4
 * 4. The video will automatically play when AI is speaking and pause when finished
 * 5. The same video plays for all domains/roles
 */

interface InterviewSession {
  sessionId: string
  question: string
  questionNumber: number
  expectedTopics: string[]
  difficulty: string
  evaluation?: {
    score: number
    feedback: string
    strengths: string[]
    improvements: string[]
    technicalAccuracy: number
    communication: number
    depth: number
  }
  isComplete: boolean
}

interface FinalReport {
  overallScore: number
  recommendation: string
  summary: string
  technicalSkills: { score: number; feedback: string }
  communication: { score: number; feedback: string }
  problemSolving: { score: number; feedback: string }
  videoPresence: { score: number; feedback: string }
  strengths: string[]
  areasForImprovement: string[]
  detailedFeedback: string
}

// Add these interfaces at the top after the existing interfaces
interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null
  onend: ((this: SpeechRecognition, ev: Event) => any) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null
  start(): void
  stop(): void
  abort(): void
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

const Interview: React.FC = () => {
  // Ref for result div
  const resultDivRef = useRef<HTMLDivElement>(null);

  
  const { token, user } = useAuth()
  const { isDark } = useTheme()
  const [session, setSession] = useState<InterviewSession | null>(null)
  const [videoEnabled, setVideoEnabled] = useState(false)
  const [micEnabled, setMicEnabled] = useState(false)
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([])
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [videoOnTime, setVideoOnTime] = useState(0)
  const [totalTime, setTotalTime] = useState(0)
  const [currentAnswer, setCurrentAnswer] = useState("")
  const [scores, setScores] = useState<number[]>([])
  const [role, setRole] = useState("Frontend Developer")
  const [experience, setExperience] = useState("2")
  const [loading, setLoading] = useState(false)
  const [finalReport, setFinalReport] = useState<FinalReport | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speechEnabled, setSpeechEnabled] = useState(true)
  const [waitingForNextQuestion, setWaitingForNextQuestion] = useState(false)
  const [isAISpeaking, setIsAISpeaking] = useState(false)

  // ✅ ADD MISSING STATE: Voice language
  const [voiceLanguage, setVoiceLanguage] = useState("en-US")
  
  // ✅ ENHANCED: Robust speech recognition state
  const [isListening, setIsListening] = useState(false)
  const [recognitionError, setRecognitionError] = useState<string | null>(null)
  const [interimTranscript, setInterimTranscript] = useState("")
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(false)
  const [recognitionRestarting, setRecognitionRestarting] = useState(false)
  const [manualStop, setManualStop] = useState(false)
  const [submitAllowed, setSubmitAllowed] = useState(true) // ✅ NEW: Separate state for submit button

  const videoRef = useRef<HTMLVideoElement>(null)
  const aiVideoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recordingIntervalRef = useRef<number | null>(null)
  const recognitionRef = useRef<any>(null)
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)

  // Helper to handle API errors
const handleApiError = (error: any, context: string) => {
  let message = "An unexpected error occurred.";
  if (error.response) {
    const status = error.response.status;
    if (status === 401) {
      message = "Authentication failed. Please log in again.";
      console.error(`[${context}] ❌ 401 Unauthorized: Token expired or invalid.`);
    } else if (status === 403) {
      message = "Access denied. Your API token may be exhausted or you lack permission.";
      console.error(`[${context}] ❌ 403 Forbidden: API tokens may be used up, or Gemini API quota issue.`);
    } else if (status >= 400 && status < 500) {
      message = error.response.data?.message || "Client error. Please check your input or try again.";
      console.error(`[${context}] ❌ ${status} Client Error: ${message}`);
    } else if (status >= 500) {
      message = "Server error. Please try again later.";
      console.error(`[${context}] ❌ ${status} Server Error: Gemini API or backend issue.`);
    }
  } else if (error.request) {
    message = "No response from server. Please check your internet connection.";
    console.error(`[${context}] ❌ No response from server.`);
  } else {
    message = error.message || "Unknown error.";
    console.error(`[${context}] ❌ Error: ${message}`);
  }
  setRecognitionError(message);
}

  // Text-to-speech function
  const speakText = (text: string) => {
    if (!("speechSynthesis" in window)) return

    // Stop any current speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 0.8

    // Try to use a professional voice
    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find(
      (voice) => voice.name.includes("Google") || voice.name.includes("Microsoft") || voice.lang.startsWith("en"),
    )
    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    utterance.onstart = () => {
      setIsAISpeaking(true)
      setIsSpeaking(true)
      // Start AI video
      if (aiVideoRef.current) {
        aiVideoRef.current.play().catch(console.error)
      }
    }
    
    utterance.onend = () => {
      setIsAISpeaking(false)
      setIsSpeaking(false)
      // Stop AI video
      if (aiVideoRef.current) {
        aiVideoRef.current.pause()
        aiVideoRef.current.currentTime = 0
      }
    }
    
    utterance.onerror = () => {
      setIsAISpeaking(false)
      setIsSpeaking(false)
      // Stop AI video on error
      if (aiVideoRef.current) {
        aiVideoRef.current.pause()
        aiVideoRef.current.currentTime = 0
      }
    }

    speechSynthesisRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }

  // Stop speech
  const stopSpeaking = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel()
      setIsAISpeaking(false)
      setIsSpeaking(false)
      // Stop AI video
      if (aiVideoRef.current) {
        aiVideoRef.current.pause()
        aiVideoRef.current.currentTime = 0
      }
    }
  }

  // Calculate video score
  const calculateVideoScore = () => {
    if (totalTime === 0) return 0
    return Math.ceil((videoOnTime * 10) / totalTime)
  }

  // Stop interview function
  const stopInterview = async () => {
    if (
      window.confirm(
        "Are you sure you want to stop the interview? This will end the current session and return to the setup page.",
      )
    ) {
      try {
        // Stop all media and recognition
        stopSpeaking()
        setManualStop(true)
        if (isListening) {
          stopListening()
        }
        disableVideo()
        {/* Mobile-only: Continue to Next Question button */}
        {session?.evaluation && !session.isComplete && (
          <button
            className="w-full mt-2 py-3 rounded-md bg-green-600 text-white font-semibold text-lg shadow hover:bg-green-700 transition block md:hidden"
            onClick={proceedToNextQuestion}
            disabled={loading}
          >
            Continue to Next Question
          </button>
        )}

        // Clear all timeouts
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current)
        }
        if (recognitionRef.current) {
          recognitionRef.current.stop()
        }
        stopSpeaking()
      } catch (error) {
        console.error("Error stopping interview:", error)
      } finally {
        // Reset all states to initial values
        setSession(null)
        setScores([])
        setVideoOnTime(0)
        setTotalTime(0)
        setStartTime(null)
        setFinalReport(null)
        setCurrentAnswer("")
        setTranscript("")
        setInterimTranscript("")
        setRecognitionError(null)
        setLoading(false)
        setIsUploading(false)
        setRecognitionRestarting(false)
        setManualStop(false)
      }
    }
  }

  
  // Scroll to result div when result is shown
  useEffect(() => {
    if ((session?.evaluation || finalReport) && resultDivRef.current) {
      resultDivRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [session?.evaluation, finalReport]);
  
  useEffect(() => {
    return () => {
      // Enhanced cleanup for robust speech recognition
      setManualStop(true)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (error) {
          console.warn("Error stopping recognition during cleanup:", error)
        }
      }
      stopSpeaking()
    }
  }, [])

  useEffect(() => {
    // Update video on time
    if (videoEnabled && startTime) {
      const interval = setInterval(() => {
        setVideoOnTime((prev) => prev + 1)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [videoEnabled, startTime])

  useEffect(() => {
    if (videoEnabled) {
      const timeout = setTimeout(() => {
        if (videoRef.current) {
          enableVideo()
        } else {
          console.warn("⛔ videoRef still not ready after timeout, skipping enableVideo")
          setRecognitionError("Video could not be enabled. Try again.")
          setVideoEnabled(false)
        }
      }, 200)

      return () => clearTimeout(timeout)
    }
  }, [videoEnabled])

  useEffect(() => {
    // Update total time
    if (startTime) {
      const interval = setInterval(() => {
        setTotalTime((prev) => prev + 1)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [startTime])

  useEffect(() => {
    if (session && startTime && token) {
      const interval = setInterval(async () => {
        try {
          await axios.post(`${API_URL}/interview/update-timing`, {
            sessionId: session.sessionId,
            videoOnTime,
            totalTime,
          }, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        } catch (error: any) {
          console.error("Error updating timing:", error)
          if (error.response?.status === 401) {
            console.error("❌ Token expired during timing update")
          }
        }
      }, 10000)
      return () => clearInterval(interval)
    }
  }, [session, videoOnTime, totalTime, token])

  // ✅ FIXED: Robust speech recognition with proper restart mechanism
  useEffect(() => {
    console.log("🎤 Initializing enhanced speech recognition...")
    
    // Check browser support 
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      console.warn("❌ Speech recognition not supported in this browser")
      setSpeechRecognitionSupported(false)
      setRecognitionError("Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.")
      return
    }

    setSpeechRecognitionSupported(true)
    
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognitionAPI()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = voiceLanguage
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      console.log("🎤 Speech recognition result received, results length:", event.results.length)
      
      let finalText = ""
      let interimText = ""

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript
        console.log(`🎤 Result ${i}: "${transcript}", isFinal: ${event.results[i].isFinal}`)
        
        if (event.results[i].isFinal) {
          finalText += transcript
          console.log("🎤 Final transcript added:", transcript)
        } else {
          interimText += transcript
        }
      }

      if (finalText.trim()) {
        console.log("🎤 Adding final text to answer:", finalText.trim())
        // Only add to currentAnswer, remove duplicate addition to finalTranscriptRef
        setCurrentAnswer((prev) => {
          // Remove any interim text first to prevent duplication
          const cleanPrev = prev.replace(interimTranscript.trim(), "").trim()
          const newAnswer = cleanPrev + (cleanPrev ? " " : "") + finalText.trim()
          console.log("🎤 New answer:", newAnswer)
          return newAnswer
        })
        // Clear interim transcript since it's now final
        setInterimTranscript("")
      }
      
      if (interimText !== interimTranscript) {
        console.log("🎤 Updating interim transcript:", interimText)
        setInterimTranscript(interimText)
      }
    }

    recognition.onerror = (event) => {
      console.error("🎤 Speech recognition error:", event.error)
      
      if (event.error === "aborted") {
        console.log("🎤 Speech recognition aborted (likely manual stop)")
        setIsListening(false)
        setRecognitionRestarting(false)
        return
      }
      
      if (event.error === "no-speech") {
        console.log("🎤 No speech detected - this is normal, continuing...")
        // Don't treat no-speech as an error, just keep listening
        setRecognitionError(null)
        return
      }
      
      if (event.error === "audio-capture") {
        setRecognitionError("Microphone access denied. Please allow microphone access.")
        setIsListening(false)
        return
      }
      
      if (event.error === "network") {
        setRecognitionError("Network error. Please check your internet connection.")
        setIsListening(false)
        return
      }
      
      if (event.error === "not-allowed") {
        setRecognitionError("Microphone access not allowed. Please enable microphone permissions.")
        setIsListening(false)
        return
      }
      
      // For other errors, show message but let onend handle restart
      console.warn("🎤 Speech recognition error, will restart on end:", event.error)
      setRecognitionError(`Speech error: ${event.error}. Auto-restarting...`)
    }

    recognition.onend = () => {
      console.log("🎤 Speech recognition ended, micEnabled:", micEnabled, "manualStop:", manualStop)
      setIsListening(false)
      setRecognitionRestarting(false)
      
      // ✅ Enable submit when recognition ends (unless mic is still enabled and will restart)
      if (manualStop || !micEnabled) {
        setSubmitAllowed(true)
      }
      
      // Auto-restart if mic is still enabled and not manually stopped
      if (micEnabled && !manualStop) {
        console.log("🔄 Auto-restarting speech recognition in 100ms...")
        setRecognitionRestarting(true)
        
        // Use a very short delay and direct restart
        setTimeout(() => {
          console.log("🔄 Attempting restart now...")
          if (micEnabled && !manualStop && recognitionRef.current) {
            try {
              console.log("🔄 Calling recognition.start()...")
              recognitionRef.current.start()
              console.log("✅ Speech recognition restart initiated")
            } catch (error) {
              console.error("❌ Failed to restart speech recognition:", error)
              setRecognitionError("Failed to restart speech recognition. Please toggle microphone.")
              setRecognitionRestarting(false)
              setIsListening(false)
              setSubmitAllowed(true) // ✅ Enable submit on error
            }
          } else {
            console.log("🛑 Restart cancelled - micEnabled:", micEnabled, "manualStop:", manualStop)
            setRecognitionRestarting(false)
            setSubmitAllowed(true) // ✅ Enable submit when restart cancelled
          }
        }, 100)
      } else {
        console.log("🛑 Not restarting - micEnabled:", micEnabled, "manualStop:", manualStop)
      }
    }

    recognition.onstart = () => {
      console.log("🎤 Speech recognition started successfully")
      setIsListening(true)
      setSubmitAllowed(false) // ✅ Disable submit when actively listening
      setRecognitionError(null)
      setRecognitionRestarting(false)
      console.log("🎤 Recognition state - listening:", true, "restarting:", false)
    }

    recognitionRef.current = recognition
  }, [voiceLanguage, micEnabled, manualStop])

  // ✅ NEW: Sync submit button state with mic and listening states
  useEffect(() => {
    // Submit is allowed when mic is disabled OR when not actively listening
    const shouldAllowSubmit = !micEnabled || !isListening
    console.log("🔄 Submit state sync:", {
      micEnabled,
      isListening,
      shouldAllowSubmit,
      currentSubmitAllowed: submitAllowed
    })
    
    if (shouldAllowSubmit !== submitAllowed) {
      setSubmitAllowed(shouldAllowSubmit)
    }
  }, [micEnabled, isListening, submitAllowed])

  // ✅ FIXED: Simplified mic toggle with better state management
  const toggleMic = async () => {
    if (!micEnabled) {
      // Enable mic and start speech recognition
      console.log("🎤 Enabling microphone...")
      setMicEnabled(true)
      setManualStop(false)
      setSubmitAllowed(false) // ✅ Disable submit when mic is enabled
      
      // Clear any previous errors
      setRecognitionError(null)
      
      if (speechRecognitionSupported && recognitionRef.current) {
        // Add small delay to ensure state is updated
        setTimeout(() => {
          startListening()
        }, 100)
      }
    } else {
      // Disable mic and stop speech recognition
      console.log("🎤 Disabling microphone...")
      
      // ✅ CRITICAL FIX: Set both states to ensure submit button is immediately enabled
      setIsListening(false)
      setSubmitAllowed(true) // ✅ Immediately enable submit when mic is disabled
      setMicEnabled(false)
      setManualStop(true)
      
      if (recognitionRef.current && isListening) {
        stopListening()
      }
      
      setInterimTranscript("")
      setRecognitionRestarting(false)
      setRecognitionError(null)
    }
  }

  // ✅ FIXED: Robust start listening function
  const startListening = () => {
    if (!speechRecognitionSupported) {
      setRecognitionError("Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.")
      return
    }

    if (!recognitionRef.current) {
      setRecognitionError("Speech recognition is not available")
      return
    }

    console.log("🎤 Starting speech recognition...")
    setRecognitionError(null)
    setInterimTranscript("")
    setManualStop(false)

    try {
      // Stop any existing recognition first
      if (isListening) {
        recognitionRef.current.stop()
        // Wait a bit before starting new one
        setTimeout(() => {
          if (recognitionRef.current && !manualStop) {
            recognitionRef.current.start()
          }
        }, 200)
      } else {
        recognitionRef.current.start()
      }
      console.log("✅ Speech recognition start command sent")
    } catch (error) {
      console.error("❌ Error starting speech recognition:", error)
      if (error instanceof Error && error.message.includes("already started")) {
        console.log("🎤 Speech recognition already running")
        setIsListening(true)
      } else {
        setRecognitionError("Failed to start speech recognition. Please try again.")
      }
    }
  }

  // ✅ ENHANCED: Robust stop listening function  
  const stopListening = () => {
    if (!recognitionRef.current) return

    console.log("🎤 Stopping speech recognition...")
    setManualStop(true)
    setIsListening(false)
    setSubmitAllowed(true) // ✅ Enable submit when manually stopping
    setInterimTranscript("")
    setRecognitionRestarting(false)

    try {
      recognitionRef.current.stop()
      console.log("✅ Speech recognition stopped successfully")
    } catch (error) {
      console.error("❌ Error stopping speech recognition:", error)
      // Force state reset even if stop fails
      setIsListening(false)
      setSubmitAllowed(true) // ✅ Ensure submit is enabled on error
      setInterimTranscript("")
    }
  }

  // --- Replace enableVideo with this version ---
  const enableVideo = async () => {
    console.log("📹 Enabling video...")
    setRecognitionError(null)

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        // Only request audio if mic is enabled
        audio: false,
      })

      streamRef.current = stream

      // Wait for video ref to be ready
      for (let i = 0; i < 10 && !videoRef.current; i++) {
        await new Promise((r) => setTimeout(r, 50))
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      setVideoEnabled(true)
      // Do NOT touch micEnabled here
      console.log("✅ Video enabled successfully")
    } catch (error: any) {
      console.error("❌ Error accessing video device:", error)
      setRecognitionError("Please allow access to camera")
    }
  }

  // --- Replace disableVideo with this version ---
  const disableVideo = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setVideoEnabled(false)
    // Do NOT touch micEnabled or speech recognition here
  }

  // ✅ ADD MISSING FUNCTION: Start Interview
  const startInterview = async () => {
    console.log("🎤 Starting interview with role:", role, "experience:", experience)
    console.log("🔑 Token from useAuth:", token ? `Present (${token.length} chars)` : 'Missing')
    console.log("👤 User from useAuth:", user ? `Present (${user.username})` : 'Missing')
    
    if (!token) {
      setRecognitionError('Authentication required. Please log in again.');
      return;
    }
    
    setLoading(true)
    setRecognitionError(null)

    try {
      console.log('📡 Making request with token:', token.substring(0, 20) + '...');
      const response = await axios.post(`${API_URL}/interview/start`, {
        role,
        experience,
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      console.log("✅ Interview started successfully:", response.data)
      setSession(response.data)
      setStartTime(new Date())
      setVideoOnTime(0)
      setTotalTime(0)
      setScores([])
      setFinalReport(null)
      setIsListening(false)
      
      // Enable video by default when starting interview
      setVideoEnabled(true)
      
    } catch (error: any) {
      console.error("❌ Error starting interview:", error)
      console.error("❌ Error response:", error.response?.data)
      console.error("❌ Error status:", error.response?.status)
      handleApiError(error, "Start Interview");
      if (error.response?.status === 401) {
        setRecognitionError("Authentication failed. Please log in again.");
      } else {
        setRecognitionError(error.response?.data?.message || "Failed to start interview. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  const submitAnswer = async (answer: string) => {
    if (!session || !answer.trim()) {
      setRecognitionError("Please provide an answer before submitting")
      return
    }

    if (!token) {
      setRecognitionError('Authentication required. Please log in again.');
      return;
    }

    console.log("📝 Submitting answer for question", session.questionNumber)
    setLoading(true)
    setRecognitionError(null)
    setIsListening(false)

    // Stop any current speech and listening
    stopSpeaking()
    if (isListening) {
      stopListening()
    }

    try {
      console.log('📡 Submitting answer with token:', token.substring(0, 20) + '...');
      const response = await axios.post(`${API_URL}/interview/answer`, {
        sessionId: session.sessionId,
        answer,
        questionNumber: session.questionNumber,
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log("✅ Answer submitted, response:", response.data)
      const newScores = [...scores, response.data.evaluation.score]
      setScores(newScores)

      if (response.data.isComplete) {
        console.log("🏁 Interview completed")
        setSession((prev) =>
          prev
            ? {
                ...prev,
                isComplete: true,
                evaluation: response.data.evaluation,
              }
            : null,
        )
        setIsListening(false)
        await generateFinalReport()
      } else {
        console.log("➡️ Moving to next question:", response.data.questionNumber)
        setSession((prev) =>
          prev
            ? {
                ...prev,
                evaluation: response.data.evaluation,
                isComplete: false,
              }
            : null,
        )
      }

      setCurrentAnswer("")
    } catch (error: any) {
      console.error("❌ Error submitting answer:", error)
      console.error("❌ Error response:", error.response?.data)
      handleApiError(error, "Next Question");
      setIsListening(false);
      if (error.response?.status === 401) {
        setRecognitionError("Authentication failed. Please log in again.");
      } else {
        setRecognitionError(error.response?.data?.message || "Failed to submit answer. Please try again.")
      }
      setIsListening(false)
    } finally {
      setLoading(false)
    }
  }

  const proceedToNextQuestion = async () => {
    if (!session || !token) return

    try {
      console.log('📡 Getting next question with token:', token.substring(0, 20) + '...');
      const response = await axios.post(`${API_URL}/interview/answer`, {
        sessionId: session.sessionId,
        answer: currentAnswer || "No additional response",
        questionNumber: session.questionNumber,
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.data.isComplete) {
        setSession((prev) =>
          prev
            ? {
                ...prev,
                sessionId: response.data.sessionId || prev.sessionId,
                question: response.data.nextQuestion,
                questionNumber: response.data.questionNumber,
                expectedTopics: response.data.expectedTopics || [],
                difficulty: response.data.difficulty || "medium",
                evaluation: undefined,
                isComplete: false,
              }
            : null,
        )
      }

      setIsListening(false)
    } catch (error: any) {
      console.error("❌ Error getting next question:", error)
      if (error.response?.status === 401) {
        setRecognitionError("Authentication failed. Please log in again.");
      }
      setIsListening(false)
    }
  }

  const generateFinalReport = async () => {
    if (!session || !token) return

    console.log("📊 Generating final report...")
    try {
      console.log('📡 Generating report with token:', token.substring(0, 20) + '...');
      const response = await axios.post(`${API_URL}/interview/generate-report`, {
        sessionId: session.sessionId,
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log("✅ Final report generated:", response.data)
      setFinalReport(response.data)
    } catch (error: any) {
      console.error("❌ Error generating report:", error);
      handleApiError(error, "Generate Report");
      if (error.response?.status === 401) {
        setRecognitionError("Authentication failed. Please log in again.");
      }
      const basicReport: FinalReport = {
        overallScore: Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10),
        recommendation: "consider",
        summary: "Interview completed successfully",
        technicalSkills: { score: 7, feedback: "Good technical foundation" },
        communication: { score: 7, feedback: "Clear communication style" },
        problemSolving: { score: 6, feedback: "Adequate problem-solving approach" },
        videoPresence: { score: 8, feedback: "Professional video presence" },
        strengths: ["Technical knowledge", "Communication", "Professionalism"],
        areasForImprovement: ["Technical depth", "Problem-solving speed", "Confidence"],
        detailedFeedback: "Overall solid performance with potential for growth.",
      }
      setFinalReport(basicReport)
    }
  }

  const getScoreBand = (score: number) => {
    if (score >= 80) return { band: "Excellent", color: "text-green-600" }
    if (score >= 70) return { band: "Very Good", color: "text-blue-600" }
    if (score >= 60) return { band: "Good", color: "text-yellow-600" }
    if (score >= 50) return { band: "Average", color: "text-orange-600" }
    return { band: "Poor", color: "text-red-600" }
  }

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case "hire":
        return "text-green-600 bg-green-100"
      case "consider":
        return "text-yellow-600 bg-yellow-100"
      case "reject":
        return "text-red-600 bg-red-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  // Only speak question when it's a new question and not waiting for next question
  useEffect(() => {
    if (session?.question && speechEnabled && !waitingForNextQuestion) {
      const questionText = `Question ${session.questionNumber} of 10. ${session.question}`
      // Add a small delay to ensure the UI is ready
      setTimeout(() => speakText(questionText), 500)
    }
  }, [session?.question, speechEnabled, waitingForNextQuestion])

  if (!session) {
    return (
      <div className={`min-h-screen transition-colors duration-300 relative ${
        isDark
          ? "bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900"
          : "bg-gradient-to-br from-gray-50 via-white to-gray-100"
      }`}>
        {/* AI Cosmic Animation for Dark Mode */}
        {isDark && (
          <>
            <style>{`
              @keyframes ai-neural-pulse {
                0%, 100% {
                  transform: translateX(0px) translateY(0px) scale(1) rotate(0deg);
                  opacity: 0.6;
                }
                25% {
                  transform: translateX(20px) translateY(-15px) scale(1.1) rotate(90deg);
                  opacity: 1;
                }
                50% {
                  transform: translateX(-10px) translateY(20px) scale(0.9) rotate(180deg);
                  opacity: 0.8;
                }
                75% {
                  transform: translateX(30px) translateY(5px) scale(1.05) rotate(270deg);
                  opacity: 0.9;
                }
              }
              @keyframes ai-data-stream {
                0% { transform: translateY(-100px) translateX(0px) rotate(0deg); opacity: 0; }
                10% { opacity: 0.8; }
                90% { opacity: 0.8; }
                100% { transform: translateY(100vh) translateX(25px) rotate(360deg); opacity: 0; }
              }
              @keyframes neural-network {
                0%, 100% { 
                  opacity: 0.4;
                  transform: scale(1) rotate(0deg);
                }
                50% { 
                  opacity: 1;
                  transform: scale(1.1) rotate(180deg);
                }
              }
              @keyframes ai-constellation {
                0% { transform: rotate(0deg) translateX(120px) rotate(0deg); }
                100% { transform: rotate(360deg) translateX(120px) rotate(-360deg); }
              }
              @keyframes quantum-field {
                0%, 100% { 
                  background: linear-gradient(45deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1));
                  transform: scale(1) rotate(0deg);
                }
                33% { 
                  background: linear-gradient(45deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1));
                  transform: scale(1.1) rotate(120deg);
                }
                66% { 
                  background: linear-gradient(45deg, rgba(139, 92, 246, 0.1), rgba(16, 185, 129, 0.1));
                  transform: scale(0.9) rotate(240deg);
                }
              }
              @keyframes ai-circuit-flow {
                0% { transform: translateX(-100px) translateY(0px) rotate(0deg); opacity: 0; }
                10% { opacity: 0.7; }
                90% { opacity: 0.7; }
                100% { transform: translateX(100vw) translateY(20px) rotate(360deg); opacity: 0; }
              }
              .ai-neural-pulse {
                animation: ai-neural-pulse 7s ease-in-out infinite;
              }
              .ai-data-stream {
                animation: ai-data-stream 9s linear infinite;
              }
              .neural-network {
                animation: neural-network 3s ease-in-out infinite;
              }
              .ai-constellation {
                animation: ai-constellation 25s linear infinite;
              }
              .quantum-field {
                animation: quantum-field 14s ease-in-out infinite;
              }
              .ai-circuit-flow {
                animation: ai-circuit-flow 10s linear infinite;
              }
            `}</style>
            
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
              {/* Quantum field backgrounds */}
              <div className="absolute top-1/4 left-1/5 w-96 h-96 quantum-field rounded-full blur-3xl"></div>
              <div className="absolute bottom-1/3 right-1/4 w-80 h-80 quantum-field rounded-full blur-3xl" style={{ animationDelay: '5s' }}></div>
              <div className="absolute top-2/3 left-1/3 w-64 h-64 quantum-field rounded-full blur-2xl" style={{ animationDelay: '10s' }}></div>
              
              {/* AI Neural Network Nodes */}
              {Array.from({ length: 35 }).map((_, i) => (
                <div
                  key={`neural-node-${i}`}
                  className={`neural-network absolute ${
                    i % 7 === 0 ? 'w-2 h-2 bg-blue-400 rounded-full' :
                    i % 7 === 1 ? 'w-1.5 h-1.5 bg-purple-400 rounded-full' :
                    i % 7 === 2 ? 'w-2 h-2 bg-cyan-400 rounded-full' :
                    i % 7 === 3 ? 'w-1 h-1 bg-green-400 rounded-full' :
                    i % 7 === 4 ? 'w-1.5 h-1.5 bg-teal-400 rounded-full' :
                    i % 7 === 5 ? 'w-2 h-2 bg-indigo-400 rounded-full' :
                    'w-1.5 h-1.5 bg-violet-400 rounded-full'
                  }`}
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 3}s`,
                    animationDuration: `${3 + Math.random() * 2}s`,
                  }}
                />
              ))}
              
              {/* AI Data Streams */}
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={`data-stream-${i}`}
                  className={`ai-data-stream absolute w-1 h-6 ${
                    i % 4 === 0 ? 'bg-gradient-to-b from-blue-400 to-transparent' :
                    i % 4 === 1 ? 'bg-gradient-to-b from-purple-400 to-transparent' :
                    i % 4 === 2 ? 'bg-gradient-to-b from-cyan-400 to-transparent' :
                    'bg-gradient-to-b from-green-400 to-transparent'
                  }`}
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 9}s`,
                    animationDuration: `${9 + Math.random() * 4}s`,
                  }}
                />
              ))}

              {/* AI Circuit Flow */}
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={`circuit-flow-${i}`}
                  className={`ai-circuit-flow absolute w-1 h-1 ${
                    i % 4 === 0 ? 'bg-blue-400' :
                    i % 4 === 1 ? 'bg-purple-400' :
                    i % 4 === 2 ? 'bg-cyan-400' : 'bg-green-400'
                  } rounded-full`}
                  style={{
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 10}s`,
                    animationDuration: `${10 + Math.random() * 5}s`,
                  }}
                />
              ))}

              {/* AI Constellation Orbiters */}
              <div className="absolute top-1/4 left-1/4 w-4 h-4">
                <div className="ai-constellation w-2 h-2 bg-blue-400 rounded-full neural-network"></div>
              </div>
              <div className="absolute top-3/4 right-1/3 w-4 h-4">
                <div className="ai-constellation w-2 h-2 bg-purple-400 rounded-full neural-network" style={{ animationDelay: '8s' }}></div>
              </div>
              <div className="absolute top-1/2 left-2/3 w-4 h-4">
                <div className="ai-constellation w-2 h-2 bg-cyan-400 rounded-full neural-network" style={{ animationDelay: '12s' }}></div>
              </div>

              {/* AI Neural Pulse Elements */}
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={`ai-pulse-${i}`}
                  className={`ai-neural-pulse absolute ${
                    i % 4 === 0 ? 'w-4 h-4 bg-gradient-to-br from-blue-500/40 to-cyan-500/40' :
                    i % 4 === 1 ? 'w-3 h-3 bg-gradient-to-br from-purple-500/40 to-violet-500/40' :
                    i % 4 === 2 ? 'w-3.5 h-3.5 bg-gradient-to-br from-green-500/40 to-teal-500/40' :
                    'w-4 h-4 bg-gradient-to-br from-indigo-500/40 to-purple-500/40'
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

        {/* Light Mode AI Animation */}
        {!isDark && (
          <>
            <style>{`
              @keyframes light-ai-float {
                0%, 100% {
                  transform: translateY(0px) translateX(0px) rotate(0deg);
                  opacity: 0.5;
                }
                25% {
                  transform: translateY(-10px) translateX(12px) rotate(90deg);
                  opacity: 0.8;
                }
                50% {
                  transform: translateY(6px) translateX(-8px) rotate(180deg);
                  opacity: 1;
                }
                75% {
                  transform: translateY(-15px) translateX(18px) rotate(270deg);
                  opacity: 0.6;
                }
              }
              @keyframes light-data-particle {
                0% { transform: translateY(-30px) translateX(0px) rotate(0deg); opacity: 0; }
                10% { opacity: 0.6; }
                90% { opacity: 0.6; }
                100% { transform: translateY(100vh) translateX(20px) rotate(360deg); opacity: 0; }
              }
              @keyframes ai-aurora {
                0%, 100% { 
                  background: linear-gradient(45deg, rgba(59, 130, 246, 0.12), rgba(147, 51, 234, 0.12));
                  transform: scale(1) rotate(0deg);
                }
                33% { 
                  background: linear-gradient(45deg, rgba(16, 185, 129, 0.12), rgba(59, 130, 246, 0.12));
                  transform: scale(1.05) rotate(120deg);
                }
                66% { 
                  background: linear-gradient(45deg, rgba(139, 92, 246, 0.12), rgba(16, 185, 129, 0.12));
                  transform: scale(0.95) rotate(240deg);
                }
              }
              @keyframes light-neural-glow {
                0%, 100% { 
                  box-shadow: 0 0 10px rgba(59, 130, 246, 0.3), 0 0 20px rgba(147, 51, 234, 0.2);
                  opacity: 0.5; 
                }
                50% { 
                  box-shadow: 0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(147, 51, 234, 0.4);
                  opacity: 1; 
                }
              }
              .light-ai-float {
                animation: light-ai-float 6s ease-in-out infinite;
              }
              .light-data-particle {
                animation: light-data-particle 8s linear infinite;
              }
              .ai-aurora {
                animation: ai-aurora 11s ease-in-out infinite;
              }
              .light-neural-glow {
                animation: light-neural-glow 2.8s ease-in-out infinite;
              }
            `}</style>
            
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
              {/* AI Aurora backgrounds */}
              <div className="absolute top-1/5 left-1/3 w-96 h-96 ai-aurora rounded-full blur-3xl"></div>
              <div className="absolute bottom-1/4 right-1/5 w-80 h-80 ai-aurora rounded-full blur-3xl" style={{ animationDelay: '4s' }}></div>
              <div className="absolute top-2/3 left-1/6 w-64 h-64 ai-aurora rounded-full blur-2xl" style={{ animationDelay: '8s' }}></div>
              
              {/* Light Neural Network Nodes */}
              {Array.from({ length: 25 }).map((_, i) => (
                <div
                  key={`light-neural-${i}`}
                  className={`light-neural-glow absolute ${
                    i % 6 === 0 ? 'w-2 h-2 bg-blue-400/60 rounded-full' :
                    i % 6 === 1 ? 'w-1.5 h-1.5 bg-purple-400/60 rounded-full' :
                    i % 6 === 2 ? 'w-2 h-2 bg-cyan-400/60 rounded-full' :
                    i % 6 === 3 ? 'w-1 h-1 bg-green-400/60 rounded-full' :
                    i % 6 === 4 ? 'w-1.5 h-1.5 bg-teal-400/60 rounded-full' :
                    'w-2 h-2 bg-indigo-400/60 rounded-full'
                  }`}
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2.8}s`,
                    animationDuration: `${2.8 + Math.random() * 1.5}s`,
                  }}
                />
              ))}
              
              {/* Light Data Particles */}
              {Array.from({ length: 15 }).map((_, i) => (
                <div
                  key={`light-data-${i}`}
                  className={`light-data-particle absolute w-1 h-1 ${
                    i % 5 === 0 ? 'bg-blue-300/50' :
                    i % 5 === 1 ? 'bg-purple-300/50' :
                    i % 5 === 2 ? 'bg-cyan-300/50' :
                    i % 5 === 3 ? 'bg-green-300/50' : 'bg-teal-300/50'
                  } rounded-full`}
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 8}s`,
                    animationDuration: `${8 + Math.random() * 3}s`,
                  }}
                />
              ))}

              {/* Light AI Float Elements */}
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={`light-ai-${i}`}
                  className={`light-ai-float absolute ${
                    i % 4 === 0 ? 'w-3 h-3 bg-gradient-to-br from-blue-200/50 to-purple-200/50' :
                    i % 4 === 1 ? 'w-2.5 h-2.5 bg-gradient-to-br from-cyan-200/50 to-teal-200/50' :
                    i % 4 === 2 ? 'w-3 h-3 bg-gradient-to-br from-green-200/50 to-blue-200/50' :
                    'w-2.5 h-2.5 bg-gradient-to-br from-indigo-200/50 to-violet-200/50'
                  } rounded-full blur-sm`}
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDuration: `${6 + Math.random() * 2}s`,
                    animationDelay: `${Math.random() * 6}s`,
                  }}
                />
              ))}
            </div>
          </>
        )}
        
        <div className="relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <Bot className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">AI Interview Assistant</h1>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Practice technical interviews with AI-powered questions, voice interaction, and real-time feedback
            </p>
          </div>

          {/* Step 1: Job Role Selection */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">Choose Your Target Role</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { role: "Frontend Developer", icon: "🎨", color: "from-blue-500 to-cyan-500", description: "React, Vue, Angular" },
                { role: "Backend Developer", icon: "⚙️", color: "from-green-500 to-emerald-500", description: "APIs, Databases, Server" },
                { role: "Full Stack Developer", icon: "🚀", color: "from-purple-500 to-pink-500", description: "Frontend + Backend" },
                { role: "Data Scientist", icon: "📊", color: "from-yellow-500 to-orange-500", description: "ML, Analytics, Python" },
                { role: "DevOps Engineer", icon: "🔧", color: "from-red-500 to-rose-500", description: "CI/CD, Cloud, Docker" },
                { role: "Mobile Developer", icon: "📱", color: "from-indigo-500 to-blue-500", description: "iOS, Android, React Native" },
                { role: "Machine Learning Engineer", icon: "🤖", color: "from-teal-500 to-green-500", description: "AI, Deep Learning, Models" },
                { role: "Product Manager", icon: "📈", color: "from-pink-500 to-purple-500", description: "Strategy, Roadmaps, Analytics" }
              ].map((item) => (
                <div
                  key={item.role}
                  onClick={() => setRole(item.role)}
                  className={`cursor-pointer rounded-xl p-6 transition-all duration-300 transform hover:scale-105 border-2 ${
                    role === item.role
                      ? 'border-blue-500 shadow-lg bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${item.color} flex items-center justify-center mb-4 shadow-md`}>
                    <span className="text-2xl">{item.icon}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{item.role}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
                  {role === item.role && (
                    <div className="mt-3 flex items-center text-blue-600 dark:text-blue-400">
                      <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full mr-2"></div>
                      <span className="text-xs font-medium">Selected</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step 2: Experience Level Selection */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">Select Your Experience Level</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {[
                { level: "0", label: "Entry Level", years: "0-1 years", icon: "🌱", color: "from-green-400 to-green-500" },
                { level: "2", label: "Junior", years: "2-3 years", icon: "🌿", color: "from-blue-400 to-blue-500" },
                { level: "4", label: "Mid-Level", years: "4-6 years", icon: "🌳", color: "from-purple-400 to-purple-500" },
                { level: "7", label: "Senior", years: "7+ years", icon: "🏆", color: "from-orange-400 to-orange-500" },
                { level: "10", label: "Staff/Principal", years: "10+ years", icon: "👑", color: "from-red-400 to-red-500" }
              ].map((item) => (
                <div
                  key={item.level}
                  onClick={() => setExperience(item.level)}
                  className={`cursor-pointer rounded-xl p-6 transition-all duration-300 transform hover:scale-105 border-2 text-center ${
                    experience === item.level
                      ? 'border-blue-500 shadow-lg bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${item.color} flex items-center justify-center mb-4 shadow-md mx-auto`}>
                    <span className="text-2xl">{item.icon}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{item.label}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{item.years}</p>
                  {experience === item.level && (
                    <div className="mt-3 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full mr-2"></div>
                      <span className="text-xs font-medium">Selected</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: Interview Rules and Features */}
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Enhanced Features Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 shadow-sm">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white text-xl">🎯</span>
                  </div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-lg">Enhanced Features</h3>
                </div>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    AI speaks questions aloud with professional voice
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    Continuous speech-to-text with auto-restart
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    10 adaptive technical questions
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    Real-time AI evaluation and feedback
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    Video presence scoring
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    Comprehensive final report with recommendations
                  </li>
                </ul>
              </div>

              {/* Tips for Success Card */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 shadow-sm">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white text-xl">💡</span>
                  </div>
                  <h3 className="font-semibold text-green-900 dark:text-green-100 text-lg">Tips for Success</h3>
                </div>
                <ul className="text-sm text-green-800 dark:text-green-200 space-y-2">
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">•</span>
                    Enable camera and microphone for better scoring
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">•</span>
                    Listen to AI questions and speak naturally
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">•</span>
                    Speech recognition will auto-restart if it stops
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">•</span>
                    Think out loud to show your problem-solving process
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">•</span>
                    Maintain eye contact with the camera
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {recognitionError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400 dark:text-red-300" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-200">Speech Recognition Notice</h4>
                  <p className="text-red-800 dark:text-red-200 mt-1">{recognitionError}</p>
                  {!speechRecognitionSupported && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded">
                      <div className="flex items-start space-x-2">
                        <span className="text-blue-500 text-lg">💡</span>
                        <div>
                          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Don't worry! You can still complete the interview</p>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                            Speech-to-text is not compatible with your current device/browser. 
                            You can type your answers manually during the interview instead.
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">
                            For best speech recognition support, try using: Chrome, Edge, or Safari browsers.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Start Interview Button */}
          <div className="text-center">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-md mx-auto border border-gray-200 dark:border-gray-700">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Ready to Start?</h3>
                <p className="text-gray-600 dark:text-gray-400">Selected: <span className="font-semibold text-blue-600 dark:text-blue-400">{role}</span></p>
                <p className="text-gray-600 dark:text-gray-400">Experience: <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {experience === "0" ? "Entry Level" : 
                   experience === "2" ? "Junior" : 
                   experience === "4" ? "Mid-Level" : 
                   experience === "7" ? "Senior" : "Staff/Principal"}
                </span></p>
              </div>
              <button
                onClick={startInterview}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg shadow-lg transform hover:scale-[1.02]"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Starting Interview...
                  </div>
                ) : (
                  "🚀 Start AI Interview"
                )}
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 relative ${
      isDark
        ? "bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900"
        : "bg-gradient-to-br from-gray-50 via-white to-gray-100"
    }`}>
      {/* AI Cosmic Animation for Dark Mode */}
      {isDark && (
        <>
          <style>{`
            @keyframes ai-neural-pulse {
              0%, 100% {
                transform: translateX(0px) translateY(0px) scale(1) rotate(0deg);
                opacity: 0.6;
              }
              25% {
                transform: translateX(20px) translateY(-15px) scale(1.1) rotate(90deg);
                opacity: 1;
              }
              50% {
                transform: translateX(-10px) translateY(20px) scale(0.9) rotate(180deg);
                opacity: 0.8;
              }
              75% {
                transform: translateX(30px) translateY(5px) scale(1.05) rotate(270deg);
                opacity: 0.9;
              }
            }
            @keyframes ai-data-stream {
              0% { transform: translateY(-100px) translateX(0px) rotate(0deg); opacity: 0; }
              10% { opacity: 0.8; }
              90% { opacity: 0.8; }
              100% { transform: translateY(100vh) translateX(25px) rotate(360deg); opacity: 0; }
            }
            @keyframes neural-network {
              0%, 100% { 
                opacity: 0.4;
                transform: scale(1) rotate(0deg);
              }
              50% { 
                opacity: 1;
                transform: scale(1.1) rotate(180deg);
              }
            }
            @keyframes ai-constellation {
              0% { transform: rotate(0deg) translateX(120px) rotate(0deg); }
              100% { transform: rotate(360deg) translateX(120px) rotate(-360deg); }
            }
            @keyframes quantum-field {
              0%, 100% { 
                background: linear-gradient(45deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1));
                transform: scale(1) rotate(0deg);
              }
              33% { 
                background: linear-gradient(45deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1));
                transform: scale(1.1) rotate(120deg);
              }
              66% { 
                background: linear-gradient(45deg, rgba(139, 92, 246, 0.1), rgba(16, 185, 129, 0.1));
                transform: scale(0.9) rotate(240deg);
              }
            }
            @keyframes ai-circuit-flow {
              0% { transform: translateX(-100px) translateY(0px) rotate(0deg); opacity: 0; }
              10% { opacity: 0.7; }
              90% { opacity: 0.7; }
              100% { transform: translateX(100vw) translateY(20px) rotate(360deg); opacity: 0; }
            }
            .ai-neural-pulse {
              animation: ai-neural-pulse 7s ease-in-out infinite;
            }
            .ai-data-stream {
              animation: ai-data-stream 9s linear infinite;
            }
            .neural-network {
              animation: neural-network 3s ease-in-out infinite;
            }
            .ai-constellation {
              animation: ai-constellation 25s linear infinite;
            }
            .quantum-field {
              animation: quantum-field 14s ease-in-out infinite;
            }
            .ai-circuit-flow {
              animation: ai-circuit-flow 10s linear infinite;
            }
          `}</style>
          
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {/* Quantum field backgrounds */}
            <div className="absolute top-1/4 left-1/5 w-96 h-96 quantum-field rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/3 right-1/4 w-80 h-80 quantum-field rounded-full blur-3xl" style={{ animationDelay: '5s' }}></div>
            <div className="absolute top-2/3 left-1/3 w-64 h-64 quantum-field rounded-full blur-2xl" style={{ animationDelay: '10s' }}></div>
            
            {/* AI Neural Network Nodes */}
            {Array.from({ length: 35 }).map((_, i) => (
              <div
                key={`neural-node-${i}`}
                className={`neural-network absolute ${
                  i % 7 === 0 ? 'w-2 h-2 bg-blue-400 rounded-full' :
                  i % 7 === 1 ? 'w-1.5 h-1.5 bg-purple-400 rounded-full' :
                  i % 7 === 2 ? 'w-2 h-2 bg-cyan-400 rounded-full' :
                  i % 7 === 3 ? 'w-1 h-1 bg-green-400 rounded-full' :
                  i % 7 === 4 ? 'w-1.5 h-1.5 bg-teal-400 rounded-full' :
                  i % 7 === 5 ? 'w-2 h-2 bg-indigo-400 rounded-full' :
                  'w-1.5 h-1.5 bg-violet-400 rounded-full'
                }`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${3 + Math.random() * 2}s`,
                }}
              />
            ))}
            
            {/* AI Data Streams */}
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={`data-stream-${i}`}
                className={`ai-data-stream absolute w-1 h-6 ${
                  i % 4 === 0 ? 'bg-gradient-to-b from-blue-400 to-transparent' :
                  i % 4 === 1 ? 'bg-gradient-to-b from-purple-400 to-transparent' :
                  i % 4 === 2 ? 'bg-gradient-to-b from-cyan-400 to-transparent' :
                  'bg-gradient-to-b from-green-400 to-transparent'
                }`}
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 9}s`,
                  animationDuration: `${9 + Math.random() * 4}s`,
                }}
              />
            ))}

            {/* AI Circuit Flow */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={`circuit-flow-${i}`}
                className={`ai-circuit-flow absolute w-1 h-1 ${
                  i % 4 === 0 ? 'bg-blue-400' :
                  i % 4 === 1 ? 'bg-purple-400' :
                  i % 4 === 2 ? 'bg-cyan-400' : 'bg-green-400'
                } rounded-full`}
                style={{
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 10}s`,
                  animationDuration: `${10 + Math.random() * 5}s`,
                }}
              />
            ))}

            {/* AI Constellation Orbiters */}
            <div className="absolute top-1/4 left-1/4 w-4 h-4">
              <div className="ai-constellation w-2 h-2 bg-blue-400 rounded-full neural-network"></div>
            </div>
            <div className="absolute top-3/4 right-1/3 w-4 h-4">
              <div className="ai-constellation w-2 h-2 bg-purple-400 rounded-full neural-network" style={{ animationDelay: '8s' }}></div>
            </div>
            <div className="absolute top-1/2 left-2/3 w-4 h-4">
              <div className="ai-constellation w-2 h-2 bg-cyan-400 rounded-full neural-network" style={{ animationDelay: '12s' }}></div>
            </div>

            {/* AI Neural Pulse Elements */}
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={`ai-pulse-${i}`}
                className={`ai-neural-pulse absolute ${
                  i % 4 === 0 ? 'w-4 h-4 bg-gradient-to-br from-blue-500/40 to-cyan-500/40' :
                  i % 4 === 1 ? 'w-3 h-3 bg-gradient-to-br from-purple-500/40 to-violet-500/40' :
                  i % 4 === 2 ? 'w-3.5 h-3.5 bg-gradient-to-br from-green-500/40 to-teal-500/40' :
                  'w-4 h-4 bg-gradient-to-br from-indigo-500/40 to-purple-500/40'
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

      {/* Light Mode AI Animation */}
      {!isDark && (
        <>
          <style>{`
            @keyframes light-ai-float {
              0%, 100% {
                transform: translateY(0px) translateX(0px) rotate(0deg);
                opacity: 0.5;
              }
              25% {
                transform: translateY(-10px) translateX(12px) rotate(90deg);
                opacity: 0.8;
              }
              50% {
                transform: translateY(6px) translateX(-8px) rotate(180deg);
                opacity: 1;
              }
              75% {
                transform: translateY(-15px) translateX(18px) rotate(270deg);
                opacity: 0.6;
              }
            }
            @keyframes light-data-particle {
              0% { transform: translateY(-30px) translateX(0px) rotate(0deg); opacity: 0; }
              10% { opacity: 0.6; }
              90% { opacity: 0.6; }
              100% { transform: translateY(100vh) translateX(20px) rotate(360deg); opacity: 0; }
            }
            @keyframes ai-aurora {
              0%, 100% { 
                background: linear-gradient(45deg, rgba(59, 130, 246, 0.12), rgba(147, 51, 234, 0.12));
                transform: scale(1) rotate(0deg);
              }
              33% { 
                background: linear-gradient(45deg, rgba(16, 185, 129, 0.12), rgba(59, 130, 246, 0.12));
                transform: scale(1.05) rotate(120deg);
              }
              66% { 
                background: linear-gradient(45deg, rgba(139, 92, 246, 0.12), rgba(16, 185, 129, 0.12));
                transform: scale(0.95) rotate(240deg);
              }
            }
            @keyframes light-neural-glow {
              0%, 100% { 
                box-shadow: 0 0 10px rgba(59, 130, 246, 0.3), 0 0 20px rgba(147, 51, 234, 0.2);
                opacity: 0.5; 
              }
              50% { 
                box-shadow: 0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(147, 51, 234, 0.4);
                opacity: 1; 
              }
            }
            .light-ai-float {
              animation: light-ai-float 6s ease-in-out infinite;
            }
            .light-data-particle {
              animation: light-data-particle 8s linear infinite;
            }
            .ai-aurora {
              animation: ai-aurora 11s ease-in-out infinite;
            }
            .light-neural-glow {
              animation: light-neural-glow 2.8s ease-in-out infinite;
            }
          `}</style>
          
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {/* AI Aurora backgrounds */}
            <div className="absolute top-1/5 left-1/3 w-96 h-96 ai-aurora rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 right-1/5 w-80 h-80 ai-aurora rounded-full blur-3xl" style={{ animationDelay: '4s' }}></div>
            <div className="absolute top-2/3 left-1/6 w-64 h-64 ai-aurora rounded-full blur-2xl" style={{ animationDelay: '8s' }}></div>
            
            {/* Light Neural Network Nodes */}
            {Array.from({ length: 25 }).map((_, i) => (
              <div
                key={`light-neural-${i}`}
                className={`light-neural-glow absolute ${
                  i % 6 === 0 ? 'w-2 h-2 bg-blue-400/60 rounded-full' :
                  i % 6 === 1 ? 'w-1.5 h-1.5 bg-purple-400/60 rounded-full' :
                  i % 6 === 2 ? 'w-2 h-2 bg-cyan-400/60 rounded-full' :
                  i % 6 === 3 ? 'w-1 h-1 bg-green-400/60 rounded-full' :
                  i % 6 === 4 ? 'w-1.5 h-1.5 bg-teal-400/60 rounded-full' :
                  'w-2 h-2 bg-indigo-400/60 rounded-full'
                }`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2.8}s`,
                  animationDuration: `${2.8 + Math.random() * 1.5}s`,
                }}
              />
            ))}
            
            {/* Light Data Particles */}
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={`light-data-${i}`}
                className={`light-data-particle absolute w-1 h-1 ${
                  i % 5 === 0 ? 'bg-blue-300/50' :
                  i % 5 === 1 ? 'bg-purple-300/50' :
                  i % 5 === 2 ? 'bg-cyan-300/50' :
                  i % 5 === 3 ? 'bg-green-300/50' : 'bg-teal-300/50'
                } rounded-full`}
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 8}s`,
                  animationDuration: `${8 + Math.random() * 3}s`,
                }}
              />
            ))}

            {/* Light AI Float Elements */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={`light-ai-${i}`}
                className={`light-ai-float absolute ${
                  i % 4 === 0 ? 'w-3 h-3 bg-gradient-to-br from-blue-200/50 to-purple-200/50' :
                  i % 4 === 1 ? 'w-2.5 h-2.5 bg-gradient-to-br from-cyan-200/50 to-teal-200/50' :
                  i % 4 === 2 ? 'w-3 h-3 bg-gradient-to-br from-green-200/50 to-blue-200/50' :
                  'w-2.5 h-2.5 bg-gradient-to-br from-indigo-200/50 to-violet-200/50'
                } rounded-full blur-sm`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDuration: `${6 + Math.random() * 2}s`,
                  animationDelay: `${Math.random() * 6}s`,
                }}
              />
            ))}
          </div>
        </>
      )}
      
      {/* Interview Completion Report */}
      {session.isComplete && finalReport && (
        <div className="relative z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">Interview Complete! 🎉</h1>
                <div className="text-6xl font-bold mb-4">
                  <span className={getScoreBand(finalReport.overallScore).color}>{finalReport.overallScore}</span>
                </div>
                <div className="text-xl font-semibold mb-4">
                  <span className={getScoreBand(finalReport.overallScore).color}>{getScoreBand(finalReport.overallScore).band}</span>
                </div>
                <div
                  className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${getRecommendationColor(finalReport.recommendation)}`}
                >
                  Recommendation: {finalReport.recommendation.toUpperCase()}
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Summary</h3>
                <p className="text-gray-700">{finalReport.summary}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Technical Skills</span>
                      <span className="text-blue-600 font-bold">{finalReport.technicalSkills.score}/10</span>
                    </div>
                    <p className="text-sm text-gray-600">{finalReport.technicalSkills.feedback}</p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Communication</span>
                      <span className="text-green-600 font-bold">{finalReport.communication.score}/10</span>
                    </div>
                    <p className="text-sm text-gray-600">{finalReport.communication.feedback}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Problem Solving</span>
                      <span className="text-purple-600 font-bold">{finalReport.problemSolving.score}/10</span>
                    </div>
                    <p className="text-sm text-gray-600">{finalReport.problemSolving.feedback}</p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Video Presence</span>
                      <span className="text-orange-600 font-bold">{finalReport.videoPresence.score}/10</span>
                    </div>
                    <p className="text-sm text-gray-600">{finalReport.videoPresence.feedback}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-3">Strengths</h4>
                  <ul className="space-y-1">
                    {finalReport.strengths.map((strength, index) => (
                      <li key={index} className="text-sm text-green-800">
                        • {strength}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-semibold text-yellow-900 mb-3">Areas for Improvement</h4>
                  <ul className="space-y-1">
                    {finalReport.areasForImprovement.map((area, index) => (
                      <li key={index} className="text-sm text-yellow-800">
                        • {area}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg mb-8">
                <h4 className="font-semibold text-blue-900 mb-3">Detailed Feedback</h4>
                <p className="text-blue-800 text-sm">{finalReport.detailedFeedback}</p>
              </div>

              <div className="text-center">
                <button
                  onClick={() => {
                    setSession(null)
                    setScores([])
                    setVideoOnTime(0)
                    setTotalTime(0)
                    setStartTime(null)
                    setFinalReport(null)
                    setCurrentAnswer("")
                    setTranscript("")
                    setRecognitionError(null)
                    setIsListening(false)
                    setRecognitionRestarting(false)
                    setManualStop(false)
                    setInterimTranscript("")
                    disableVideo()
                  }}
                  className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Start New Interview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Interview Interface - only show when not complete */}
      {session && (!session.isComplete || !finalReport) && (
        <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stop Interview Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={stopInterview}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            <X className="h-4 w-4 mr-2" />
            Stop Interview
          </button>
        </div>

        {recognitionError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{recognitionError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* AI Avatar */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-gray-600 mr-2" />
                <h2 className="text-xl font-bold text-gray-900">AI Interviewer</h2>
              </div>

              {/* AI Video/Avatar Container - Same size as user video */}
              <div className="bg-gray-900 rounded-lg overflow-hidden mb-4 relative" style={{ height: "280px" }}>
                {/* AI Video - plays when speaking */}
                <video
                  ref={aiVideoRef}
                  loop
                  muted={true}
                  playsInline
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    isAISpeaking ? 'opacity-100' : 'opacity-0'
                  }`}
                  onError={(e) => {
                    console.warn("AI video failed to load:", e);
                    // Hide video and show AI icon instead if video fails
                    setIsAISpeaking(false);
                  }}
                >
                  {/* Primary video source - you need to download and place this file */}
                  <source src="/ai-avatar.mp4" type="video/mp4" />
                  {/* Fallback for different video formats */}
                  <source src="/ai-avatar.webm" type="video/webm" />
                  {/* Placeholder message when video not found */}
                  Your browser does not support the video tag or the video file is missing.
                </video>
                
                {/* AI Bot Icon - shows when not speaking, centered in rectangle */}
                <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
                  isAISpeaking ? 'opacity-0' : 'opacity-100'
                }`}>
                  <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                    <Bot className="h-16 w-16 text-white" />
                  </div>
                </div>
                
                {/* Speaking indicator */}
                {isAISpeaking && (
                  <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                    🎤 AI Speaking...
                  </div>
                )}

                {/* AI Status indicator */}
                {!isAISpeaking && (
                  <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                    {speechEnabled ? "AI: Ready" : "AI: Muted"}
                  </div>
                )}

                {/* Speech status indicator */}
                {!speechEnabled && (
                  <div className="absolute bottom-4 right-4 bg-red-500 bg-opacity-90 text-white px-2 py-1 rounded text-xs flex items-center">
                    <VolumeX className="h-3 w-3 mr-1" />
                    Speech Off
                  </div>
                )}
              </div>
              
              <p className="text-gray-600">Question {session.questionNumber} of 10</p>
              {session.difficulty && (
                <span
                  className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${
                    session.difficulty === "easy"
                      ? "bg-green-100 text-green-800"
                      : session.difficulty === "medium"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                  }`}
                >
                  {session.difficulty.toUpperCase()}
                </span>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Current Question:</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      const newSpeechEnabled = !speechEnabled
                      setSpeechEnabled(newSpeechEnabled)
                      // If disabling speech, stop any current speech
                      if (!newSpeechEnabled && isAISpeaking) {
                        stopSpeaking()
                      }
                    }}
                    className={`p-2 rounded-full transition-colors ${
                      speechEnabled 
                        ? "text-blue-600 hover:bg-blue-100" 
                        : "text-gray-400 hover:bg-gray-100"
                    }`}
                    title={speechEnabled ? "Mute AI speech" : "Unmute AI speech"}
                  >
                    {speechEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => speakText(session.question)}
                    disabled={isAISpeaking || !speechEnabled}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-full disabled:opacity-50"
                    title="Repeat question"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="text-gray-700 mb-4">{session.question}</p>

              {session.expectedTopics.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Expected Topics:</h4>
                  <div className="flex flex-wrap gap-2">
                    {session.expectedTopics.map((topic, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {session.evaluation && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-blue-900 mb-2">
                  Previous Answer Score: {session.evaluation.score}/10
                </h3>
                <p className="text-sm text-blue-800 mb-3">{session.evaluation.feedback}</p>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="text-center">
                    <div className="font-medium">Technical</div>
                    <div className="text-blue-600">{session.evaluation.technicalAccuracy}/10</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">Communication</div>
                    <div className="text-green-600">{session.evaluation.communication}/10</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">Depth</div>
                    <div className="text-purple-600">{session.evaluation.depth}/10</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">Video</div>
                    <div className="text-orange-600">{calculateVideoScore()}/10</div>
                  </div>
                </div>

                {session.evaluation.strengths.length > 0 && (
                  <div className="mt-3">
                    <div className="font-medium text-green-800 text-xs mb-1">Strengths:</div>
                    <div className="text-xs text-green-700">{session.evaluation.strengths.join(", ")}</div>
                  </div>
                )}

                {session.evaluation.improvements.length > 0 && (
                  <div className="mt-2">
                    <div className="font-medium text-yellow-800 text-xs mb-1">Improvements:</div>
                    <div className="text-xs text-yellow-700">{session.evaluation.improvements.join(", ")}</div>
                  </div>
                )}

                {session.evaluation && !session.isComplete && (
                  <button
                    onClick={proceedToNextQuestion}
                    className="w-full mt-4 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition-colors"
                  >
                    Continue to Next Question
                  </button>
                )}
              </div>
            )}
          </div>

          {/* User Video */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center mb-4">
                <User className="h-8 w-8 text-gray-600 mr-2" />
                <h2 className="text-xl font-bold text-gray-900">You</h2>
              </div>

              <div className="bg-gray-900 rounded-lg overflow-hidden mb-4 relative" style={{ height: "280px" }}>
                {videoEnabled ? (
                  <video ref={videoRef} autoPlay muted={false} playsInline className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <VideoOff className="h-12 w-12 text-gray-400" />
                  </div>
                )}

                {isListening && (
                  <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                    🎤 Listening...
                  </div>
                )}

                {/* Video mute/unmute indicator */}
                {videoEnabled && (
                  <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                    Video: ON
                  </div>
                )}
              </div>

              {/* ✅ SIMPLIFIED: Only video and mic toggle buttons */}
              <div className="flex justify-center space-x-4 mb-6">
                <button
                  onClick={() => setVideoEnabled((prev) => !prev)}
                  className={`p-3 rounded-full transition-all duration-200 ${
                    videoEnabled
                      ? "bg-green-600 text-white hover:bg-green-700 shadow-lg"
                      : "bg-red-600 text-white hover:bg-red-700 shadow-lg"
                  }`}
                  title={videoEnabled ? "Turn Off Camera" : "Turn On Camera"}
                >
                  {videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </button>

                {/* ✅ ENHANCED: Single mic button with detailed status */}
                <button
                  onClick={toggleMic}
                  className={`p-3 rounded-full transition-all duration-200 ${
                    micEnabled && (isListening || recognitionRestarting)
                      ? "bg-green-600 text-white hover:bg-green-700 shadow-lg ring-2 ring-green-300" 
                      : micEnabled 
                        ? "bg-yellow-600 text-white hover:bg-yellow-700 shadow-lg"
                        : "bg-red-600 text-white hover:bg-red-700 shadow-lg"
                  }`}
                  title={
                    micEnabled && recognitionRestarting
                      ? "Mic ON - Restarting speech recognition..."
                      : micEnabled && isListening 
                        ? "Mic ON - Speech recognition active with auto-restart" 
                        : micEnabled 
                          ? "Mic ON - Speech recognition ready"
                          : "Mic OFF"
                  }
                >
                  {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                  {/* Show restart indicator */}
                  {recognitionRestarting && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-spin">
                      <div className="w-1 h-1 bg-white rounded-full absolute top-0.5 left-0.5"></div>
                    </div>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-6">
                <div>
                  <p className="font-medium">Video On Time</p>
                  <p>
                    {Math.floor(videoOnTime / 60)}:{(videoOnTime % 60).toString().padStart(2, "0")}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Total Time</p>
                  <p>
                    {Math.floor(totalTime / 60)}:{(totalTime % 60).toString().padStart(2, "0")}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Your Answer</label>
                  <div className="flex items-center space-x-2">
                    <select
                      value={voiceLanguage}
                      onChange={(e) => setVoiceLanguage(e.target.value)}
                      className="text-xs px-2 py-1 border border-gray-300 rounded"
                    >
                      <option value="en-US">English (US)</option>
                      <option value="en-IN">English (Indian)</option>
                      <option value="hi-IN">Hindi</option>
                      <option value="es-ES">Spanish</option>
                      <option value="fr-FR">French</option>
                      <option value="de-DE">German</option>
                      <option value="ja-JP">Japanese</option>
                      <option value="zh-CN">Chinese</option>
                    </select>
                    
                    {/* ✅ ENHANCED: Detailed status indicator */}
                    <div className={`flex items-center px-3 py-1 text-sm rounded ${
                      recognitionRestarting
                        ? "bg-blue-100 text-blue-700"
                        : isListening
                          ? "bg-green-100 text-green-700"
                          : micEnabled
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-700"
                    }`}>
                      <Mic className="h-4 w-4 mr-1" />
                      {recognitionRestarting 
                        ? "Restarting..." 
                        : isListening 
                          ? "Listening..." 
                          : micEnabled 
                            ? "Ready" 
                            : "Off"
                      }
                      {recognitionRestarting && (
                        <div className="ml-2 w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ✅ ENHANCED: Show active listening status with auto-restart indicator */}
                {(isListening || recognitionRestarting) && (
                  <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center">
                      <span className="h-3 w-3 rounded-full bg-green-500 animate-pulse mr-2"></span>
                      <span className="text-sm font-medium text-green-700">
                        {recognitionRestarting 
                          ? "🔄 Restarting speech recognition..." 
                          : `🎤 Listening in ${voiceLanguage.split("-")[0]} - Speak naturally`
                        }
                      </span>
                    </div>
                    {interimTranscript && !recognitionRestarting && (
                      <div className="text-sm text-gray-600 mt-1 italic">"{interimTranscript}"</div>
                    )}
                  </div>
                )}

                {recognitionError && (
                  <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-start space-x-2">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-red-800">Speech Recognition Issue</h4>
                        <p className="text-sm text-red-700 mt-1">{recognitionError}</p>
                        {!speechRecognitionSupported && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                            <p className="text-xs text-yellow-800">
                              <strong>💡 Alternative:</strong> Speech-to-text is not compatible with your device/browser. 
                              Please type your answers directly in the text area below instead.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <textarea
                  ref={textAreaRef}
                  value={currentAnswer + (interimTranscript ? " " + interimTranscript : "")}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Supports speech input for some devices , other devices must check their Chrome settings whether they have enabled speech recording or not...."
                />
              </div>

              {/* ✅ ENHANCED: Tips section with auto-restart information */}
              <div className="text-sm text-gray-500 mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="mb-2">💡 <strong>Enhanced Speech Recognition:</strong></p>
                <ul className="space-y-1 text-xs">
                  {speechRecognitionSupported ? (
                    <>
                      <li>• ✅ Speech recognition is supported in your browser</li>
                      <li>• 🔄 Auto-restart feature: Speech will automatically restart if it stops</li>
                      <li>• 🎯 Continuous listening: No need to manually restart after pauses</li>
                      <li>• 🌐 Multi-language support with {voiceLanguage} selected</li>
                      <li>• ✏️ You can edit the text manually at any time</li>
                      <li>• 🛡️ Robust error recovery with automatic retry</li>
                    </>
                  ) : (
                    <>
                      <li>• ❌ Speech recognition not supported - please use Chrome, Edge, or Safari</li>
                      <li>• You can still type your answers manually</li>
                    </>
                  )}
                </ul>
              </div>

              <button
                onClick={() => submitAnswer(currentAnswer)}
                disabled={loading || !currentAnswer.trim()}
                className={`w-full py-3 rounded-md transition-colors flex items-center justify-center ${
                  loading || !currentAnswer.trim()
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <Send className="h-4 w-4 mr-2" />
                {loading ? "Processing Answer..." : "Submit Answer & Continue"}
              </button>
            </div>
          </div>
          </div>
        </div>
      </div>
      )}
      {/* Mobile-only: Result feedback at the end */}
      <div
        ref={resultDivRef}
        className="block md:hidden w-full px-2 py-4"
        style={{ scrollMarginTop: 80 }}
      >
        {session?.evaluation && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 mb-4 border border-blue-200 dark:border-slate-700">
            <div className="font-bold text-lg mb-2 text-blue-700 dark:text-blue-300">Previous Answer Score: {session.evaluation.score}/10</div>
            <div className="text-gray-700 dark:text-gray-200 mb-2">{session.evaluation.feedback}</div>
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">Technical: {session.evaluation.technicalAccuracy}/10</span>
              <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">Communication: {session.evaluation.communication}/10</span>
              <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">Depth: {session.evaluation.depth}/10</span>
              <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs">Video: {calculateVideoScore()}/10</span>
            </div>
            {session.evaluation.improvements?.length > 0 && (
              <div className="mt-2">
                <div className="font-semibold text-sm text-gray-800 dark:text-gray-300 mb-1">Improvements:</div>
                <ul className="list-disc ml-5 text-gray-700 dark:text-gray-200 text-sm">
                  {session.evaluation.improvements.map((imp, idx) => (
                    <li key={idx}>{imp}</li>
                  ))}
                </ul>
              </div>
            )}
            {session.evaluation && !session.isComplete && (
                  <button
                    onClick={proceedToNextQuestion}
                    className="w-full mt-4 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition-colors"
                  >
                    Continue to Next Question
                  </button>
                )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Interview
// }

// export default Interview
