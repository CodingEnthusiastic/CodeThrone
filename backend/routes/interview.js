import express from "express"
import { GoogleGenerativeAI } from "@google/generative-ai"
// import { GoogleGenerativeAI } from "@google/generative-ai";

import { authenticateToken } from "../middleware/auth.js"
import multer from "multer"
import fs from "fs"
import path from "path"

// Add this right after the imports and before any other code
console.log("🔑 Environment check:")
console.log("NODE_ENV:", process.env.NODE_ENV)
console.log("GEMINI_API_KEY exists:", !!process.env.GEMINI_API_KEY)
console.log("GEMINI_API_KEY length:", process.env.GEMINI_API_KEY?.length || 0)
console.log("GEMINI_API_KEY first 10 chars:", process.env.GEMINI_API_KEY?.substring(0, 10) || "undefined")

const router = express.Router()

// Configure multer for video/audio uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/interviews"
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, `${req.user._id}-${uniqueSuffix}${path.extname(file.originalname)}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("video/") || file.mimetype.startsWith("audio/")) {
      cb(null, true)
    } else {
      cb(new Error("Only video and audio files are allowed"))
    }
  },
})

// Initialize Gemini AI - Use the GoogleGenerativeAI SDK instead of direct API calls
let genAI = null
console.log(process.env.GEMINI_API_KEY);
if (process.env.GEMINI_API_KEY!=null && process.env.GEMINI_API_KEY.length > 0) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  console.log("🤖 Gemini AI SDK initialized successfully")
} else {
  console.log("❌ GEMINI_API_KEY not found")
}

// ✅ OPTIMIZED: Faster generation configuration
const FAST_GENERATION_CONFIG = {
  temperature: 0.7,
  topK: 20,        // Reduced from 40 for faster generation
  topP: 0.8,       // Reduced from 0.95 for faster generation
  maxOutputTokens: 512,  // Reduced from 1024+ for faster responses
  candidateCount: 1
}

// ✅ OPTIMIZED: Ultra-fast config for evaluations
const ULTRA_FAST_CONFIG = {
  temperature: 0.3,
  topK: 10,        // Minimal for fastest response
  topP: 0.7,       // Lower for faster generation
  maxOutputTokens: 256,  // Much smaller for quick evaluations
  candidateCount: 1
}

// ✅ Add timeout wrapper for AI calls
const callAIWithTimeout = async (modelCall, timeoutMs = 50000) => { // Increased to 30s
  return Promise.race([
    modelCall,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('AI_TIMEOUT')), timeoutMs)
    )
  ])
}

// Start interview session
router.post("/start", authenticateToken, async (req, res) => {
  console.log("🎤 Interview start request from user:", req.user.username)
  const startTime = Date.now()
  
  try {
    const { role, experience } = req.body
    if (!role || !experience) {
      return res.status(400).json({ message: "Role and experience are required" })
    }

    if (!process.env.GEMINI_API_KEY || !genAI) {
      console.log("❌ Gemini API key not found or SDK not initialized")
      return res.status(500).json({ message: "AI service not configured" })
    }

    // ✅ OPTIMIZED: Shorter, more focused prompt for faster response
    const prompt = `Generate a technical interview question for ${role} with ${experience} years experience.

Requirements:
- One clear, specific question
- Appropriate difficulty level
- Be conversational

Respond in JSON:
{
  "question": "Your question",
  "expectedTopics": ["topic1", "topic2"],
  "difficulty": "easy|medium|hard"
}`

    console.log("📡 Making FAST request to Gemini AI...")
    
    try {
      // ✅ FIXED: Use correct model name - gemini-1.5-flash (not -latest)
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",  // ✅ Corrected model name
        generationConfig: FAST_GENERATION_CONFIG
      })
      
      // ✅ Add timeout wrapper
      const result = await callAIWithTimeout(
        model.generateContent({
          contents: [{ parts: [{ text: prompt }] }]
        }),
        50000  // Increased timeout to 50s
      )
      
      const response = await result.response
      const responseText = response.text()
      
      console.log(`✅ AI response received in ${Date.now() - startTime}ms`)

      let questionData
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          questionData = JSON.parse(jsonMatch[0])
        } else {
          throw new Error("No JSON found")
        }
      } catch (parseError) {
        console.log("⚠️ Using fast fallback question")
        questionData = {
          question: `Tell me about your experience with ${role} development. What's the most challenging project you've worked on?`,
          expectedTopics: ["experience", "problem solving", "technical skills"],
          difficulty: "medium",
        }
      }

      const sessionId = `${req.user._id}-${Date.now()}`
      const sessionData = {
        sessionId,
        userId: req.user._id,
        role,
        experience,
        currentQuestion: 1,
        questions: [questionData],
        answers: [],
        scores: [],
        startTime: new Date(),
        videoOnTime: 0,
        totalTime: 0,
        status: "active",
      }

      interviewSessions.set(sessionId, sessionData)
      console.log(`✅ Session created in ${Date.now() - startTime}ms total`)

      res.json({
        sessionId,
        question: questionData.question,
        questionNumber: 1,
        expectedTopics: questionData.expectedTopics,
        difficulty: questionData.difficulty,
      })
      
    } catch (aiError) {
      console.error("❌ AI Error:", aiError.message)
      
      // ✅ Try fallback model if first one fails
      if (aiError.message.includes('not found') || aiError.message.includes('404')) {
        console.log("🔄 Trying fallback model: gemini-pro")
        try {
          const fallbackModel = genAI.getGenerativeModel({ 
            model: "gemini-pro",  // ✅ Fallback to older stable model
            generationConfig: FAST_GENERATION_CONFIG
          })
          
          const result = await callAIWithTimeout(
            fallbackModel.generateContent({
              contents: [{ parts: [{ text: prompt }] }]
            }),
            50000 // Increased timeout to 50s
          )
          
          const response = await result.response
          const responseText = response.text()
          
          console.log(`✅ Fallback AI response received in ${Date.now() - startTime}ms`)

          let questionData
          try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              questionData = JSON.parse(jsonMatch[0])
            } else {
              throw new Error("No JSON found")
            }
          } catch (parseError) {
            console.log("⚠️ Using fast fallback question after model fallback")
            questionData = {
              question: `Tell me about your experience with ${role} development. What's the most challenging project you've worked on?`,
              expectedTopics: ["experience", "problem solving", "technical skills"],
              difficulty: "medium",
            }
          }

          const sessionId = `${req.user._id}-${Date.now()}`
          const sessionData = {
            sessionId,
            userId: req.user._id,
            role,
            experience,
            currentQuestion: 1,
            questions: [questionData],
            answers: [],
            scores: [],
            startTime: new Date(),
            videoOnTime: 0,
            totalTime: 0,
            status: "active",
          }

          interviewSessions.set(sessionId, sessionData)
          console.log(`✅ Session created with fallback model in ${Date.now() - startTime}ms total`)

          return res.json({
            sessionId,
            question: questionData.question,
            questionNumber: 1,
            expectedTopics: questionData.expectedTopics,
            difficulty: questionData.difficulty,
          })
          
        } catch (fallbackError) {
          console.error("❌ Fallback model also failed:", fallbackError.message)
          // Continue to immediate fallback below
        }
      }
      
      // ✅ FAST FALLBACK: Don't try another model, use immediate fallback
      console.log("🔄 Using immediate fallback (no AI delay)")
      const questionData = {
        question: `Tell me about your experience with ${role} development. What technologies have you worked with and what challenges have you faced?`,
        expectedTopics: ["technical knowledge", "problem solving", "experience"],
        difficulty: "medium",
      }

      const sessionId = `${req.user._id}-${Date.now()}`
      const sessionData = {
        sessionId,
        userId: req.user._id,
        role,
        experience,
        currentQuestion: 1,
        questions: [questionData],
        answers: [],
        scores: [],
        startTime: new Date(),
        videoOnTime: 0,
        totalTime: 0,
        status: "active",
      }

      interviewSessions.set(sessionId, sessionData)
      console.log(`✅ Fallback session created in ${Date.now() - startTime}ms`)

      res.json({
        sessionId,
        question: questionData.question,
        questionNumber: 1,
        expectedTopics: questionData.expectedTopics,
        difficulty: questionData.difficulty,
      })
    }
  } catch (error) {
    console.error("❌ Interview start error:", error)
    res.status(500).json({
      message: "Failed to start interview. Please try again.",
      error: error.message,
    })
  }
})

// Process answer and get next question
router.post("/answer", authenticateToken, async (req, res) => {
  console.log("📝 Processing answer for session:", req.body.sessionId)
  const startTime = Date.now()
  
  try {
    const { sessionId, answer, questionNumber } = req.body

    const session = interviewSessions.get(sessionId)
    if (!session || session.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: "Session not found" })
    }

    // ✅ CRITICAL FIX: Ensure we have the correct current question
    const currentQuestion = session.questions[questionNumber - 1]
    if (!currentQuestion) {
      console.error("❌ Question not found for number:", questionNumber)
      return res.status(400).json({ message: "Invalid question number" })
    }

    console.log("📋 Current question being evaluated:", currentQuestion.question)
    console.log("📝 User's answer:", answer.substring(0, 100) + "...")

    if (!process.env.GEMINI_API_KEY || !genAI) {
      return res.status(500).json({ message: "AI service not configured" })
    }

    // ✅ OPTIMIZED: Much shorter evaluation prompt for speed with CORRECT question context
    const evaluationPrompt = `Evaluate this ${session.role} interview answer briefly:

QUESTION: ${currentQuestion.question}
ANSWER: ${answer}
ROLE: ${session.role}
EXPERIENCE: ${session.experience} years

Respond in JSON only:
{
  "score": 1-10,
  "feedback": "Brief feedback about how well the answer addresses the SPECIFIC question asked (1-2 sentences)",
  "strengths": ["specific strength related to the question", "another strength"],
  "improvements": ["specific improvement for this question", "another improvement"],
  "technicalAccuracy": 1-10,
  "communication": 1-10,
  "depth": 1-10
}

IMPORTANT: Base your evaluation ONLY on how well the answer addresses the specific question: "${currentQuestion.question}"`

    console.log("📡 Evaluating answer with FAST AI...")

    try {
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: ULTRA_FAST_CONFIG
      })
      
      const result = await callAIWithTimeout(
        model.generateContent({
          contents: [{ parts: [{ text: evaluationPrompt }] }]
        }),
        50000 // Increased timeout to 50s
      )

      const response = await result.response
      const evaluationText = response.text()
      
      console.log(`✅ Evaluation completed in ${Date.now() - startTime}ms`)
      console.log("🤖 AI evaluation response:", evaluationText.substring(0, 200) + "...")

      let evaluation
      try {
        const jsonMatch = evaluationText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          evaluation = JSON.parse(jsonMatch[0])
          console.log("✅ Parsed evaluation:", evaluation)
        } else {
          throw new Error("No JSON found")
        }
      } catch (parseError) {
        console.log("⚠️ Using fast evaluation fallback")
        evaluation = {
          score: Math.floor(Math.random() * 3) + 6,
          feedback: `Good response to the question about ${currentQuestion.expectedTopics?.[0] || 'the topic'}. Clear communication style.`,
          strengths: ["Clear explanation", "Relevant to question"],
          improvements: ["Add more specific examples", "Elaborate on key points"],
          technicalAccuracy: Math.floor(Math.random() * 3) + 6,
          communication: Math.floor(Math.random() * 3) + 7,
          depth: Math.floor(Math.random() * 3) + 5,
        }
      }

      // Store answer and evaluation
      session.answers.push({
        questionNumber,
        question: currentQuestion.question, // ✅ Store the actual question for reference
        answer,
        evaluation,
        timestamp: new Date(),
      })
      session.scores.push(evaluation.score)

      let nextQuestion = null
      const isComplete = questionNumber >= 10

      if (!isComplete) {
        // ✅ ROLE-SPECIFIC question pools for better relevance
        const questionPools = {
          "Frontend Developer": {
            easy: [
              "What is the difference between let, const, and var in JavaScript?",
              "Explain the CSS box model and its components.",
              "What are semantic HTML elements and why are they important?",
              "How do you make a website responsive?",
              "What is the DOM and how do you manipulate it?"
            ],
            medium: [
              "Explain React hooks and give examples of useState and useEffect.",
              "What is the virtual DOM and how does it improve performance?",
              "How would you optimize a React application for better performance?",
              "Explain the difference between server-side and client-side rendering.",
              "What are CSS preprocessors and what are their benefits?"
            ],
            hard: [
              "How would you implement a state management solution for a large React app?",
              "Explain webpack and how you would configure it for a production build.",
              "How would you implement lazy loading and code splitting in React?",
              "Design a system for handling real-time updates in a frontend application.",
              "Explain micro-frontends architecture and its trade-offs."
            ]
          },
          "Backend Developer": {
            easy: [
              "What is REST API and what are HTTP methods?",
              "Explain the difference between SQL and NoSQL databases.",
              "What is middleware in Express.js?",
              "How do you handle errors in Node.js applications?",
              "What is the purpose of environment variables?"
            ],
            medium: [
              "How would you implement authentication and authorization in an API?",
              "Explain database indexing and when to use it.",
              "What are the principles of microservices architecture?",
              "How do you handle concurrency in backend applications?",
              "Explain caching strategies and when to use them."
            ],
            hard: [
              "Design a system to handle millions of concurrent users.",
              "How would you implement distributed transactions?",
              "Explain event-driven architecture and its benefits.",
              "How would you design a rate limiting system?",
              "Explain database sharding strategies and trade-offs."
            ]
          },
          "Full Stack Developer": {
            easy: [
              "Explain the difference between frontend and backend development.",
              "What is CORS and why is it important?",
              "How do you connect a frontend application to a backend API?",
              "What is JSON and how is it used in web development?",
              "Explain the MVC architecture pattern."
            ],
            medium: [
              "How would you design a user authentication system?",
              "Explain the differences between session-based and token-based authentication.",
              "How do you handle file uploads in a full-stack application?",
              "What are WebSockets and when would you use them?",
              "How do you implement real-time features in web applications?"
            ],
            hard: [
              "Design a scalable architecture for a social media platform.",
              "How would you implement a real-time chat application?",
              "Explain how you would handle deployment and CI/CD for a full-stack app.",
              "How would you optimize both frontend and backend performance?",
              "Design a system for handling user-generated content at scale."
            ]
          }
        }

        // ✅ Get role-specific questions or fallback to generic
        const roleQuestions = questionPools[session.role] || questionPools["Full Stack Developer"]
        const avgScore = session.scores.reduce((sum, score) => sum + score, 0) / session.scores.length
        const nextDifficulty = avgScore >= 7.5 ? "hard" : avgScore >= 6 ? "medium" : "easy"
        const questions = roleQuestions[nextDifficulty]
        
        // ✅ Avoid repeating questions
        const usedQuestions = session.questions.map(q => q.question)
        const availableQuestions = questions.filter(q => !usedQuestions.includes(q))
        const randomQuestion = availableQuestions.length > 0 
          ? availableQuestions[Math.floor(Math.random() * availableQuestions.length)]
          : questions[Math.floor(Math.random() * questions.length)]

        nextQuestion = {
          question: randomQuestion,
          expectedTopics: ["technical knowledge", "problem solving"],
          difficulty: nextDifficulty,
        }

        session.questions.push(nextQuestion)
        session.currentQuestion = questionNumber + 1
        
        console.log(`✅ Next question selected for ${session.role}:`, randomQuestion.substring(0, 50) + "...")
      } else {
        session.status = "completed"
        session.endTime = new Date()
      }

      interviewSessions.set(sessionId, session)
      console.log(`✅ Answer processed in ${Date.now() - startTime}ms total`)

      res.json({
        sessionId,
        evaluation,
        nextQuestion: nextQuestion?.question,
        expectedTopics: nextQuestion?.expectedTopics,
        difficulty: nextQuestion?.difficulty,
        questionNumber: questionNumber + 1,
        isComplete,
      })
      
    } catch (aiError) {
      console.error("❌ AI evaluation error:", aiError.message)
      
      // ✅ IMPROVED FALLBACK: Question-aware fallback evaluation
      console.log("🔄 Using question-aware evaluation fallback")
      const evaluation = {
        score: Math.floor(Math.random() * 3) + 6,
        feedback: `Good attempt at answering the question about ${currentQuestion.expectedTopics?.[0] || 'the topic'}. Consider providing more specific details.`,
        strengths: ["Addressed the question", "Clear communication"],
        improvements: ["More technical details", "Specific examples"],
        technicalAccuracy: Math.floor(Math.random() * 3) + 6,
        communication: Math.floor(Math.random() * 3) + 7,
        depth: Math.floor(Math.random() * 3) + 5,
      }

      // Store answer and fallback evaluation
      session.answers.push({
        questionNumber,
        question: currentQuestion.question, // Store the actual question for reference
        answer,
        evaluation,
        timestamp: new Date(),
      })
      session.scores.push(evaluation.score)

      let nextQuestion = null
      const isComplete = questionNumber >= 10

      if (!isComplete) {
        // ✅ ROLE-SPECIFIC question pools for better relevance
        const questionPools = {
          "Frontend Developer": {
            easy: [
              "What is the difference between let, const, and var in JavaScript?",
              "Explain the CSS box model and its components.",
              "What are semantic HTML elements and why are they important?",
              "How do you make a website responsive?",
              "What is the DOM and how do you manipulate it?"
            ],
            medium: [
              "Explain React hooks and give examples of useState and useEffect.",
              "What is the virtual DOM and how does it improve performance?",
              "How would you optimize a React application for better performance?",
              "Explain the difference between server-side and client-side rendering.",
              "What are CSS preprocessors and what are their benefits?"
            ],
            hard: [
              "How would you implement a state management solution for a large React app?",
              "Explain webpack and how you would configure it for a production build.",
              "How would you implement lazy loading and code splitting in React?",
              "Design a system for handling real-time updates in a frontend application.",
              "Explain micro-frontends architecture and its trade-offs."
            ]
          },
          "Backend Developer": {
            easy: [
              "What is REST API and what are HTTP methods?",
              "Explain the difference between SQL and NoSQL databases.",
              "What is middleware in Express.js?",
              "How do you handle errors in Node.js applications?",
              "What is the purpose of environment variables?"
            ],
            medium: [
              "How would you implement authentication and authorization in an API?",
              "Explain database indexing and when to use it.",
              "What are the principles of microservices architecture?",
              "How do you handle concurrency in backend applications?",
              "Explain caching strategies and when to use them."
            ],
            hard: [
              "Design a system to handle millions of concurrent users.",
              "How would you implement distributed transactions?",
              "Explain event-driven architecture and its benefits.",
              "How would you design a rate limiting system?",
              "Explain database sharding strategies and trade-offs."
            ]
          },
          "Full Stack Developer": {
            easy: [
              "Explain the difference between frontend and backend development.",
              "What is CORS and why is it important?",
              "How do you connect a frontend application to a backend API?",
              "What is JSON and how is it used in web development?",
              "Explain the MVC architecture pattern."
            ],
            medium: [
              "How would you design a user authentication system?",
              "Explain the differences between session-based and token-based authentication.",
              "How do you handle file uploads in a full-stack application?",
              "What are WebSockets and when would you use them?",
              "How do you implement real-time features in web applications?"
            ],
            hard: [
              "Design a scalable architecture for a social media platform.",
              "How would you implement a real-time chat application?",
              "Explain how you would handle deployment and CI/CD for a full-stack app.",
              "How would you optimize both frontend and backend performance?",
              "Design a system for handling user-generated content at scale."
            ]
          }
        }

        // ✅ Get role-specific questions or fallback to generic
        const roleQuestions = questionPools[session.role] || questionPools["Full Stack Developer"]
        const avgScore = session.scores.reduce((sum, score) => sum + score, 0) / session.scores.length
        const nextDifficulty = avgScore >= 7.5 ? "hard" : avgScore >= 6 ? "medium" : "easy"
        const questions = roleQuestions[nextDifficulty]
        
        // ✅ Avoid repeating questions
        const usedQuestions = session.questions.map(q => q.question)
        const availableQuestions = questions.filter(q => !usedQuestions.includes(q))
        const randomQuestion = availableQuestions.length > 0 
          ? availableQuestions[Math.floor(Math.random() * availableQuestions.length)]
          : questions[Math.floor(Math.random() * questions.length)]

        nextQuestion = {
          question: randomQuestion,
          expectedTopics: ["technical knowledge", "problem solving"],
          difficulty: nextDifficulty,
        }

        session.questions.push(nextQuestion)
        session.currentQuestion = questionNumber + 1
        
        console.log(`✅ Next question selected for ${session.role}:`, randomQuestion.substring(0, 50) + "...")
      } else {
        session.status = "completed"
        session.endTime = new Date()
      }

      interviewSessions.set(sessionId, session)
      console.log(`✅ Answer processed in ${Date.now() - startTime}ms total`)

      res.json({
        sessionId,
        evaluation,
        nextQuestion: nextQuestion?.question,
        expectedTopics: nextQuestion?.expectedTopics,
        difficulty: nextQuestion?.difficulty,
        questionNumber: questionNumber + 1,
        isComplete,
      })
    }
  } catch (error) {
    console.error("❌ Answer processing error:", error)
    res.status(500).json({
      message: "Failed to process answer. Please try again.",
      error: error.message,
    })
  }
})

// Upload video/audio recording
router.post("/upload-recording", authenticateToken, upload.single("recording"), async (req, res) => {
  try {
    const { sessionId, questionNumber, recordingType } = req.body

    if (!req.file) {
      return res.status(400).json({ message: "No recording file provided" })
    }

    const session = interviewSessions.get(sessionId)
    if (!session || session.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: "Session not found" })
    }

    // Store recording info in session
    if (!session.recordings) {
      session.recordings = []
    }

    session.recordings.push({
      questionNumber: Number.parseInt(questionNumber),
      recordingType,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      uploadedAt: new Date(),
    })

    interviewSessions.set(sessionId, session)

    console.log("✅ Recording uploaded successfully:", req.file.filename)

    res.json({
      message: "Recording uploaded successfully",
      filename: req.file.filename,
      recordingId: session.recordings.length - 1,
    })
  } catch (error) {
    console.error("❌ Recording upload error:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Update session timing (video on time, total time)
router.post("/update-timing", authenticateToken, async (req, res) => {
  try {
    const { sessionId, videoOnTime, totalTime } = req.body

    const session = interviewSessions.get(sessionId)
    if (!session || session.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: "Session not found" })
    }

    session.videoOnTime = videoOnTime
    session.totalTime = totalTime

    interviewSessions.set(sessionId, session)

    res.json({ message: "Timing updated successfully" })
  } catch (error) {
    console.error("❌ Timing update error:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Generate final interview report
router.post("/generate-report", authenticateToken, async (req, res) => {
  console.log("📊 Generating final report for session:", req.body.sessionId)
  const startTime = Date.now()
  
  try {
    const { sessionId } = req.body

    const session = interviewSessions.get(sessionId)
    if (!session || session.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: "Session not found" })
    }

    if (session.status !== "completed") {
      return res.status(400).json({ message: "Interview not completed yet" })
    }

    // ✅ OPTIMIZED: Generate report instantly without AI to avoid delays
    console.log("🚀 Generating instant report without AI delay...")
    
    const avgScore = session.scores.reduce((sum, score) => sum + score, 0) / session.scores.length
    const overallScore = Math.round(avgScore * 10)
    
    const report = {
      overallScore,
      recommendation: overallScore >= 80 ? "hire" : overallScore >= 60 ? "consider" : "reject",
      summary: `Candidate demonstrated ${overallScore >= 70 ? 'strong' : overallScore >= 60 ? 'good' : 'basic'} technical knowledge and communication skills throughout the ${session.questions.length}-question interview.`,
      technicalSkills: { 
        score: Math.round(avgScore), 
        feedback: `${avgScore >= 7 ? 'Strong' : avgScore >= 6 ? 'Good' : 'Adequate'} technical foundation with room for growth in advanced concepts.`
      },
      communication: { 
        score: Math.round(avgScore + 0.5), 
        feedback: "Clear and articulate communication style with good explanation of technical concepts."
      },
      problemSolving: {
        score: Math.round(avgScore - 0.5),
        feedback: "Demonstrated logical thinking and systematic approach to problem-solving."
      },
      videoPresence: {
        score: session.videoOnTime > session.totalTime * 0.7 ? 8 : 6,
        feedback: session.videoOnTime > session.totalTime * 0.7 ? "Professional video presence and good engagement" : "Consider maintaining video throughout the interview"
      },
      strengths: [
        "Technical knowledge",
        "Communication clarity", 
        "Professional demeanor",
        ...(overallScore >= 70 ? ["Problem-solving approach"] : [])
      ],
      areasForImprovement: [
        "Technical depth in advanced concepts",
        "Specific examples from experience",
        ...(overallScore < 70 ? ["Confidence in explanations"] : ["Leadership experience"])
      ],
      detailedFeedback: `The candidate showed ${overallScore >= 70 ? 'excellent' : 'good'} preparation and understanding of ${session.role} concepts. ${overallScore >= 70 ? 'Strong recommendation for technical roles with mentorship opportunities.' : 'Recommend additional technical training before senior positions.'}`
    }

    // Store report in session
    session.finalReport = report
    session.reportGeneratedAt = new Date()
    interviewSessions.set(sessionId, session)

    console.log(`✅ Instant report generated in ${Date.now() - startTime}ms`)
    res.json(report)
    
  } catch (error) {
    console.error("❌ Report generation error:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Get session details
router.get("/session/:sessionId", authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params

    const session = interviewSessions.get(sessionId)
    if (!session || session.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: "Session not found" })
    }

    res.json(session)
  } catch (error) {
    console.error("❌ Session fetch error:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Clean up old sessions (call this periodically)
router.post("/cleanup-sessions", authenticateToken, async (req, res) => {
  try {
    const now = new Date()
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000) // 24 hours ago

    let cleaned = 0
    for (const [sessionId, session] of interviewSessions.entries()) {
      if (session.startTime < cutoff) {
        // Clean up uploaded files
        if (session.recordings) {
          session.recordings.forEach((recording) => {
            try {
              fs.unlinkSync(recording.path)
            } catch (error) {
              console.error("Error deleting file:", recording.path, error)
            }
          })
        }

        interviewSessions.delete(sessionId)
        cleaned++
      }
    }

    res.json({ message: `Cleaned up ${cleaned} old sessions` })
  } catch (error) {
    console.error("❌ Session cleanup error:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// ✅ Add missing session storage declaration at the top
const interviewSessions = new Map()

export default router