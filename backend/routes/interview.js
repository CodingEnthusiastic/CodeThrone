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

// In-memory session storage (use Redis in production)
const interviewSessions = new Map()

// Start interview session
router.post("/start", authenticateToken, async (req, res) => {
  console.log("🎤 Interview start request from user:", req.user.username)
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  try {
    const { role, experience } = req.body
    console.log(genAI);
    console.log(process.env.GEMINI_API_KEY);
    if (!process.env.GEMINI_API_KEY || !genAI) {
      console.log("❌ Gemini API key not found or SDK not initialized")
      console.log(
        "Available env vars:",
        Object.keys(process.env).filter((key) => key.includes("GEMINI")),
      )
      return res.status(500).json({ message: "AI service not configured" })
    }

    const prompt = `You are conducting a technical interview for a ${role} position with ${experience} years of experience. 

Generate the first technical question that is appropriate for this level. The question should be:
1. Relevant to the role
2. Appropriate for the experience level
3. Clear and specific
4. Allow for detailed technical discussion
5. Be conversational and engaging for voice interaction

Format your response as JSON with the following structure:
{
  "question": "Your question here",
  "expectedTopics": ["topic1", "topic2", "topic3"],
  "difficulty": "easy|medium|hard"
}`

    console.log("📡 Making request to Gemini AI using SDK...")
    console.log("process.env.GEMINI_API_KEY : ", process.env.GEMINI_API_KEY)
    try {
      // Use the GoogleGenerativeAI SDK instead of direct fetch
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
      console.log("🔍 Using model:", model.model)
      console.log(genAI,model);
      const result = await model.generateContent({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      })
      console.log("✅ Gemini AI request successful")
      const response = await result.response
      const responseText = response.text()
      console.log("✅ Gemini AI response received")
      console.log("📝 AI response text:", responseText.substring(0, 200) + "...")

      let questionData
      try {
        // Try to extract JSON from the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          questionData = JSON.parse(jsonMatch[0])
        } else {
          throw new Error("No JSON found")
        }
      } catch (parseError) {
        console.log("⚠️ Failed to parse JSON, using fallback")
        questionData = {
          question:
            responseText ||
            `Tell me about your experience with ${role} development and what interests you most about this field?`,
          expectedTopics: ["technical knowledge", "problem solving", "experience"],
          difficulty: "medium",
        }
      }

      console.log("✅ Question data prepared:", questionData)

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

      console.log("✅ Session created and stored")

      res.json({
        sessionId,
        question: questionData.question,
        questionNumber: 1,
        expectedTopics: questionData.expectedTopics,
        difficulty: questionData.difficulty,
      })
    } catch (aiError) {
      console.error("❌ Gemini AI SDK error:", aiError)

      // Fallback: try with gemini-pro model
      try {
        console.log("🔄 Trying fallback with gemini-pro model...")
        const fallbackModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
        const fallbackResult = await fallbackModel.generateContent(prompt)
        const fallbackResponse = await fallbackResult.response
        const fallbackText = fallbackResponse.text()

        let questionData
        try {
          const jsonMatch = fallbackText.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            questionData = JSON.parse(jsonMatch[0])
          } else {
            throw new Error("No JSON found")
          }
        } catch (parseError) {
          questionData = {
            question: `Tell me about your experience with ${role} development and what interests you most about this field?`,
            expectedTopics: ["technical knowledge", "problem solving", "experience"],
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

        res.json({
          sessionId,
          question: questionData.question,
          questionNumber: 1,
          expectedTopics: questionData.expectedTopics,
          difficulty: questionData.difficulty,
        })
      } catch (fallbackError) {
        console.error("❌ Fallback model also failed:", fallbackError)
        throw new Error("AI service unavailable")
      }
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
  try {
    const { sessionId, answer, questionNumber } = req.body

    const session = interviewSessions.get(sessionId)
    if (!session || session.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: "Session not found" })
    }

    if (!process.env.GEMINI_API_KEY || !genAI) {
      return res.status(500).json({ message: "AI service not configured" })
    }

    // Evaluate the answer
    const currentQuestion = session.questions[questionNumber - 1]
    const evaluationPrompt = `Evaluate this technical interview answer for a ${session.role} position with ${session.experience} years of experience:

Question: ${currentQuestion.question}
Answer: ${answer}
Expected Topics: ${currentQuestion.expectedTopics.join(", ")}

Provide a comprehensive evaluation in JSON format:
{
  "score": 1-10,
  "feedback": "Detailed constructive feedback on the answer (2-3 sentences)",
  "strengths": ["specific strength1", "specific strength2"],
  "improvements": ["specific improvement1", "specific improvement2"],
  "technicalAccuracy": 1-10,
  "communication": 1-10,
  "depth": 1-10
}

Be encouraging but honest in your evaluation. Focus on specific technical aspects and communication clarity.Language could be anything (Hindi,English) , be sure to respond in the same language as the answer.`

    console.log("📡 Evaluating answer with AI...")

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
      const result = await model.generateContent({
        contents: [{ parts: [{ text: evaluationPrompt }] }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      })

      const response = await result.response
      const evaluationText = response.text()

      let evaluation
      try {
        const jsonMatch = evaluationText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          evaluation = JSON.parse(jsonMatch[0])
        } else {
          throw new Error("No JSON found")
        }
      } catch (parseError) {
        console.log("⚠️ Failed to parse evaluation, using fallback")
        evaluation = {
          score: 6,
          feedback: "Good attempt. Consider providing more technical details and specific examples.",
          strengths: ["Clear communication", "Good understanding"],
          improvements: ["Add more technical depth", "Provide specific examples"],
          technicalAccuracy: 6,
          communication: 7,
          depth: 5,
        }
      }

      // Store answer and evaluation
      session.answers.push({
        questionNumber,
        answer,
        evaluation,
        timestamp: new Date(),
      })
      session.scores.push(evaluation.score)

      let nextQuestion = null
      const isComplete = questionNumber >= 10

      if (!isComplete) {
        // Generate next question based on previous performance
        const avgScore = session.scores.reduce((sum, score) => sum + score, 0) / session.scores.length
        const nextDifficulty = avgScore >= 7 ? "hard" : avgScore >= 5 ? "medium" : "easy"

        const nextPrompt = `Generate the next technical interview question (${questionNumber + 1} of 10) for a ${session.role} position with ${session.experience} years of experience.

Previous performance: ${avgScore.toFixed(1)}/10
Next difficulty: ${nextDifficulty}
Previous topics covered: ${session.questions.flatMap((q) => q.expectedTopics).join(", ")}

Requirements:
1. Make this question ${nextDifficulty} difficulty
2. Build upon previous topics if relevant but introduce new concepts
3. Be conversational and suitable for voice interaction
4. Focus on practical, real-world scenarios
5. Avoid repeating similar question types

Format as JSON:
{
  "question": "Your engaging question here",
  "expectedTopics": ["topic1", "topic2"],
  "difficulty": "${nextDifficulty}"
}`

        console.log("📡 Generating next question...")
        const nextResult = await model.generateContent({
          contents: [{ parts: [{ text: nextPrompt }] }],
          generationConfig: {
            temperature: 0.8,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        })

        const nextResponse = await nextResult.response
        const nextText = nextResponse.text()

        try {
          const jsonMatch = nextText.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            nextQuestion = JSON.parse(jsonMatch[0])
          } else {
            throw new Error("No JSON found")
          }
        } catch (parseError) {
          console.log("⚠️ Failed to parse next question, using fallback")
          nextQuestion = {
            question:
              nextText ||
              `What challenges have you faced in ${session.role} development and how did you overcome them?`,
            expectedTopics: ["problem solving", "experience"],
            difficulty: nextDifficulty,
          }
        }

        session.questions.push(nextQuestion)
        session.currentQuestion = questionNumber + 1
      } else {
        session.status = "completed"
        session.endTime = new Date()
      }

      interviewSessions.set(sessionId, session)

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
      console.error("❌ AI evaluation error:", aiError)
      // Use fallback evaluation
      const evaluation = {
        score: 6,
        feedback: "Good attempt. Consider providing more technical details and specific examples.",
        strengths: ["Clear communication", "Good understanding"],
        improvements: ["Add more technical depth", "Provide specific examples"],
        technicalAccuracy: 6,
        communication: 7,
        depth: 5,
      }

      session.answers.push({
        questionNumber,
        answer,
        evaluation,
        timestamp: new Date(),
      })
      session.scores.push(evaluation.score)

      const isComplete = questionNumber >= 10
      let nextQuestion = null

      if (!isComplete) {
        nextQuestion = {
          question: `What challenges have you faced in ${session.role} development and how did you overcome them?`,
          expectedTopics: ["problem solving", "experience"],
          difficulty: "medium",
        }
        session.questions.push(nextQuestion)
        session.currentQuestion = questionNumber + 1
      } else {
        session.status = "completed"
        session.endTime = new Date()
      }

      interviewSessions.set(sessionId, session)

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
  try {
    const { sessionId } = req.body

    const session = interviewSessions.get(sessionId)
    if (!session || session.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: "Session not found" })
    }

    if (session.status !== "completed") {
      return res.status(400).json({ message: "Interview not completed yet" })
    }

    if (!process.env.GEMINI_API_KEY || !genAI) {
      return res.status(500).json({ message: "AI service not configured" })
    }

    // Generate comprehensive report
    const reportPrompt = `Generate a comprehensive interview report for a ${session.role} candidate with ${session.experience} years of experience based on ${session.questions.length} questions.

Interview Data:
- Questions Asked: ${session.questions.length}
- Average Score: ${(session.scores.reduce((sum, score) => sum + score, 0) / session.scores.length).toFixed(1)}/10
- Individual Scores: ${session.scores.join(", ")}
- Video On Time: ${session.videoOnTime} seconds
- Total Time: ${session.totalTime} seconds
- Video Percentage: ${((session.videoOnTime / session.totalTime) * 100).toFixed(1)}%

Detailed Answers and Evaluations:
${session.answers
  .map(
    (answer, index) => `
Question ${answer.questionNumber}: ${session.questions[index].question}
Answer: ${answer.answer}
Score: ${answer.evaluation.score}/10
Feedback: ${answer.evaluation.feedback}
Strengths: ${answer.evaluation.strengths.join(", ")}
Areas for Improvement: ${answer.evaluation.improvements.join(", ")}
`,
  )
  .join("\n")}

Generate a professional report in JSON format:
{
  "overallScore": 1-100,
  "recommendation": "hire|consider|reject",
  "summary": "Brief overall summary (2-3 sentences)",
  "technicalSkills": {
    "score": 1-10,
    "feedback": "Technical skills assessment"
  },
  "communication": {
    "score": 1-10,
    "feedback": "Communication skills assessment"
  },
  "problemSolving": {
    "score": 1-10,
    "feedback": "Problem solving assessment"
  },
  "videoPresence": {
    "score": 1-10,
    "feedback": "Video presence and professionalism assessment"
  },
  "strengths": ["strength1", "strength2", "strength3"],
  "areasForImprovement": ["area1", "area2", "area3"],
  "detailedFeedback": "Comprehensive feedback paragraph with specific recommendations"
}

Base the recommendation on:
- hire: 80+ overall score
- consider: 60-79 overall score  
- reject: <60 overall score`

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
      const result = await model.generateContent({
        contents: [{ parts: [{ text: reportPrompt }] }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      })

      const response = await result.response
      const reportText = response.text()

      let report
      try {
        console.log("🤖 Parsing AI response for report...")
        const jsonMatch = reportText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          report = JSON.parse(jsonMatch[0])
        } else {
          throw new Error("No JSON found")
        }
      } catch (parseError) {
        console.log("⚠️ AI response parsing failed, using fallback report")
        const avgScore = session.scores.reduce((sum, score) => sum + score, 0) / session.scores.length
        report = {
          overallScore: Math.round(avgScore * 10),
          recommendation: avgScore >= 8 ? "hire" : avgScore >= 6 ? "consider" : "reject",
          summary:
            "Candidate demonstrated solid technical understanding with good communication skills. Performance was consistent across different question types.",
          technicalSkills: { score: Math.round(avgScore), feedback: "Good technical foundation with room for growth" },
          communication: { score: Math.round(avgScore + 1), feedback: "Clear and articulate communication style" },
          problemSolving: {
            score: Math.round(avgScore - 0.5),
            feedback: "Adequate problem-solving approach with logical thinking",
          },
          videoPresence: {
            score: session.videoOnTime > session.totalTime * 0.7 ? 8 : 6,
            feedback: "Professional video presence and engagement",
          },
          strengths: ["Technical knowledge", "Communication clarity", "Professional demeanor"],
          areasForImprovement: ["Technical depth", "Problem-solving speed", "Confidence building"],
          detailedFeedback:
            "Overall solid performance with potential for growth. Recommend focusing on deeper technical concepts and practical experience.",
        }
      }

      // Store report in session
      session.finalReport = report
      session.reportGeneratedAt = new Date()
      interviewSessions.set(sessionId, session)

      console.log("✅ Final report generated successfully")
      res.json(report)
    } catch (aiError) {
      console.error("❌ AI report generation error:", aiError)
      // Use fallback report
      const avgScore = session.scores.reduce((sum, score) => sum + score, 0) / session.scores.length
      const report = {
        overallScore: Math.round(avgScore * 10),
        recommendation: avgScore >= 8 ? "hire" : avgScore >= 6 ? "consider" : "reject",
        summary:
          "Candidate demonstrated solid technical understanding with good communication skills. Performance was consistent across different question types.",
        technicalSkills: { score: Math.round(avgScore), feedback: "Good technical foundation with room for growth" },
        communication: { score: Math.round(avgScore + 1), feedback: "Clear and articulate communication style" },
        problemSolving: {
          score: Math.round(avgScore - 0.5),
          feedback: "Adequate problem-solving approach with logical thinking",
        },
        videoPresence: {
          score: session.videoOnTime > session.totalTime * 0.7 ? 8 : 6,
          feedback: "Professional video presence and engagement",
        },
        strengths: ["Technical knowledge", "Communication clarity", "Professional demeanor"],
        areasForImprovement: ["Technical depth", "Problem-solving speed", "Confidence building"],
        detailedFeedback:
          "Overall solid performance with potential for growth. Recommend focusing on deeper technical concepts and practical experience.",
      }

      session.finalReport = report
      session.reportGeneratedAt = new Date()
      interviewSessions.set(sessionId, session)

      res.json(report)
    }
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

export default router
