import express from "express"
import Game from "../models/Game.js"
import Problem from "../models/Problem.js"
import { authenticateToken } from "../middleware/auth.js"
import { v4 as uuidv4 } from "uuid"

const router = express.Router()

router.post("/random", authenticateToken, async (req, res) => {
  console.log("🎮 Random game request started")
  console.log("📊 Request body:", req.body)
  console.log("👤 User from token:", req.user ? req.user.username : "UNDEFINED")
  console.log("🆔 User ID:", req.user ? req.user._id : "UNDEFINED")

  try {
    if (!req.user) {
      console.log("❌ User not authenticated")
      return res.status(401).json({ error: "Unauthorized" })
    }

    // First, check if user is already in any waiting/ongoing game
    const existingUserGame = await Game.findOne({
      "players.user": req.user._id,
      status: { $in: ["waiting", "ongoing"] }
    }).populate("players.user", "username ratings").populate("problem", "title difficulty description examples constraints testCases")
    
    if (existingUserGame) {
      console.log("⚠️ User already in a game:", existingUserGame._id, "Status:", existingUserGame.status)
      return res.json({
        ...existingUserGame.toObject(),
        problem: {
          ...existingUserGame.problem.toObject(),
          testCases: existingUserGame.problem.testCases.filter((tc) => tc.isPublic),
        },
      })
    }

    console.log("🔍 Looking for existing waiting game...")
    // Look for existing waiting game that user is NOT already in
    let game = await Game.findOne({
      gameMode: "random",
      status: "waiting",
      "players.1": { $exists: false },
      "players.user": { $ne: req.user._id },
    }).populate("players.user", "username ratings")
    console.log("🎯 Found existing game:", game ? game._id : "None")

    if (game) {
      console.log("✅ Found existing game, joining...")
      console.log("🔗 Current players count:", game.players.length)

      // Check if user is already in this game
      const isAlreadyInGame = game.players.some((p) => p.user._id.toString() === req.user._id.toString())
      if (isAlreadyInGame) {
        console.log("⚠️ User already in this game")
        return res.status(400).json({ message: "You are already in this game" })
      }
      
      // Join existing game
      game.players.push({
        user: req.user._id,
        ratingBefore: req.user.ratings?.gameRating || 1200,
        testCasesPassed: 0,
        totalTestCases: 0,
      })

      // ✅ CRITICAL FIX: Start the game when 2 players join
      if (game.players.length === 2) {
        console.log("🚀 Two players joined, starting game...")
        game.status = "ongoing"
        game.startTime = new Date()
        console.log("⏰ Game start time set to:", game.startTime)
      }

      console.log("💾 Saving updated game with 2 players...")
      await game.save()
      
      // Populate the problem data for the joined game
      await game.populate("problem", "title difficulty description examples constraints testCases")
      await game.populate("players.user", "username ratings")
      
      console.log("✅ Game joined successfully with 2 players")
      console.log("🎯 Final game status:", game.status)

      // Emit socket events if game has started
      if (game.players.length === 2 && game.status === "ongoing") {
        const io = req.app.get('io'); // Get io instance from app
        
        if (io) {
          console.log("📡 Emitting socket events for game start from API route");
          
          const gameResponse = {
            ...game.toObject(),
            problem: {
              ...game.problem.toObject(),
              testCases: game.problem.testCases.filter((tc) => tc.isPublic),
            },
          };
          
          // Notify all players about the game state change
          io.to(game._id.toString()).emit("player-joined", {
            playerId: req.user._id.toString(),
            playerCount: game.players.length,
            game: gameResponse
          });
          
          // Emit game-started event
          io.to(game._id.toString()).emit("game-started", {
            game: gameResponse,
            timeLimit: game.timeLimit
          });
          
          console.log("📡 Socket events emitted from API route");
        } else {
          console.log("❌ IO instance not available in route");
        }
      }
    } else {
      console.log("🆕 Creating new game...")

      // Get random problem from any difficulty for random matches
      console.log("🔍 Fetching random problem from all difficulties...")
      const difficulties = ['Easy', 'Medium', 'Hard']
      const randomDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)]
      console.log("🎲 Selected random difficulty:", randomDifficulty)
      
      const problems = await Problem.find({ difficulty: randomDifficulty, isPublished: true })
      console.log("📚 Found problems for", randomDifficulty, ":", problems.length)

      if (problems.length === 0) {
        console.log("❌ No problems found for", randomDifficulty, ", trying all difficulties...")
        // Fallback: get problems from any difficulty if the selected one has no problems
        const allProblems = await Problem.find({ isPublished: true })
        if (allProblems.length === 0) {
          console.log("❌ No problems found at all")
          return res.status(500).json({ message: "No problems available" })
        }
        const randomProblem = allProblems[Math.floor(Math.random() * allProblems.length)]
        console.log("🎲 Fallback: Selected problem:", randomProblem.title, "Difficulty:", randomProblem.difficulty)
        
        // Set time limit based on selected problem's difficulty
        const timeLimits = { Easy: 30, Medium: 45, Hard: 60 }
        const timeLimit = timeLimits[randomProblem.difficulty] || 45
        
        game = new Game({
          roomId: uuidv4(),
          gameMode: "random",
          problem: randomProblem._id,
          timeLimit,
          players: [
            {
              user: req.user._id,
              ratingBefore: req.user.ratings?.gameRating || 1200,
              testCasesPassed: 0,
              totalTestCases: 0,
            },
          ],
          status: "waiting",
        })
      } else {
        const randomProblem = problems[Math.floor(Math.random() * problems.length)]
        console.log("🎲 Selected problem:", randomProblem.title, "Difficulty:", randomDifficulty)
        
        // Set time limit based on difficulty
        const timeLimits = { Easy: 30, Medium: 45, Hard: 60 }
        const timeLimit = timeLimits[randomDifficulty] || 45
        
        game = new Game({
          roomId: uuidv4(),
          gameMode: "random",
          problem: randomProblem._id,
          timeLimit,
          players: [
            {
              user: req.user._id,
              ratingBefore: req.user.ratings?.gameRating || 1200,
              testCasesPassed: 0,
              totalTestCases: 0,
            },
          ],
          status: "waiting",
        })
      }

      console.log("🆕 Created new game with ID:", game.roomId)
      console.log("💾 Saving game to database...")
      await game.save()

      console.log("🔄 Populating game data...")
      await game.populate("players.user", "username ratings")
      await game.populate("problem", "title difficulty description examples constraints testCases")
    }

    console.log("✅ Game ready, players:", game.players.length)
    console.log("🎯 Game status:", game.status)

    // Filter test cases to only show public ones
    const gameResponse = {
      ...game.toObject(),
      problem: {
        ...game.problem.toObject(),
        testCases: game.problem.testCases.filter((tc) => tc.isPublic),
      },
    }
    
    console.log("📤 Sending response with status:", gameResponse.status)
    res.json(gameResponse)

    // Emit socket events if game has started
    if (game.players.length === 2 && game.status === "ongoing") {
      const io = req.app.get('io'); // Get io instance from app
      
      if (io) {
        console.log("📡 Emitting socket events for game start from API route");
        
        const gameResponse = {
          ...game.toObject(),
          problem: {
            ...game.problem.toObject(),
            testCases: game.problem.testCases.filter((tc) => tc.isPublic),
          },
        };
        
        // Notify all players about the game state change
        io.to(game._id.toString()).emit("player-joined", {
          playerId: req.user._id.toString(),
          playerCount: game.players.length,
          game: gameResponse
        });
        
        // Emit game-started event
        io.to(game._id.toString()).emit("game-started", {
          game: gameResponse,
          timeLimit: game.timeLimit
        });
        
        console.log("📡 Socket events emitted from API route");
      } else {
        console.log("❌ IO instance not available in route");
      }
    }
  } catch (error) {
    console.error("❌ Random game error:", error)
    console.error("📊 Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    })
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Create room game with proper initialization
router.post("/room", authenticateToken, async (req, res) => {
  console.log("🏠 Create room request")
  console.log("📊 Request body:", req.body)
  console.log("👤 User:", req.user ? req.user.username : "UNDEFINED")

  try {
    if (!req.user) {
      console.log("❌ User not authenticated")
      return res.status(401).json({ error: "Unauthorized" })
    }

    const { difficulty = "Medium" } = req.body

    // Check if user is already in any waiting/ongoing game
    const existingUserGame = await Game.findOne({
      "players.user": req.user._id,
      status: { $in: ["waiting", "ongoing"] }
    })
    
    if (existingUserGame) {
      console.log("⚠️ User already in a game:", existingUserGame._id)
      return res.status(400).json({ message: "You are already in a game" })
    }

    // Get problem based on difficulty
    console.log("🔍 Fetching problem for difficulty:", difficulty)
    const problems = await Problem.find({ difficulty, isPublished: true })
    
    if (problems.length === 0) {
      console.log("❌ No problems found for difficulty:", difficulty)
      return res.status(500).json({ message: "No problems available for this difficulty" })
    }

    const randomProblem = problems[Math.floor(Math.random() * problems.length)]
    console.log("🎲 Selected problem:", randomProblem.title)

    // Set time limit based on difficulty
    const timeLimits = { Easy: 30, Medium: 45, Hard: 60 }
    const timeLimit = timeLimits[difficulty] || 45

    const game = new Game({
      roomId: uuidv4().substring(0, 8).toUpperCase(),
      gameMode: "room",
      problem: randomProblem._id,
      timeLimit,
      players: [{
        user: req.user._id,
        ratingBefore: req.user.ratings?.gameRating || 1200,
        testCasesPassed: 0,
        totalTestCases: 0,
      }],
      status: "waiting"
    })

    await game.save()
    await game.populate("players.user", "username ratings")
    await game.populate("problem", "title difficulty description examples constraints testCases")

    console.log("✅ Room created successfully:", game.roomId)

    const gameResponse = {
      ...game.toObject(),
      problem: {
        ...game.problem.toObject(),
        testCases: game.problem.testCases.filter((tc) => tc.isPublic),
      },
    }
    
    res.json(gameResponse)
  } catch (error) {
    console.error("❌ Room creation error:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Join room game with better validation - ✅ FIXED: Remove duplicate and add missing logic
router.post("/room/:roomId/join", authenticateToken, async (req, res) => {
  console.log("🚪 Room join request")
  console.log("📊 Room ID:", req.params.roomId)
  console.log("👤 User:", req.user ? req.user.username : "UNDEFINED")

  try {
    if (!req.user) {
      console.log("❌ User not authenticated")
      return res.status(401).json({ error: "Unauthorized" })
    }

    // Check if user is already in any waiting/ongoing game
    const existingUserGame = await Game.findOne({
      "players.user": req.user._id,
      status: { $in: ["waiting", "ongoing"] }
    })
    
    if (existingUserGame) {
      console.log("⚠️ User already in a game:", existingUserGame._id)
      return res.status(400).json({ message: "You are already in a game" })
    }

    const game = await Game.findOne({ roomId: req.params.roomId })
    console.log("🔍 Found game:", game ? game._id : "Not found")
    
    if (!game) {
      return res.status(404).json({ message: "Room not found" })
    }
    if (game.players.length >= 2) {
      return res.status(400).json({ message: "Room is full" })
    }
    if (game.status !== "waiting") {
      return res.status(400).json({ message: "Game already started" })
    }

    // Check if user is already in this game
    const isAlreadyInGame = game.players.some((p) => p.user.toString() === req.user._id.toString())
    if (isAlreadyInGame) {
      return res.status(400).json({ message: "You are already in this game" })
    }
    
    game.players.push({
      user: req.user._id,
      ratingBefore: req.user.ratings?.gameRating || 1200,
      testCasesPassed: 0,
      totalTestCases: 0,
    })

    // ✅ CRITICAL FIX: Start the game when 2 players join
    if (game.players.length === 2) {
      console.log("🚀 Two players joined room, starting game...")
      game.status = "ongoing"
      game.startTime = new Date()
      console.log("⏰ Room game start time set to:", game.startTime)
    }

    console.log("💾 Saving joined game...")
    await game.save()
    await game.populate("players.user", "username ratings")
    await game.populate("problem", "title difficulty description examples constraints testCases")
    
    console.log("✅ User joined room successfully")
    console.log("🎯 Final room game status:", game.status)
    
    // Filter test cases to only show public ones
    const gameResponse = {
      ...game.toObject(),
      problem: {
        ...game.problem.toObject(),
        testCases: game.problem.testCases.filter((tc) => tc.isPublic),
      },
    }
    
    res.json(gameResponse)

    // ✅ CRITICAL FIX: Emit socket events if game has started
    if (game.players.length === 2 && game.status === "ongoing") {
      const io = req.app.get('io'); // Get io instance from app
      
      if (io) {
        console.log("📡 Emitting socket events for game start from API route");
        
        const gameResponseWithFilteredProblem = {
          ...game.toObject(),
          problem: {
            ...game.problem.toObject(),
            testCases: game.problem.testCases.filter((tc) => tc.isPublic),
          },
        };

        // Notify all players about the game state change
        io.to(game._id.toString()).emit("player-joined", {
          playerId: req.user._id.toString(),
          playerCount: game.players.length,
          game: gameResponseWithFilteredProblem
        });
        
        // Emit game-started event
        io.to(game._id.toString()).emit("game-started", {
          game: gameResponseWithFilteredProblem,
          timeLimit: game.timeLimit
        });
        
        console.log("📡 Socket events emitted from API route");
      } else {
        console.log("❌ IO instance not available in route");
      }
    }
  } catch (error) {
    console.error("❌ Room join error:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// ✅ NEW ROUTE: Direct game access with gameId
router.get("/play/:gameId", authenticateToken, async (req, res) => {
  console.log("🎮 Direct game access request")
  console.log("🆔 Game ID:", req.params.gameId)
  console.log("👤 User:", req.user ? req.user.username : "UNDEFINED")

  try {
    if (!req.user) {
      console.log("❌ User not authenticated")
      return res.status(401).json({ error: "Unauthorized" })
    }

    const game = await Game.findById(req.params.gameId)
      .populate("players.user", "username ratings")
      .populate("problem", "title difficulty description examples constraints testCases")
    
    if (!game) {
      console.log("❌ Game not found:", req.params.gameId)
      return res.status(404).json({ message: "Game not found" })
    }

    // Check if user is part of this game
    const isPlayerInGame = game.players.some((p) => p.user._id.toString() === req.user._id.toString())
    if (!isPlayerInGame) {
      console.log("❌ User not part of this game")
      return res.status(403).json({ message: "You are not part of this game" })
    }

    console.log("✅ Direct game access granted:", {
      gameId: game._id,
      status: game.status,
      playersCount: game.players.length
    })

    // Filter test cases to only show public ones
    const gameResponse = {
      ...game.toObject(),
      problem: {
        ...game.problem.toObject(),
        testCases: game.problem.testCases.filter((tc) => tc.isPublic),
      },
    }
    
    res.json(gameResponse)
  } catch (error) {
    console.error("❌ Direct game access error:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Get game status
router.get("/:gameId", authenticateToken, async (req, res) => {
  console.log("📊 Get game status request")
  console.log("🆔 Game ID:", req.params.gameId)
  console.log("👤 User:", req.user ? req.user.username : "UNDEFINED")

  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" })
    }
    
    const game = await Game.findById(req.params.gameId)
      .populate("players.user", "username ratings")
      .populate("problem")
    console.log("🔍 Game found:", game ? "Yes" : "No")
    
    if (!game) {
      return res.status(404).json({ message: "Game not found" })
    }
    
    console.log("✅ Returning game status")
    
    // Filter test cases to only show public ones
    const gameResponse = {
      ...game.toObject(),
      problem: {
        ...game.problem.toObject(),
        testCases: game.problem.testCases.filter((tc) => tc.isPublic),
      },
    }
    
    res.json(gameResponse)
  } catch (error) {
    console.error("❌ Get game status error:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})



export default router