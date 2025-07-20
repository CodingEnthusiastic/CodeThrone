"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import axios from "axios"
import { Video, Mic, MicOff, VideoOff, User, Bot, Send, Volume2, VolumeX, X } from "lucide-react"

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
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speechEnabled, setSpeechEnabled] = useState(true)
  const [waitingForNextQuestion, setWaitingForNextQuestion] = useState(false)

  const [voiceLanguage, setVoiceLanguage] = useState("en-US")
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null)
  const [recognitionError, setRecognitionError] = useState<string | null>(null)
  const [interimTranscript, setInterimTranscript] = useState("")
  const [finalTranscript, setFinalTranscript] = useState("")
  const [shouldRestart, setShouldRestart] = useState(false)
  const [restartAttempts, setRestartAttempts] = useState(0)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const recognitionRef = useRef<any>(null)
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const finalTranscriptRef = useRef<string>("")
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Text-to-speech function
  const speakText = (text: string) => {
    if (!speechEnabled || !("speechSynthesis" in window)) return

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

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    speechSynthesisRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }

  // Stop speech
  const stopSpeaking = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
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
        if (isListening) {
          stopListening()
        }
        disableVideo()

        // Clear all timeouts
        if (restartTimeoutRef.current) {
          clearTimeout(restartTimeoutRef.current)
        }

        // Reset all states to initial values
        setSession(null)
        setScores([])
        setVideoOnTime(0)
        setTotalTime(0)
        setStartTime(null)
        setFinalReport(null)
        setCurrentAnswer("")
        setTranscript("")
        setFinalTranscript("")
        setInterimTranscript("")
        setPermissionError(null)
        setWaitingForNextQuestion(false)
        setIsListening(false)
        setShouldRestart(false)
        setRestartAttempts(0)
        setRecognitionError(null)
        setLoading(false)
        setIsUploading(false)

        // Reset refs
        finalTranscriptRef.current = ""

        console.log("✅ Interview stopped and reset to initial state")
      } catch (error) {
        console.error("Error stopping interview:", error)
        // Force reset on error
        setSession(null)
        setScores([])
        setVideoOnTime(0)
        setTotalTime(0)
        setStartTime(null)
        setFinalReport(null)
        setCurrentAnswer("")
        setTranscript("")
        setFinalTranscript("")
        setInterimTranscript("")
        setPermissionError(null)
        setWaitingForNextQuestion(false)
        setIsListening(false)
        setShouldRestart(false)
        setRestartAttempts(0)
        setRecognitionError(null)
        setLoading(false)
        setIsUploading(false)
        finalTranscriptRef.current = ""
      }
    }
  }

  useEffect(() => {
    return () => {
      // Cleanup media stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
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
          setPermissionError("Video could not be enabled. Try again.")
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
    // Update session timing periodically
    if (session && startTime) {
      const interval = setInterval(async () => {
        try {
          await axios.post("http://localhost:5000/api/interview/update-timing", {
            sessionId: session.sessionId,
            videoOnTime,
            totalTime,
          })
        } catch (error) {
          console.error("Error updating timing:", error)
        }
      }, 10000)
      return () => clearInterval(interval)
    }
  }, [session, videoOnTime, totalTime])

  // Enhanced speech recognition with better restart logic
  useEffect(() => {
    // Don't initialize if not supported
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      console.warn("Speech recognition not supported")
      return
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognitionAPI()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = voiceLanguage
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      let finalText = ""
      let interimText = ""

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalText += transcript + " "
        } else {
          interimText += transcript
        }
      }

      if (finalText) {
        setFinalTranscript((prev) => prev + finalText)
        setCurrentAnswer((prev) => (prev + " " + finalText).trim())
        // Reset restart attempts on successful recognition
        setRestartAttempts(0)
      }

      setInterimTranscript(interimText)
    }

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error)

      // Don't show error for aborted recognition (user stopped intentionally)
      if (event.error !== "aborted") {
        setRecognitionError(`Error: ${event.error}`)

        // Handle specific errors
        if (event.error === "no-speech" || event.error === "audio-capture") {
          // These are recoverable errors, try to restart
          setShouldRestart(true)
        }
      }

      setIsListening(false)
    }

    recognition.onend = () => {
      console.log("Recognition ended, restart attempts:", restartAttempts)
      setIsListening(false)

      // Auto-restart if we should be listening and haven't exceeded max attempts
      if (shouldRestart && restartAttempts < 5) {
        console.log("Attempting to restart recognition...")
        setRestartAttempts((prev) => prev + 1)

        // Clear any existing timeout
        if (restartTimeoutRef.current) {
          clearTimeout(restartTimeoutRef.current)
        }

        // Restart after a short delay
        restartTimeoutRef.current = setTimeout(() => {
          try {
            recognition.start()
            setIsListening(true)
            setRecognitionError(null)
          } catch (err) {
            console.error("Failed to restart recognition:", err)
            if (restartAttempts >= 4) {
              setRecognitionError("Speech recognition failed multiple times. Please try manually.")
              setShouldRestart(false)
            }
          }
        }, 1000)
      } else if (restartAttempts >= 5) {
        setRecognitionError("Speech recognition stopped. Please restart manually.")
        setShouldRestart(false)
        setRestartAttempts(0)
      }
    }

    recognition.onstart = () => {
      console.log("Recognition started")
      setIsListening(true)
      setRecognitionError(null)
    }

    setRecognitionInstance(recognition)

    return () => {
      if (recognition) {
        recognition.stop()
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
      }
    }
  }, [voiceLanguage, shouldRestart, restartAttempts])

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.scrollTop = textAreaRef.current.scrollHeight
    }
  }, [currentAnswer])

  // Only speak question when it's a new question and not waiting for next question
  useEffect(() => {
    if (session?.question && speechEnabled && !waitingForNextQuestion) {
      const questionText = `Question ${session.questionNumber} of 10. ${session.question}`
      // Add a small delay to ensure the UI is ready
      setTimeout(() => speakText(questionText), 500)
    }
  }, [session?.question, speechEnabled, waitingForNextQuestion])

  const startInterview = async () => {
    console.log("🎤 Starting interview with role:", role, "experience:", experience)
    setLoading(true)
    setPermissionError(null)

    try {
      const response = await axios.post("http://localhost:5000/api/interview/start", {
        role,
        experience,
      })
      console.log("✅ Interview started successfully:", response.data)
      setSession(response.data)
      setStartTime(new Date())
      setVideoOnTime(0)
      setTotalTime(0)
      setScores([])
      setFinalReport(null)
      setWaitingForNextQuestion(false)
    } catch (error: any) {
      console.error("❌ Error starting interview:", error)
      setPermissionError(error.response?.data?.message || "Failed to start interview. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const enableVideo = async () => {
    console.log("📹 Enabling video and audio...")
    setPermissionError(null)

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      await new Promise((res) => requestAnimationFrame(res))
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      })

      streamRef.current = stream

      for (let i = 0; i < 10 && !videoRef.current; i++) {
        await new Promise((r) => setTimeout(r, 50))
      }
      if (!videoRef.current) {
        throw new Error("videoRef not available after retries")
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        console.log("✅ Video stream attached to video element")
      }

      setVideoEnabled(true)
      setMicEnabled(true)
      console.log("✅ Video and audio enabled successfully")
    } catch (error: any) {
      console.error("❌ Error accessing media devices:", error)
      setPermissionError("Please allow access to camera and microphone for the best interview experience")
    }
  }

  const disableVideo = () => {
    console.log("📹 Disabling video and audio...")
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setVideoEnabled(false)
    setMicEnabled(false)

    if (isListening) {
      stopListening()
    }
    console.log("✅ Video and audio disabled")
  }

  const startListening = () => {
    if (!recognitionInstance || !micEnabled) {
      setPermissionError("Please enable microphone first or speech recognition is not supported")
      return
    }

    console.log("🎤 Starting speech recognition...")
    setRecognitionError(null)
    setFinalTranscript("")
    setInterimTranscript("")
    setShouldRestart(true)
    setRestartAttempts(0)

    try {
      recognitionInstance.start()
      setIsListening(true)
    } catch (error) {
      console.error("Error starting speech recognition:", error)
      setRecognitionError("Failed to start speech recognition")
    }
  }

  const stopListening = () => {
    if (!recognitionInstance) return

    console.log("🎤 Stopping speech recognition...")
    setShouldRestart(false)
    setRestartAttempts(0)

    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current)
    }

    try {
      recognitionInstance.stop()
      setIsListening(false)
      setInterimTranscript("")
    } catch (error) {
      console.error("Error stopping speech recognition:", error)
    }
  }

  const submitAnswer = async (answer: string) => {
    if (!session || !answer.trim()) {
      setPermissionError("Please provide an answer before submitting")
      return
    }

    console.log("📝 Submitting answer for question", session.questionNumber)
    setLoading(true)
    setPermissionError(null)
    setWaitingForNextQuestion(true)

    // Stop any current speech and listening
    stopSpeaking()
    if (isListening) {
      stopListening()
    }

    try {
      const response = await axios.post("http://localhost:5000/api/interview/answer", {
        sessionId: session.sessionId,
        answer,
        questionNumber: session.questionNumber,
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
        setWaitingForNextQuestion(false)
        await generateFinalReport()
      } else {
        console.log("➡️ Moving to next question:", response.data.questionNumber)
        // Show evaluation first, then wait for user to proceed
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

      // Clear answer and reset transcript
      setCurrentAnswer("")
      finalTranscriptRef.current = ""
    } catch (error: any) {
      console.error("❌ Error submitting answer:", error)
      setPermissionError(error.response?.data?.message || "Failed to submit answer. Please try again.")
      setWaitingForNextQuestion(false)
    } finally {
      setLoading(false)
    }
  }

  const proceedToNextQuestion = async () => {
    if (!session) return

    try {
      // Get the next question data from the previous response
      const response = await axios.post("http://localhost:5000/api/interview/answer", {
        sessionId: session.sessionId,
        answer: currentAnswer || "No additional response",
        questionNumber: session.questionNumber,
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
                evaluation: undefined, // Clear previous evaluation
                isComplete: false,
              }
            : null,
        )
      }

      setWaitingForNextQuestion(false)
    } catch (error) {
      console.error("❌ Error getting next question:", error)
      setWaitingForNextQuestion(false)
    }
  }

  const generateFinalReport = async () => {
    if (!session) return

    console.log("📊 Generating final report...")
    try {
      const response = await axios.post("http://localhost:5000/api/interview/generate-report", {
        sessionId: session.sessionId,
      })

      console.log("✅ Final report generated:", response.data)
      setFinalReport(response.data)
    } catch (error) {
      console.error("❌ Error generating report:", error)
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

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <Bot className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">AI Interview Assistant</h1>
            <p className="text-xl text-gray-600">
              Practice technical interviews with AI-powered questions, voice interaction, and real-time feedback
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Setup Your Interview</h2>

            {permissionError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800">{permissionError}</p>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Frontend Developer">Frontend Developer</option>
                  <option value="Backend Developer">Backend Developer</option>
                  <option value="Full Stack Developer">Full Stack Developer</option>
                  <option value="Data Scientist">Data Scientist</option>
                  <option value="DevOps Engineer">DevOps Engineer</option>
                  <option value="Mobile Developer">Mobile Developer</option>
                  <option value="Machine Learning Engineer">Machine Learning Engineer</option>
                  <option value="Product Manager">Product Manager</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Experience Level</label>
                <select
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="0">Entry Level (0-1 years)</option>
                  <option value="2">Junior (2-3 years)</option>
                  <option value="4">Mid-Level (4-6 years)</option>
                  <option value="7">Senior (7+ years)</option>
                  <option value="10">Staff/Principal (10+ years)</option>
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">🎯 Enhanced Features</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• AI speaks questions aloud with professional voice</li>
                  <li>• Continuous speech-to-text with auto-restart</li>
                  <li>• 10 adaptive technical questions</li>
                  <li>• Real-time AI evaluation and feedback</li>
                  <li>• Video presence scoring</li>
                  <li>• Comprehensive final report with recommendations</li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">💡 Tips for Success</h3>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Enable camera and microphone for better scoring</li>
                  <li>• Listen to AI questions and speak naturally</li>
                  <li>• Speech recognition will auto-restart if it stops</li>
                  <li>• Think out loud to show your problem-solving process</li>
                  <li>• Maintain eye contact with the camera</li>
                </ul>
              </div>

              <button
                onClick={startInterview}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Starting Interview..." : "Start AI Interview"}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (session.isComplete && finalReport) {
    const finalScore = finalReport.overallScore
    const scoreBand = getScoreBand(finalScore)

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Interview Complete! 🎉</h1>
              <div className="text-6xl font-bold mb-4">
                <span className={scoreBand.color}>{finalScore}</span>
              </div>
              <div className="text-xl font-semibold mb-4">
                <span className={scoreBand.color}>{scoreBand.band}</span>
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
                  setPermissionError(null)
                  setWaitingForNextQuestion(false)
                  finalTranscriptRef.current = ""
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
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
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

        {permissionError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{permissionError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* AI Avatar */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-center mb-6">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                <Bot className="h-16 w-16 text-white" />
                {isSpeaking && (
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                    <Volume2 className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900">AI Interviewer</h2>
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
                    onClick={() => speakText(session.question)}
                    disabled={isSpeaking}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-full disabled:opacity-50"
                    title="Speak question"
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={stopSpeaking}
                    disabled={!isSpeaking}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-full disabled:opacity-50"
                    title="Stop speaking"
                  >
                    <VolumeX className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="text-gray-700 mb-4">{session.question}</p>

              {session.expectedTopics.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Expected Topics:</h4>
                  <div className="flex flex-wrap gap-2">
                    {session.expectedTopics.map((topic, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
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

                {waitingForNextQuestion && (
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
                  <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
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

                {restartAttempts > 0 && (
                  <div className="absolute top-4 right-4 bg-yellow-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Restarting... ({restartAttempts}/5)
                  </div>
                )}
              </div>

              {/* Removed the purple play button, kept only video and mic controls */}
              <div className="flex justify-center space-x-4 mb-6">
                <button
                  onClick={() => setVideoEnabled((prev) => !prev)}
                  className={`p-3 rounded-full ${
                    videoEnabled
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </button>

                <button
                  onClick={() => setMicEnabled(!micEnabled)}
                  disabled={!videoEnabled}
                  className={`p-3 rounded-full ${
                    micEnabled ? "bg-green-600 text-white hover:bg-green-700" : "bg-red-600 text-white hover:bg-red-700"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
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
                      disabled={isListening}
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
                    <button
                      onClick={isListening ? stopListening : startListening}
                      disabled={!micEnabled}
                      className={`flex items-center px-3 py-1 text-sm rounded ${
                        isListening
                          ? "bg-red-100 text-red-700 hover:bg-red-200"
                          : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <Mic className="h-4 w-4 mr-1" />
                      {isListening ? "Stop Listening" : "Start Speaking"}
                    </button>
                  </div>
                </div>

                {/* Show recording status and interim results */}
                {isListening && (
                  <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse mr-2"></span>
                        <span className="text-sm font-medium text-blue-700">
                          Listening... ({voiceLanguage.split("-")[0]}) - Auto-restart enabled
                        </span>
                      </div>
                      {recognitionError && <span className="text-xs text-red-500">{recognitionError}</span>}
                    </div>
                    {interimTranscript && (
                      <div className="text-sm text-gray-600 mt-1 italic">"{interimTranscript}"</div>
                    )}
                  </div>
                )}

                <textarea
                  ref={textAreaRef}
                  value={currentAnswer + (interimTranscript ? " " + interimTranscript : "")}
                  onChange={(e) => {
                    setCurrentAnswer(e.target.value)
                    setFinalTranscript(e.target.value)
                  }}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Start recording and speaking, or type your detailed answer here..."
                  disabled={isListening}
                />
              </div>

              <div className="text-sm text-gray-500 mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="mb-2">
                  💡 <strong>Pro Tips:</strong>
                </p>
                <ul className="space-y-1 text-xs">
                  <li>• Select your preferred language and click "Start Speaking"</li>
                  <li>• Speech recognition will automatically restart if it stops</li>
                  <li>• Speak naturally - text appears in real-time</li>
                  <li>• You can continue speaking for as long as needed</li>
                  <li>• Click "Stop Listening" when you're done speaking</li>
                  <li>• Explain your thought process step by step</li>
                  <li>• Provide specific examples from your experience</li>
                </ul>
                {isListening && (
                  <p className="text-blue-600 mt-2 font-medium">
                    🎤 <strong>Listening continuously...</strong> Keep speaking, the system will auto-restart if needed.
                  </p>
                )}
                {recognitionError && (
                  <p className="text-red-600 mt-2 font-medium">
                    ❌ <strong>Error:</strong> {recognitionError}
                  </p>
                )}
              </div>

              {!waitingForNextQuestion && (
                <button
                  onClick={() => submitAnswer(currentAnswer)}
                  disabled={loading || !currentAnswer.trim()}
                  className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {loading ? "Processing Answer..." : "Submit Answer & Continue"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Interview
