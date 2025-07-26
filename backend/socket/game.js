import Game from "../models/Game.js"
import User from "../models/User.js"
import jwt from 'jsonwebtoken'
import { makeJudge0Request } from "../services/judge0Service.js"

export const setupGameSocket = (io) => {
  console.log("🎮 Setting up game socket handlers...")

  // Store active connections to prevent duplicates for a given userId
  const activeConnections = new Map()

  // Middleware to authenticate socket connections
  // import jwt from 'jsonwebtoken' // Add this import

// Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const { token, userId } = socket.handshake.auth
      console.log("🔐 Socket auth attempt:", { userId, hasToken: !!token })

      if (!token || !userId) {
        console.log("❌ Missing auth credentials")
        return next(new Error("Authentication required"))
      }

      // ✅ CRITICAL FIX: Verify the JWT token and get user data
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        console.log("🔑 Token decoded successfully:", { userId: decoded.userId, username: decoded.username })
        
        // Fetch user data from database
        const user = await User.findById(userId).select('username ratings')
        if (!user) {
          console.log("❌ User not found in database:", userId)
          return next(new Error("User not found"))
        }
        
        // Store user data on socket
        socket.userId = userId
        socket.user = user
        console.log("👤 User data attached to socket:", { username: user.username, rating: user.ratings?.gameRating })
      } catch (jwtError) {
        console.error("❌ JWT verification failed:", jwtError)
        return next(new Error("Invalid token"))
      }

    // Check for existing connection for this user and handle gracefully
    if (activeConnections.has(userId)) {
      const existingSocket = activeConnections.get(userId)
      if (existingSocket && existingSocket.id !== socket.id) {
        console.log("⚠️ Duplicate connection detected, gracefully replacing:", userId, existingSocket.id)
        // Don't forcefully disconnect, just replace the reference
        existingSocket.removeAllListeners()
      }
    }

      activeConnections.set(userId, socket)
      console.log("✅ Socket authenticated for user:", userId, "Socket ID:", socket.id)
      next()
    } catch (error) {
      console.error("❌ Socket auth error:", error)
      next(new Error("Authentication failed"))
    }
  })

  io.on("connection", (socket) => {
    console.log("🔌 User connected to game socket:", socket.id, "User:", socket.userId)

    // Handle connection cleanup and game abandonment
    // Handle connection cleanup and game abandonment - ✅ FIXED
socket.on("disconnect", async (reason) => {
  console.log("🔌 User disconnected:", socket.id, "Reason:", reason, "User:", socket.userId)
  
  if (!socket.userId) {
    console.log("❌ No userId on disconnect, skipping cleanup")
    return
  }
  
  // ✅ CRITICAL FIX: Always handle disconnects properly
  const isClientLeaving = reason === "client namespace disconnect"
  const isTransportError = reason === "transport close" || reason === "transport error"
  const isPingTimeout = reason === "ping timeout"
  
  // Immediate cleanup for intentional leaves, delayed for network issues
  const graceTime = (isTransportError || isPingTimeout) ? 5000 : 0
  
  const handleDisconnectCleanup = async () => {
    // Check if user has reconnected with a new socket during grace period
    const currentSocket = activeConnections.get(socket.userId)
    if (currentSocket && currentSocket.id !== socket.id) {
      console.log("✅ User reconnected with new socket, ignoring old disconnect")
      return
    }
    
    console.log(`🧹 Processing disconnect cleanup for user ${socket.userId}`)
    
    // Remove from active connections
    if (activeConnections.get(socket.userId) === socket) {
      activeConnections.delete(socket.userId)
      console.log(`🗑️ Removed ${socket.userId} from active connections`)
    }

    // Find any game this user was part of
    const game = await Game.findOne({
      "players.user": socket.userId,
      status: { $in: ["waiting", "ongoing"] },
    }).populate("players.user", "username ratings")

    if (!game) {
      console.log("ℹ️ No active game found for disconnected user")
      return
    }

    console.log(`🎮 Found game ${game._id} with status: ${game.status}`)

    if (game.status === "ongoing") {
      const leavingPlayer = game.players.find((p) => p.user._id.toString() === socket.userId)
      const opponentPlayer = game.players.find((p) => p.user._id.toString() !== socket.userId)

      if (opponentPlayer) {
        console.log(`🏆 Setting winner to opponent: ${opponentPlayer.user.username}`)
        
        game.winner = opponentPlayer.user._id
        game.status = "finished"
        game.endTime = new Date()
        game.result = "opponent_left"

        // ✅ CRITICAL FIX: Update ELO ratings and save BEFORE deleting
        await updateELORatings(game)
        await game.save()
        console.log(`💾 Game ${game._id} saved with final state`)

        // ✅ CRITICAL FIX: Get final game state with ratings AFTER saving
        const finalGame = await Game.findById(game._id)
          .populate("players.user", "username ratings")
          .populate("problem")

        // Notify opponent through ALL possible channels
        const opponentSocket = activeConnections.get(opponentPlayer.user._id.toString())
        const gameEndData = {
          winner: game.winner,
          winnerId: game.winner.toString(),
          result: "opponent_left",
          message: `Your opponent disconnected. You win!`,
          finalState: finalGame
        }

        console.log(`📡 Notifying opponent ${opponentPlayer.user.username} of victory`)

        // 1. Direct socket notification
        if (opponentSocket) {
          opponentSocket.emit("game-finished", gameEndData)
          console.log("✅ Direct socket notification sent")
        }

        // 2. Room-based notification (backup)
        io.to(game._id.toString()).emit("game-finished", gameEndData)
        console.log("✅ Room-based notification sent")

        // 3. User-specific room notification (extra backup)
        io.to(`user-${opponentPlayer.user._id.toString()}`).emit("game-finished", gameEndData)

        // ✅ CRITICAL FIX: Delete game AFTER all operations are complete
        await Game.deleteOne({ _id: game._id })
        console.log(`🗑️ Finished game ${game._id} deleted from database`)
      } else {
        // No opponent, just clean up
        game.status = "cancelled";
        await game.save();
        await Game.deleteOne({ _id: game._id })
        console.log(`🗑️ Game ${game._id} cancelled and deleted - no opponent`)
      }
    } else if (game.status === "waiting") {
      console.log(`🗑️ Removing player from waiting game ${game._id}`)
      
      game.players = game.players.filter((p) => p.user._id.toString() !== socket.userId)
      
      if (game.players.length === 0) {
        await Game.deleteOne({ _id: game._id })
        console.log(`🗑️ Waiting game ${game._id} deleted - no players left`)
      } else {
        await game.save()
        
        // Notify remaining players of updated game state
        const updatedGame = await Game.findById(game._id)
          .populate("players.user", "username ratings")
          .populate("problem")
        
        io.to(game._id.toString()).emit("game-state", updatedGame)
        console.log(`📡 Updated game state sent to remaining players`)
      }
    }
  }
  
  if (graceTime > 0) {
    console.log(`⏰ Setting ${graceTime}ms grace period for disconnect cleanup`)
    setTimeout(handleDisconnectCleanup, graceTime)
  } else {
    await handleDisconnectCleanup()
  }
})

    // Join game room - ✅ ENHANCED with user rooms
socket.on("join-game", async (gameId) => {
  try {
    console.log(`🎮 User ${socket.userId} joining game: ${gameId}`)

    // Join user-specific room for direct notifications
    socket.join(`user-${socket.userId}`)

    const game = await Game.findById(gameId)
      .populate("players.user", "username ratings")
      .populate("problem")

    if (!game) {
      console.log("❌ Game not found:", gameId)
      socket.emit("error", { message: "Game not found" })
      return
    }

    // Join the Socket.IO room
    socket.join(gameId)
    console.log(`✅ User ${socket.userId} joined Socket.IO room: ${gameId}`)

    // Check if user is already in the game
    const isPlayerInGame = game.players.some((p) => p.user._id.toString() === socket.userId)
    
    if (!isPlayerInGame && game.players.length < 2 && game.status === "waiting") {
      // Add player to the game
      game.players.push({
        user: socket.userId,
        ratingBefore: socket.user.ratings?.gameRating || 1200,
        testCasesPassed: 0,
        totalTestCases: 0,
      })

      console.log(`👥 Added user ${socket.userId} to game. Players: ${game.players.length}/2`)

      // Start game if 2 players now
      if (game.players.length === 2) {
        console.log("🚀 Game starting with 2 players!")
        game.status = "ongoing",
        game.players.forEach((p) => {
          p.status = 'ongoing'
        })
        game.startTime = new Date()
      }

      await game.save()
      await game.populate("players.user", "username ratings")
      await game.populate("problem")
    }

    // Send initial game state to the joining user
    const gameResponse = {
      ...game.toObject(),
      problem: {
        ...game.problem.toObject(),
        testCases: game.problem.testCases.filter((tc) => tc.isPublic),
      },
    }
    
    socket.emit("game-state", gameResponse)

    // Notify ALL players in the room about the updated game state
    console.log(`📡 Broadcasting updated game state to room ${gameId}`)
    io.to(gameId).emit("player-joined", {
      playerId: socket.userId,
      playerCount: game.players.length,
      game: gameResponse
    })

    // If game just started (2 players), emit game-started event
    if (game.status === "ongoing" && game.players.length === 2 && game.startTime) {
      console.log(`🚀 Emitting game-started event to room ${gameId}`)
      io.to(gameId).emit("game-started", {
        game: gameResponse,
        timeLimit: game.timeLimit
      })
    }

  } catch (error) {
    console.error("❌ Error in join-game:", error)
    socket.emit("error", { message: "Failed to join game" })
  }
})

    // Handle leave game requests
    // Handle leave game requests
socket.on("leave-game", async (gameId) => {
  try {
    console.log("🚪 User leaving game:", gameId, "User:", socket.userId)

    const game = await Game.findById(gameId)
    if (!game) {
      console.log("❌ Game not found for leave-game event:", gameId)
      return
    }

    socket.leave(gameId)
    console.log(`🚪 User ${socket.userId} left Socket.IO room: ${gameId}`)

    const playerIndex = game.players.findIndex((p) => p.user.toString() === socket.userId)
    if (playerIndex === -1) {
      console.log("❌ Player not found in game:", socket.userId, gameId)
      return
    }

    if (game.status === "ongoing") {
      console.log(`⚠️ User ${socket.userId} left ongoing game ${game._id}`)
      const opponentPlayer = game.players.find((p) => p.user.toString() !== socket.userId)

      if (opponentPlayer) {
        game.winner = opponentPlayer.user
        game.status = "finished"
        game.endTime = new Date()
        game.result = "opponent_left"
        console.log(`🏆 Game ${game._id} ended: ${socket.userId} left, ${opponentPlayer.user} wins`)

        // ✅ CRITICAL FIX: Update ELO and save BEFORE any notifications or deletions
        await updateELORatings(game)
        await game.save()

        // ✅ CRITICAL FIX: Get fresh copy with updated ratings
        const finalGameState = await Game.findById(game._id)
          .populate("players.user", "username ratings")
          .populate("problem")

        // ✅ CRITICAL FIX: Emit to ALL connections for both users to ensure cleanup
        const leavingUserConnections = [...activeConnections.entries()].filter(([userId, sock]) => userId === socket.userId)
        const opponentConnections = [...activeConnections.entries()].filter(([userId, sock]) => userId === opponentPlayer.user.toString())
        
        console.log(`📡 Notifying ${leavingUserConnections.length} connections for leaving user`)
        console.log(`📡 Notifying ${opponentConnections.length} connections for opponent`)

        const gameEndData = {
          winner: game.winner,
          winnerId: game.winner.toString(),
          result: "opponent_left",
          finalState: finalGameState
        }

        // Send game-finished to both players across ALL their connections
        leavingUserConnections.forEach(([userId, userSocket]) => {
          userSocket.emit("game-finished", {
            ...gameEndData,
            message: `You left the game. Your opponent wins!`
          })
        })

        opponentConnections.forEach(([userId, userSocket]) => {
          userSocket.emit("game-finished", {
            ...gameEndData,
            message: `Your opponent left the game. You win!`
          })
        })

        // Also emit to the room in case we missed any connections
        io.to(game._id.toString()).emit("game-finished", {
          ...gameEndData,
          message: `Game ended - opponent left`
        })

        // ✅ CRITICAL FIX: Delete the game AFTER all operations
        await Game.deleteOne({ _id: game._id })
        console.log(`🗑️ Finished game ${game._id} deleted from database`)

        console.log(`📡 Game finished event sent to both players due to player leaving`)
      } else {
        game.status = "finished"
        game.result = "abandoned"
        await game.save()
        await Game.deleteOne({ _id: game._id })
        console.log(`🗑️ Game ${game._id} abandoned and deleted as the last player left`)
      }
    } else if (game.status === "waiting") {
      console.log(`🗑️ User ${socket.userId} left waiting game ${game._id}`)
      game.players = game.players.filter((p) => p.user.toString() !== socket.userId)
      
      if (game.players.length === 0) {
        await Game.deleteOne({ _id: game._id })
        console.log(`🗑️ Waiting game ${game._id} deleted as all players left`)
      } else {
        await game.save()
        console.log(`💾 Waiting game ${game._id} updated after player left. Remaining players: ${game.players.length}`)
        
        const updatedGame = await Game.findById(game._id)
          .populate("players.user", "username ratings")
          .populate("problem")
        io.to(game._id.toString()).emit("game-state", updatedGame)
      }
    }

    // ✅ CRITICAL FIX: Remove from active connections to prevent zombie connections
    if (activeConnections.get(socket.userId) === socket) {
      activeConnections.delete(socket.userId)
      console.log(`🗑️ Removed ${socket.userId} from active connections`)
    }

  } catch (error) {
    console.error("❌ Error in leave-game:", error)
    socket.emit("error", { message: "Failed to leave game" })
  }
})
    // Handle code submission
    socket.on("submit-code", async (data) => {
      console.log("📝 Code submission received from user:", socket.userId)

      try {
        const { gameId, code, language } = data

        if (!gameId || !code || !language) {
          console.log("❌ Missing submission data:", { gameId: !!gameId, code: !!code, language: !!language })
          socket.emit("submission-error", { message: "Missing required data for submission" })
          return
        }

        console.log("📝 Processing submission for game:", gameId, "Language:", language)
        const game = await Game.findById(gameId).populate("problem")

        if (!game) {
          console.log("❌ Game not found for submission")
          socket.emit("submission-error", { message: "Game not found" })
          return
        }
        if (game.status !== "ongoing") {
          console.log("❌ Game not active, status:", game.status)
          socket.emit("submission-error", { message: "Game is not active" })
          return
        }

        const playerIndex = game.players.findIndex((p) => p.user.toString() === socket.userId)
        if (playerIndex === -1) {
          console.log("❌ Player not found in game")
          socket.emit("submission-error", { message: "Player not found in game" })
          return
        }

        console.log("🧪 Executing code against test cases...")
        const testResults = await executeCodeForGame(code, language, game.problem.testCases)
        console.log("📊 Test execution completed:", testResults.length, "results")
        const passedTests = testResults.filter((r) => r.passed).length
        const totalTests = testResults.length

        console.log("📊 Test results:", passedTests, "/", totalTests, "passed")
        
        game.players[playerIndex].code = code
        game.players[playerIndex].language = language
        game.players[playerIndex].testCasesPassed = passedTests
        game.players[playerIndex].totalTestCases = totalTests
        game.players[playerIndex].submissionTime = new Date()

        if (passedTests === totalTests) {
          console.log("🏆 Player solved the problem! Winner:", socket.userId)

          game.winner = game.players[playerIndex].user
          game.status = "finished"
          game.endTime = new Date()
          game.result = "win"
          
          await updateELORatings(game)
          await game.save()

          const finalGame = await Game.findById(game._id).populate("players.user", "username ratings").populate("problem");

          console.log("💾 Game completed and saved with winner")

          io.to(gameId).emit("game-finished", {
            winner: game.winner,
            winnerId: game.winner ? game.winner.toString() : null,
            result: game.result,
            message: "Game ended - Problem solved!",
            finalState: finalGame
          })
          console.log("📡 Game finished event sent to all players")
        } else {
          console.log("📈 Updating player progress...")
          await game.save()

          io.to(gameId).emit("player-progress", {
            playerId: socket.userId,
            testCasesPassed: passedTests,
            totalTestCases: totalTests,
            submissionTime: new Date(),
          })
          
          socket.emit("submission-result", {
            status: passedTests === totalTests ? "Accepted" : "Wrong Answer",
            passedTests,
            totalTests,
            testResults: testResults.slice(0, 3),
          })
          console.log("📡 Submission result sent to player")
        }
      } catch (error) {
        console.error("❌ Code submission error:", error)
        socket.emit("submission-error", { message: "Submission failed: " + error.message })
      }
    })

    // Handle real-time code updates
    socket.on("code-update", async (data) => {
      const { gameId, code } = data
      if (gameId && code !== undefined) {
        socket.to(gameId).emit("opponent-code-update", {
          playerId: socket.userId,
          codeLength: code.length,
        })
      }
    })

    // Handle game timeout
    socket.on("game-timeout", async (gameId) => {
      try {
        console.log("⏰ Game timeout for:", gameId)

        const game = await Game.findById(gameId)
        if (!game || game.status !== "ongoing") return

        game.status = "finished"
        game.endTime = new Date()
        game.result = "timeout"
        
        const [player1, player2] = game.players
        if (player1.testCasesPassed > player2.testCasesPassed) {
          game.winner = player1.user
        } else if (player2.testCasesPassed > player1.testCasesPassed) {
          game.winner = player2.user
        }

        // ✅ CRITICAL FIX: Update ELO and save BEFORE deleting
        await updateELORatings(game)
        await game.save()

        // Get final state for notification
        const finalGameState = await Game.findById(game._id)
          .populate("players.user", "username ratings")
          .populate("problem")

        io.to(gameId).emit("game-finished", {
          winner: game.winner,
          winnerId: game.winner ? game.winner.toString() : null,
          result: "timeout",
          message: "Game ended due to timeout",
          finalState: finalGameState
        })

        // ✅ CRITICAL FIX: Delete the game AFTER all operations
        await Game.deleteOne({ _id: game._id })
        console.log(`🗑️ Finished game ${game._id} deleted from database`)
      } catch (error) {
        console.error("❌ Game timeout error:", error)
      }
    })
  })
}

// Helper function to execute code for game
async function executeCodeForGame(code, language, testCases) {
  console.log("🔧 Executing code for game with", testCases.length, "test cases")

  const results = []

  try {
    const languageMap = {
      cpp: 54,
      java: 62,
      python: 71,
      c: 50,
    }
    const languageId = languageMap[language]
    if (!languageId) {
      console.log("❌ Unsupported language:", language)
      throw new Error("Unsupported language")
    }

    // Removed single API key usage - now using intelligent fallback system

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i]
      console.log(`🧪 Testing case ${i + 1}:`, testCase.input.substring(0, 50) + "...")

      try {
        const submissionResponse = await makeJudge0Request("https://judge0-ce.p.rapidapi.com/submissions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source_code: code,
            language_id: languageId,
            stdin: testCase.input,
            expected_output: testCase.output,
          }),
        })
        const submission = await submissionResponse.json()

        if (!submission.token) {
          console.log("❌ Failed to create submission")
          results.push({
            input: testCase.input,
            expectedOutput: testCase.output,
            actualOutput: "",
            passed: false,
            error: "Submission failed",
          })
          continue
        }

        let result
        let attempts = 0
        const maxAttempts = 15

        do {
          await new Promise((resolve) => setTimeout(resolve, 1500))

          const resultResponse = await makeJudge0Request(`https://judge0-ce.p.rapidapi.com/submissions/${submission.token}`, {
            headers: {
              "Content-Type": "application/json",
            },
          })
          result = await resultResponse.json()
          attempts++
          console.log(`⏳ Attempt ${attempts}: Status ${result.status.id} - ${result.status.description}`)
        } while (result.status.id <= 2 && attempts < maxAttempts)

        const actualOutput = result.stdout ? result.stdout.trim() : ""
        const expectedOutput = testCase.output.trim()
        const passed = actualOutput === expectedOutput && result.status.id === 3

        console.log("📊 Test result:", passed ? "PASSED" : "FAILED")
        if (!passed) {
          console.log("Expected:", expectedOutput)
          console.log("Got:", actualOutput)
        }
        results.push({
          input: testCase.input,
          expectedOutput: expectedOutput,
          actualOutput: actualOutput,
          passed: passed,
          executionTime: Number.parseFloat(result.time) * 1000 || 0,
          memory: Number.parseFloat(result.memory) || 0,
          status: result.status.description,
        })
      } catch (error) {
        console.error("❌ Error executing test case:", error)
        results.push({
          input: testCase.input,
          expectedOutput: testCase.output,
          actualOutput: "",
          passed: false,
          error: error.message,
        })
      }
    }
    const passedTests = results.filter((r) => r.passed).length
    console.log("✅ Code execution completed. Passed:", passedTests, "Total:", results.length)

    return results
  } catch (error) {
    console.error("❌ Code execution error:", error)
    throw error
  }
}

// Enhanced ELO rating calculation
async function updateELORatings(game) {
  if (game.players.length !== 2) {
    console.log("⚠️ Cannot update ratings: game does not have exactly 2 players")
    return
  }
  const [player1, player2] = game.players

  const user1 = await User.findById(player1.user)
  const user2 = await User.findById(player2.user)

  const rating1 = user1.ratings?.gameRating || 1200
  const rating2 = user2.ratings?.gameRating || 1200

  console.log("📊 Current ratings:", { user1: rating1, user2: rating2 })
  console.log("🎮 Game result type:", game.result)
  console.log("🏆 Game winner:", game.winner ? game.winner.toString() : "No winner")

  player1.ratingBefore = rating1
  player2.ratingBefore = rating2

  const K = 32

  const expectedScore1 = 1 / (1 + Math.pow(10, (rating2 - rating1) / 400))
  const expectedScore2 = 1 / (1 + Math.pow(10, (rating1 - rating2) / 400))

  let actualScore1, actualScore2

  // ✅ CRITICAL FIX: Handle opponent_left scenario properly
  if (game.result === "opponent_left") {
    console.log("🚪 Handling opponent left scenario")
    
    // Determine who left and who stayed
    const winnerId = game.winner.toString()
    const player1Id = player1.user._id ? player1.user._id.toString() : player1.user.toString()
    const player2Id = player2.user._id ? player2.user._id.toString() : player2.user.toString()
    
    console.log("🔍 Winner ID:", winnerId)
    console.log("🔍 Player1 ID:", player1Id)
    console.log("🔍 Player2 ID:", player2Id)
    
    if (winnerId === player1Id) {
      // Player 1 wins because player 2 left
      actualScore1 = 1.0  // Full win for staying player
      actualScore2 = 0.0  // Full loss for leaving player
      console.log("🏆 Player 1 wins (opponent left)")
    } else if (winnerId === player2Id) {
      // Player 2 wins because player 1 left
      actualScore1 = 0.0  // Full loss for leaving player
      actualScore2 = 1.0  // Full win for staying player
      console.log("🏆 Player 2 wins (opponent left)")
    } else {
      console.log("⚠️ Winner ID doesn't match either player, defaulting to draw")
      actualScore1 = 0.5
      actualScore2 = 0.5
    }
  } else if (game.result === "timeout" || game.result === "draw") {
    console.log("⏰ Handling timeout/draw scenario")
    if (player1.testCasesPassed > player2.testCasesPassed) {
      actualScore1 = 0.75
      actualScore2 = 0.25
      console.log("🎯 Player 1 has more test cases passed")
    } else if (player2.testCasesPassed > player1.testCasesPassed) {
      actualScore1 = 0.25
      actualScore2 = 0.75
      console.log("🎯 Player 2 has more test cases passed")
    } else {
      actualScore1 = 0.5
      actualScore2 = 0.5
      console.log("🤝 Equal test cases - draw")
    }
  } else if (game.result === "win") {
    console.log("🏆 Handling normal win scenario")
    const winnerId = game.winner.toString()
    const player1Id = player1.user._id ? player1.user._id.toString() : player1.user.toString()
    const player2Id = player2.user._id ? player2.user._id.toString() : player2.user.toString()
    
    if (winnerId === player1Id) {
      actualScore1 = 1.0
      actualScore2 = 0.0
      console.log("🏆 Player 1 wins normally")
    } else if (winnerId === player2Id) {
      actualScore1 = 0.0
      actualScore2 = 1.0
      console.log("🏆 Player 2 wins normally")
    } else {
      console.log("⚠️ Winner mismatch in normal win, defaulting to draw")
      actualScore1 = 0.5
      actualScore2 = 0.5
    }
  } else {
    console.log("🤷 Unknown game result, defaulting to draw")
    actualScore1 = 0.5
    actualScore2 = 0.5
  }

  console.log("📊 Actual scores calculated:", { 
    player1: actualScore1, 
    player2: actualScore2,
    gameResult: game.result 
  })

  const newRating1 = Math.round(rating1 + K * (actualScore1 - expectedScore1))
  const newRating2 = Math.round(rating2 + K * (actualScore2 - expectedScore2))

  player1.ratingAfter = newRating1
  player2.ratingAfter = newRating2

  console.log("📊 New ratings:", { user1: newRating1, user2: newRating2 })
  console.log("📊 Rating changes:", {
    user1: newRating1 - rating1,
    user2: newRating2 - rating2,
  })

  // ✅ IMPROVED: Better game history result determination
  let player1Result, player2Result
  
  if (game.result === "opponent_left") {
    const winnerId = game.winner.toString()
    const player1Id = player1.user._id ? player1.user._id.toString() : player1.user.toString()
    
    if (winnerId === player1Id) {
      player1Result = "win"
      player2Result = "lose"
    } else {
      player1Result = "lose"
      player2Result = "win"
    }
  } else {
    // Use actual scores to determine result for history
    if (actualScore1 > 0.5) {
      player1Result = "win"
      player2Result = "lose"
    } else if (actualScore1 < 0.5) {
      player1Result = "lose"
      player2Result = "win"
    } else {
      player1Result = "draw"
      player2Result = "draw"
    }
  }

  console.log("📚 Game history results:", { 
    player1: player1Result, 
    player2: player2Result 
  })

  await User.findByIdAndUpdate(player1.user, {
    "ratings.gameRating": newRating1,
    $push: {
      gameHistory: {
        opponent: player2.user,
        result: player1Result,
        ratingChange: newRating1 - rating1,
        problem: game.problem,
        date: new Date(),
      },
    },
  })

  await User.findByIdAndUpdate(player2.user, {
    "ratings.gameRating": newRating2,
    $push: {
      gameHistory: {
        opponent: player1.user,
        result: player2Result,
        ratingChange: newRating2 - rating2,
        problem: game.problem,
        date: new Date(),
      },
    },
  })

  console.log("💾 User ratings and game history updated in database")
}