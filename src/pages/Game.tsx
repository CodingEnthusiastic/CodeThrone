"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useAuth } from "../contexts/AuthContext"
import axios from "axios"
import {io} from "socket.io-client"
import { Gamepad2, Users, Clock, Zap, Send, CheckCircle, XCircle, Medal, Heart, LogOut } from "lucide-react"
import CodeMirrorEditor from "../components/CodeMirrorEditor"

interface GameRoom {
  _id: string
  roomId: string
  players: {
    user: {
      _id: string
      username: string
      ratings: {
        gameRating: number
      }
    }
    status: string
    score: number
    testCasesPassed: number
    totalTestCases: number
    submissionTime: string
    ratingBefore?: number
    ratingAfter?: number
  }[]
  problem: {
    _id: string
    title: string
    difficulty: string
    description: string
    examples: {
      input: string
      output: string
      explanation: string
    }[]
    constraints: string
    testCases: {
      input: string
      output: string
      isPublic: boolean
    }[]
  }
  gameMode: string
  timeLimit: number
  status: string
  startTime: string
  endTime?: string
  winner?: string
  result?: string
}

interface SubmissionResult {
  status: string
  passedTests: number
  totalTests: number
  testResults: {
    input: string
    expectedOutput: string
    actualOutput: string
    passed: boolean
  }[]
}

// Enhanced Winner/Loser Modal Component
// Enhanced Winner/Loser Modal Component with proper styling
const GameEndModal: React.FC<{
  isWinner: boolean
  winner: string | null
  currentPlayer: any
  opponentPlayer: any
  onClose: () => void
}> = ({ isWinner, winner, currentPlayer, opponentPlayer, onClose }) => {
  console.log("🏆 GameEndModal rendered:", { isWinner, winner, currentPlayer, opponentPlayer })

  // ✅ CRITICAL FIX: Enhanced close handler
  const handleClose = () => {
    console.log("🔄 Modal close handler called")
    onClose() // This calls resetGame
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4 text-center">
        {isWinner ? (
          <div>
            <Medal className="h-20 w-20 text-yellow-500 mx-auto mb-4 animate-bounce" />
            <h1 className="text-3xl font-bold text-green-600 mb-2">🎉 Victory! 🎉</h1>
            <p className="text-gray-600 mb-4">Congratulations! You solved the problem first!</p>
            <div className="bg-green-50 p-4 rounded-lg mb-4">
              <p className="text-green-800 font-semibold">
                Rating Change: {(currentPlayer?.ratingAfter || 0) - (currentPlayer?.ratingBefore || 0) > 0 ? "+" : ""}
                {(currentPlayer?.ratingAfter || 0) - (currentPlayer?.ratingBefore || 0)}
              </p>
              <p className="text-green-700 text-sm">New Rating: {currentPlayer?.ratingAfter || "N/A"}</p>
            </div>
          </div>
        ) : (
          <div>
            <Heart className="h-20 w-20 text-pink-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-red-600 mb-2">Better Luck Next Time!</h1>
            <p className="text-gray-600 mb-4">Don't give up! Every challenge makes you stronger.</p>
            <div className="bg-red-50 p-4 rounded-lg mb-4">
              <p className="text-red-800 font-semibold">
                Rating Change: {(currentPlayer?.ratingAfter || 0) - (currentPlayer?.ratingBefore || 0) > 0 ? "+" : ""}
                {(currentPlayer?.ratingAfter || 0) - (currentPlayer?.ratingBefore || 0)}
              </p>
              <p className="text-red-700 text-sm">New Rating: {currentPlayer?.ratingAfter || "N/A"}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-3 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-sm">Your Score</h3>
            <p className="text-lg font-bold text-blue-600">
              {currentPlayer?.testCasesPassed || 0}/{currentPlayer?.totalTestCases || 0}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-sm">Opponent Score</h3>
            <p className="text-lg font-bold text-purple-600">
              {opponentPlayer?.testCasesPassed || 0}/{opponentPlayer?.totalTestCases || 0}
            </p>
          </div>
        </div>

        <button
          onClick={handleClose}
          className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
        >
          Back to Home page
        </button>
      </div>
    </div>
  )
}

// Game Status Card Component
const GameStatusCard: React.FC<{
  activeGame: GameRoom | null
  searchingForMatch: boolean
  gameStarted: boolean
  socketConnected: boolean
}> = ({ activeGame, searchingForMatch, gameStarted, socketConnected }) => {
  console.log("Game tab",socketConnected, activeGame, searchingForMatch, gameStarted);
  // false , Object , false , true  => when user enters , any bug?
  if (!activeGame && !searchingForMatch) return null

  const getStatusMessage = () => {
    if (searchingForMatch) {
      return "🔍 Searching for opponent..."
    }
    
    if (!socketConnected) {
      return "🔌 Connecting to game server..."
    }
    
    if (activeGame) {
      if (activeGame.players.length === 1) {
        return "⏳ Waiting for opponent to join..."
      }
      
      if (activeGame.players.length === 2 && activeGame.status === "waiting") {
        return "🚀 Match found! Starting game..."
      }
      
      // ✅ FIXED: Check for ongoing status OR gameStarted
      if ((activeGame.status === "ongoing" || gameStarted) && activeGame.players.length === 2) {
        return "✅ Game in progress - coding enabled"
      }
      
      if (activeGame.status === "ongoing" && !activeGame.startTime) {
        return "🚀 Starting game..."
      }
    }
    
    return "🎮 Preparing game..."
  }

  const getStatusColor = () => {
    if (searchingForMatch || (activeGame && activeGame.players.length === 1)) {
      return "bg-yellow-50 border-yellow-200 text-yellow-800"
    }
    
    if (!socketConnected) {
      return "bg-red-50 border-red-200 text-red-800"
    }
    
    if (gameStarted) {
      return "bg-green-50 border-green-200 text-green-800"

    }
    
    return "bg-blue-50 border-blue-200 text-blue-800"
  }

  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg border-2 shadow-lg ${getStatusColor()} max-w-xs`}>
      <div className="flex items-center space-x-2">
        {(searchingForMatch || (activeGame && activeGame.players.length === 1)) && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
        )}
        <p className="font-medium">{getStatusMessage()}</p>
      </div>
      
      {activeGame && (
        <div className="mt-2 space-y-1 text-sm">
          <p>Players: {activeGame.players.length}/2</p>
          {activeGame.problem && activeGame.players.length === 2 && (
            <p>Problem: {activeGame.problem.title}</p>
          )}
          {activeGame.players.length === 2 && (
            <p>
              Opponents: {activeGame.players.map(p => p.user.username).join(" vs ")}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

const Game: React.FC = () => {
  const { user } = useAuth()
  const [activeGame, setActiveGame] = useState<GameRoom | null>(null)
  const [roomCode, setRoomCode] = useState("")
  const [selectedDifficulty, setSelectedDifficulty] = useState("Medium")
  const [loading, setLoading] = useState(false)
  const [searchingForMatch, setSearchingForMatch] = useState(false)
  const [code, setCode] = useState("")
  const [language, setLanguage] = useState("cpp")
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [gameFinished, setGameFinished] = useState(false)
  const [winner, setWinner] = useState<string | null>(null)
  const [opponentProgress, setOpponentProgress] = useState({ testCasesPassed: 0, totalTestCases: 0 })
  const [showGameEndModal, setShowGameEndModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null)

  const socketRef = useRef<any>(null)
  const [socketConnected, setSocketConnected] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const timerRef = useRef<number | null>(null)

  // ✅ FIXED: Check URL params for direct game access on component mount
  useEffect(() => {
    const urlPath = window.location.pathname;
    const gameIdMatch = urlPath.match(/\/game\/play\/([^\/]+)/);
    
    if (gameIdMatch && !activeGame && user?.id) {
      const gameId = gameIdMatch[1];
      console.log("🔗 Direct game access detected, loading game:", gameId);
      
      const loadDirectGame = async () => {
        try {
          const response = await axios.get(
            `http://localhost:5000/api/game/play/${gameId}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );
          
          console.log("✅ Direct game loaded:", response.data);
          setActiveGame(response.data);
          
          // Check if game should start immediately
          if (response.data.status === "ongoing" && 
              response.data.players.length === 2 && 
              response.data.startTime) {
            console.log("🚀 Direct game load - game should start!");
            setGameStarted(true);
            
            // Calculate time remaining
            const now = new Date().getTime();
            const start = new Date(response.data.startTime).getTime();
            const timeLimitMs = response.data.timeLimit * 60 * 1000;
            const remaining = Math.max(0, start + timeLimitMs - now);
            const remainingSeconds = Math.floor(remaining / 1000);
            setTimeRemaining(remainingSeconds);
          }
        } catch (error) {
          console.error("❌ Failed to load direct game:", error);
          alert("Failed to load game. Redirecting to lobby.");
          window.history.pushState({}, '', '/game');
        }
      };
      
      loadDirectGame();
    }
  }, [user?.id, activeGame === null]); // ✅ FIXED: Use activeGame === null instead of !activeGame

  // ✅ CRITICAL FIX: Simplified socket effect with better dependency management
useEffect(() => {
  console.log("🔌 Socket effect triggered:", {
    gameId: activeGame?._id,
    userId: user?.id,
    userIdAlt: user?._id,
    hasGame: !!activeGame,
    hasUser: !!user?.id,
    userObject: user
  });

  // 1️⃣ Bail out if we don't have essential requirements
  if (!activeGame?._id || !user?.id) {
    console.log("❌ Socket effect: Missing requirements", {
      hasActiveGame: !!activeGame?._id,
      hasUserId: !!user?.id,
      activeGameId: activeGame?._id,
      userId: user?.id
    });
    return;
  }

  // 2️⃣ Clear existing socket if it exists
  if (socketRef.current) {
    console.log("🧹 Cleaning up existing socket");
    socketRef.current.removeAllListeners();
    socketRef.current.disconnect();
    socketRef.current = null;
    setSocketConnected(false);
  }
  
  console.log("🚀 Creating new socket connection...");
  
  // 3️⃣ Create a new socket connection with explicit user ID
  const newSocket = io("http://localhost:5000", {
    auth: { 
      token: localStorage.getItem("token"), 
      userId: user.id // ✅ FIXED: Use consistent user.id (normalized in AuthContext)
    },
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 3000,
    timeout: 10000,
    transports: ['websocket', 'polling']
  });
  
  socketRef.current = newSocket;
  console.log("📡 Socket reference set for game:", activeGame._id, "User:", user.id);

  // 4️⃣ CONNECTION EVENTS
  newSocket.on("connect", () => {
    console.log("✅ Socket connected successfully!", {
      socketId: newSocket.id,
      gameId: activeGame._id,
      userId: user.id
    });
    
    setSocketConnected(true);
    console.log("🎮 Joining game room:", activeGame._id);
    newSocket.emit("join-game", activeGame._id);
  });

  newSocket.on("connect_error", (error: any) => {
    console.error("❌ Socket connection error:", error);
    setSocketConnected(false);
  });

  newSocket.on("disconnect", (reason: string) => {
    console.log("🔌 Socket disconnected:", reason);
    setSocketConnected(false);
  });

  newSocket.on("reconnect", (attemptNumber: number) => {
    console.log("🔄 Socket reconnected after", attemptNumber, "attempts");
    setSocketConnected(true);
    if (activeGame?._id) {
      console.log("🎮 Re-joining game room after reconnect:", activeGame._id);
      newSocket.emit("join-game", activeGame._id);
    }
  });

  // 5️⃣ GAME STATE UPDATES (listeners are attached to the new socket)
  newSocket.on("game-state", (gameState: GameRoom) => {
    console.log("📊 game-state received:", {
      gameId: gameState._id,
      status: gameState.status,
      playersCount: gameState.players.length,
      startTime: gameState.startTime,
      players: gameState.players.map(p => p.user.username)
    });
    
    setActiveGame(gameState);
    
    // update opponent progress
    const opp = gameState.players.find(p => p.user._id !== user.id);
    if (opp) {
      setOpponentProgress({
        testCasesPassed: opp.testCasesPassed || 0,
        totalTestCases: opp.totalTestCases || 0,
      });
    }
    
    // set template if needed
    if (gameState.problem && code.length === 0) {
      setCode(getDefaultCodeTemplate(language, gameState.problem));
    }
    
    // ✅ CRITICAL FIX: Check if game should start based on updated state
    if (gameState.status === "ongoing" && 
        gameState.players.length === 2 && 
        gameState.startTime) {
      console.log("🚀 Game-state indicates game should start!");
      setGameStarted(true);
      
      // Calculate time remaining
      const now = new Date().getTime();
      const start = new Date(gameState.startTime).getTime();
      const timeLimitMs = gameState.timeLimit * 60 * 1000;
      const remaining = Math.max(0, start + timeLimitMs - now);
      const remainingSeconds = Math.floor(remaining / 1000);
      setTimeRemaining(remainingSeconds);
    }
  });

  // 7️⃣ GAME START
  socketRef.current.on("game-started", (data: { game: GameRoom; timeLimit: number }) => {
    console.log("🚀 game-started received:", data);
    setActiveGame(data.game);
    setGameStarted(true);
    setTimeRemaining(data.timeLimit * 60);
  });

  // 8️⃣ PLAYER JOINED - ✅ CRITICAL FIX: This should update User1 when User2 joins
  socketRef.current.on("player-joined", (payload: { playerId: string; playerCount: number; game: GameRoom }) => {
    console.log("👥 player-joined:", {
      playerId: payload.playerId,
      playerCount: payload.playerCount,
      gameStatus: payload.game.status,
      gameStartTime: payload.game.startTime
    });
    
    // ✅ Update the game state immediately
    setActiveGame(payload.game);
    
    // ✅ If game is now ready to start (2 players, ongoing status), start it
    if (payload.game.status === "ongoing" && 
        payload.game.players.length === 2 && 
        payload.game.startTime) {
      console.log("🚀 Player-joined triggered game start!");
      setGameStarted(true);
      
      // Calculate time remaining
      const now = new Date().getTime();
      const start = new Date(payload.game.startTime).getTime();
      const timeLimitMs = payload.game.timeLimit * 60 * 1000;
      const remaining = Math.max(0, start + timeLimitMs - now);
      const remainingSeconds = Math.floor(remaining / 1000);
      setTimeRemaining(remainingSeconds);
    }
  });

  // 9️⃣ PROGRESS / SUBMISSIONS / FINISH
  socketRef.current.on("player-progress", (d) => {
    if (d.playerId !== user.id) {
      setOpponentProgress({ testCasesPassed: d.testCasesPassed, totalTestCases: d.totalTestCases });
    }
  });

  socketRef.current.on("submission-result", (res: SubmissionResult) => {
    console.log("📝 submission-result:", res);
    setSubmissionResult(res);
    setSubmitting(false);
  });

  socketRef.current.on("submission-error", (err: { message: string }) => {
    console.error("❌ submission-error:", err);
    alert("Submission failed: " + err.message);
    setSubmitting(false);
  });

  socketRef.current.on("game-finished", (data) => {
    console.log("🏁 game-finished:", data);
    setGameFinished(true);
    setGameStarted(false);
    setWinner(data.winnerId || data.winner || null);
    setShowGameEndModal(true);
    setSubmitting(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (data.finalState) {
        // Filter test cases before setting state
        const finalStateWithFilteredProblem = {
            ...data.finalState,
            problem: {
                ...data.finalState.problem,
                testCases: data.finalState.problem.testCases.filter((tc: any) => tc.isPublic),
            },
        };
        setActiveGame(finalStateWithFilteredProblem);
    }
  });

  socketRef.current.on("error", (err: { message: string }) => {
    console.error("❌ socket error:", err);
    alert(err.message);
  });

  // 🔚 CLEANUP function
  return () => {
    console.log("🧹 Socket effect cleanup for game:", activeGame._id);
    
    if (socketRef.current) {
      console.log("🔌 Disconnecting socket in cleanup");
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
    }
  };

}, [activeGame?._id, user?.id]); // ✅ FIXED: Simplified dependency array

  // Timer effect - Fixed to properly handle game timing
  useEffect(() => {
  console.log("⏰ Timer effect triggered", {
    gameStatus: activeGame?.status,
    startTime: activeGame?.startTime,
    timeLimit: activeGame?.timeLimit,
    playersCount: activeGame?.players?.length,
    gameStarted
  })
  
  // Clear existing timer
  if (timerRef.current) {
    window.clearInterval(timerRef.current)
    timerRef.current = null
  }

  // ✅ CRITICAL FIX: Start timer when game is ongoing with startTime and 2 players
  const shouldStartTimer =
    activeGame?.status === "ongoing" &&
    activeGame?.startTime &&
    activeGame.players.length === 2 &&
    activeGame.timeLimit

  if (shouldStartTimer) {
    console.log("⏰ Starting game timer - conditions met")
    console.log("📊 Timer conditions:", {
      status: activeGame?.status,
      hasStartTime: !!activeGame?.startTime,
      playersCount: activeGame?.players?.length,
      gameStarted,
      timeLimit: activeGame?.timeLimit
    })

    // Calculate initial time remaining
    let initialTimeRemaining = activeGame?.timeLimit ? activeGame.timeLimit * 60 : 1800 // 30 min default

    if (activeGame?.startTime) {
      const now = new Date().getTime()
      const start = new Date(activeGame.startTime).getTime()
      const timeLimitMs = activeGame.timeLimit * 60 * 1000
      const remaining = Math.max(0, start + timeLimitMs - now)
      initialTimeRemaining = Math.floor(remaining / 1000)
    }

    console.log("⏰ Initial time remaining:", initialTimeRemaining, "seconds")
    setTimeRemaining(initialTimeRemaining)

    timerRef.current = window.setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = Math.max(0, prev - 1)
        
        if (newTime <= 0 && socketRef.current && !gameFinished) {
          console.log("⏰ Time is up! Emitting timeout event")
          socketRef.current.emit("game-timeout", activeGame?._id)
          if (timerRef.current) {
            window.clearInterval(timerRef.current)
            timerRef.current = null
          }
        }
        
        return newTime
      })
    }, 1000)
    
    // Set gameStarted to true when timer starts
    if (!gameStarted) {
      console.log("⏰ Setting gameStarted to true as timer is starting")
      setGameStarted(true)
    }
  }

  return () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }
}, [activeGame?.status, activeGame?.startTime, activeGame?.timeLimit, activeGame?.players?.length, gameFinished])

  // Continuous game state refresh effect
  useEffect(() => {
    let gameStateInterval: number | null = null
    
    // Only start refresh if we have an active game and it's not finished
    if (activeGame && !gameFinished) {
      console.log("🔄 Starting continuous game state refresh")
      
      gameStateInterval = window.setInterval(async () => {
        try {
          const response = await axios.get(
            `http://localhost:5000/api/game/${activeGame._id}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          )
          
          const updatedGame = response.data
          console.log("🔄 Game state refresh:", {
            status: updatedGame.status,
            players: updatedGame.players.length,
            startTime: updatedGame.startTime
          })
          
          // Update game state if there are changes
          if (updatedGame.status !== activeGame.status || 
              updatedGame.players.length !== activeGame.players.length ||
              updatedGame.startTime !== activeGame.startTime) {
            console.log("📊 Game state changed, updating...")
            setActiveGame(updatedGame)
            
            // Check if game should start
            if (updatedGame.status === "ongoing" && 
                updatedGame.players.length === 2 && 
                updatedGame.startTime && 
                !gameStarted) {
              console.log("🚀 Game state refresh detected game start!")
              setGameStarted(true)
              // Calculate initial time remaining
              const now = new Date().getTime()
              const start = new Date(updatedGame.startTime).getTime()
              const timeLimitMs = updatedGame.timeLimit * 60 * 1000
              const remaining = Math.max(0, start + timeLimitMs - now)
              const remainingSeconds = Math.floor(remaining / 1000)
              setTimeRemaining(remainingSeconds)
            }
          }
        } catch (error) {
          console.error("❌ Error refreshing game state:", error)
        }
      }, 2000) // Refresh every 2 seconds
    }
    
    return () => {
      if (gameStateInterval) {
        window.clearInterval(gameStateInterval)
      }
    }
  }, [activeGame?._id, gameFinished, gameStarted, activeGame?.status, activeGame?.players?.length, activeGame?.startTime])

  
  // Set initial code template when problem is loaded
  useEffect(() => {
    console.log("📝 Code template effect triggered", {
      hasProblem: !!activeGame?.problem,
      language,
      currentCodeLength: code.length,
      gameStatus: activeGame?.status,
    })

    if (activeGame?.problem && code.length === 0) {
      console.log("📝 Setting initial code template for language:", language)
      const template = getDefaultCodeTemplate(language, activeGame.problem)
      setCode(template)
    }
  }, [activeGame?.problem, language])

  // Generate code template based on problem and language
  const getDefaultCodeTemplate = (lang: string, problem?: GameRoom["problem"]) => {
    console.log("📝 Generating code template for language:", lang, "Problem:", problem?.title)

    const templates = {
      cpp: `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>

using namespace std;

int main() {
    // Read input

    // Process and solve

    // Output result

    return 0;
}`,
      java: `import java.util.*;
import java.io.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);

        // Read input

        // Process and solve

        // Output result

        sc.close();
    }
}`,
      python: `# Read input
# Process and solve
# Output result`,
      c: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    // Read input

    // Process and solve

    // Output result

    return 0;
}`,
    }

    return templates[lang as keyof typeof templates] || ""
  }

  const handleLanguageChange = (newLanguage: string) => {
    console.log("🔄 Language changed from", language, "to", newLanguage)
    setLanguage(newLanguage)

    // Generate new template for the selected language
    const template = getDefaultCodeTemplate(newLanguage, activeGame?.problem)
    setCode(template)
  }

  // Enhanced submit code function with better validation
  const handleSubmitCode = () => {
  console.log("📤 Submit code button clicked")
  
  // Enhanced debugging
  console.log("🔍 Socket Debug Info:", {
    socketRefExists: !!socketRef.current,
    socketRefConnected: socketRef.current?.connected,
    socketConnectedState: socketConnected,
    socketId: socketRef.current?.id,
    socketAuth: socketRef.current?.auth,
  })
  
  console.log("📊 Submit validation:", {
    hasCode: !!code.trim(),
    hasSocket: !!socketRef.current,
    socketConnected: socketRef.current?.connected,
    hasActiveGame: !!activeGame,
    gameFinished,
    gameStatus: activeGame?.status,
    gameStarted,
    submitting,
    playersCount: activeGame?.players?.length,
    timeRemaining,
  })

  if (submitting) {
    console.log("⏳ Already submitting, ignoring request")
    return
  }

  if (!code.trim()) {
    console.log("❌ No code to submit")
    alert("Please write some code before submitting!")
    return
  }

  // ✅ CRITICAL FIX: Check both socketRef state and socketConnected state
  console.log("🔌 Socket connection check:", {
    socketRefCurrent: !!socketRef.current,
    socketRefConnected: socketRef.current?.connected,
    socketConnectedState: socketConnected,
    socketReadyState: socketRef.current?.readyState
  })

  // Use socketConnected state as primary check since it's more reliable
  if (!socketRef.current || !socketConnected || !socketRef.current.connected) {
    console.log("❌ No active socket connection")
    console.log("🔌 Socket diagnostics:", {
      noSocketRef: !socketRef.current,
      notConnectedState: !socketConnected,
      notSocketConnected: !socketRef.current?.connected
    })
    alert("Connection lost. Please refresh the page or wait for reconnection.")
    return
  }

  if (!activeGame) {
    console.log("❌ No active game")
    alert("No active game found.")
    return
  }

  if (gameFinished) {
    console.log("❌ Game already finished")
    alert("Game has already finished.")
    return
  }

  if (activeGame.status !== "ongoing") {
    console.log("❌ Game not ongoing, status:", activeGame.status)
    alert("Game is not currently active. Please wait for the game to start.")
    return
  }
  
  // Check if we have 2 players and the game has started (either via gameStarted flag OR via ongoing status with startTime)
  const gameCanStart = gameStarted || (activeGame.status === "ongoing" && activeGame.players.length === 2 && activeGame.startTime)
  if (!gameCanStart) {
    console.log("❌ Game conditions not met for submission", {
      gameStarted,
      status: activeGame.status,
      playersCount: activeGame.players.length,
      hasStartTime: !!activeGame.startTime
    })
    alert("Please wait for both players to join and the game to start.")
    return
  }

  console.log("✅ All checks passed, emitting submit-code event")
  setSubmitting(true)
  setSubmissionResult(null)

  // Add a timeout to handle cases where submission hangs
  const submitTimeout = setTimeout(() => {
    console.log("⏰ Submit timeout - resetting submitting state")
    setSubmitting(false)
    alert("Submission timed out. Please try again.")
  }, 25000) // 25 second timeout

  // Clear timeout if submission completes
  const originalOn = socketRef.current.on
  const onSubmissionResult = (result: any) => {
    clearTimeout(submitTimeout)
    console.log("📝 Submission result received:", result)
    setSubmissionResult(result)
    setSubmitting(false)
  }
  
  const onSubmissionError = (error: any) => {
    clearTimeout(submitTimeout)
    console.error("❌ Submission error received:", error)
    alert("Submission failed: " + error.message)
    setSubmitting(false)
  }

  // Temporarily add listeners for this submission
  socketRef.current.once("submission-result", onSubmissionResult)
  socketRef.current.once("submission-error", onSubmissionError)

  socketRef.current.emit("submit-code", {
    gameId: activeGame._id,
    code,
    language,
  })
}

  // Code change handler
  const handleCodeChange = (newCode: string) => {
    setCode(newCode)
    if (socketRef.current && activeGame && socketRef.current.connected) {
      socketRef.current.emit("code-update", {
        gameId: activeGame._id,
        code: newCode,
      })
    }
  }

  const findRandomMatch = async () => {
    console.log("🎲 Finding random match for user:", user?.username)

    if (!user) {
      console.log("❌ No user found for random match")
      return
    }

    setSearchingForMatch(true)
    setLoading(true)

    try {
      console.log("📡 Making API request for random match")
      const response = await axios.post(
        "http://localhost:5000/api/game/random",
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      )

      console.log("✅ Random match response received:", {
        gameId: response.data._id,
        playersCount: response.data.players.length,
        status: response.data.status,
      })
      setActiveGame(response.data)
      
      // ✅ Update URL to direct game access
      window.history.pushState({}, '', `/game/play/${response.data._id}`);
    } catch (error) {
      console.error("❌ Random match error:", error)
      alert("Failed to find match. Please try again.")
    } finally {
      setLoading(false)
      setSearchingForMatch(false)
    }
  }

  const createRoom = async () => {
    console.log("🏠 Creating room with difficulty:", selectedDifficulty)

    if (!user) {
      console.log("❌ No user found for room creation")
      return
    }

    setLoading(true)
    try {
      console.log("📡 Making API request to create room")
      const response = await axios.post(
        "http://localhost:5000/api/game/room",
        {
          difficulty: selectedDifficulty,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      )

      console.log("✅ Room creation response received:", {
        roomId: response.data.roomId,
        gameId: response.data._id,
        playersCount: response.data.players.length,
      })
      setActiveGame(response.data)
      
      // ✅ Update URL to direct game access
      window.history.pushState({}, '', `/game/play/${response.data._id}`);
    } catch (error) {
      console.error("❌ Room creation error:", error)
      alert("Failed to create room. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const joinRoom = async () => {
    console.log("🚪 Joining room with code:", roomCode)

    if (!user || !roomCode.trim()) {
      console.log("❌ Missing user or room code")
      return
    }

    setLoading(true)
    try {
      console.log("📡 Making API request to join room")
      const response = await axios.post(
        `http://localhost:5000/api/game/room/${roomCode.toUpperCase()}/join`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      )

      console.log("✅ Room join response received:", {
        roomId: response.data.roomId,
        gameId: response.data._id,
        playersCount: response.data.players.length,
      })
      setActiveGame(response.data)
      
      // ✅ Update URL to direct game access
      window.history.pushState({}, '', `/game/play/${response.data._id}`);
    } catch (error) {
      console.error("❌ Room join error:", error)
      alert("Failed to join room. Please check the room code.")
    } finally {
      setLoading(false)
    }
  }

  const resetGame = () => {
    console.log("🔄 Resetting game state")

    // ✅ CRITICAL FIX: Emit leave-game event FIRST before any cleanup
    if (socketRef.current && socketRef.current.connected && activeGame) {
      console.log("🚪 Emitting leave-game event for game:", activeGame._id)
      socketRef.current.emit("leave-game", activeGame._id)
    }
    
    // Disconnect socket after leave event is sent or if no game was active
    if (socketRef.current) {
      console.log("🔌 Disconnecting socket in resetGame")
      socketRef.current.disconnect()
      socketRef.current = null
      setSocketConnected(false)
    }

    // Clear timer
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
      console.log("⏰ Timer cleared")
    }

    // Clear refresh interval
    if (refreshInterval) {
      window.clearInterval(refreshInterval)
      setRefreshInterval(null)
      console.log("🔄 Refresh interval cleared")
    }

    // Reset ALL game state variables
    setActiveGame(null)
    setGameFinished(false)
    setGameStarted(false) // ✅ CRITICAL: Reset gameStarted
    setWinner(null)
    setCode("")
    setSubmissionResult(null)
    setOpponentProgress({ testCasesPassed: 0, totalTestCases: 0 })
    setShowGameEndModal(false)
    setTimeRemaining(0)
    setSubmitting(false)
    setSearchingForMatch(false) // ✅ Reset search state

    // ✅ Reset URL to main game lobby and force reload to clear all stale state
    window.history.pushState({}, '', '/game');
    window.location.reload(); 

    console.log("✅ Game state completely reset and page reloaded")
  }
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, "0")}`
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "text-green-600 bg-green-100"
      case "Medium":
        return "text-yellow-600 bg-yellow-100"
      case "Hard":
        return "text-red-600 bg-red-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }
  const getCurrentPlayer = () => {
  if (!activeGame || !user) {
    console.log("❌ getCurrentPlayer: missing game or user", {
      hasGame: !!activeGame,
      hasUser: !!user,
      userId: user?.id || user?._id
    });
    return null;
  }
  // Always use _id if available, fallback to id
  const userId = String(user._id || user.id);
  const currentPlayer = activeGame.players.find(
    (p) => String(p.user._id || p.user) === userId
  );
  console.log("👤 getCurrentPlayer result:", {
    found: !!currentPlayer,
    playerUserId: currentPlayer?.user._id || currentPlayer?.user,
    currentUserId: userId,
    playersCount: activeGame.players.length
  });
  return currentPlayer;
};

const getOpponentPlayer = () => {
  if (!activeGame || !user) {
    console.log("❌ getOpponentPlayer: missing game or user");
    return null;
  }
  const userId = String(user._id || user.id);
  const opponentPlayer = activeGame.players.find(
    (p) => String(p.user._id || p.user) !== userId
  );
  console.log("👥 getOpponentPlayer result:", {
    found: !!opponentPlayer,
    opponentUserId: opponentPlayer?.user._id || opponentPlayer?.user,
    currentUserId: userId
  });
  return opponentPlayer;
};


  // Check if submit button should be enabled
  const isSubmitEnabled = () => {
    const socketIsConnected = socketRef.current?.connected || false;
    
    console.log("🔍 Submit validation debug:", {
      socketRefExists: !!socketRef.current,
      socketRefConnected: socketRef.current?.connected,
      socketConnectedState: socketConnected,
      actualSocketConnection: socketIsConnected,
      hasCode: !!code.trim(),
      gameStatus: activeGame?.status,
      gameStarted,
      gameFinished,
      submitting,
      playersCount: activeGame?.players?.length,
      userId: user?.id || user?._id,
      gameId: activeGame?._id
    });

    // ✅ FIXED: More lenient socket check - if socket exists but state hasn't updated yet
    const socketReady = socketRef.current && (socketIsConnected || socketConnected);
    
    if (!socketReady) {
      console.log("❌ Submit disabled: Socket not ready", {
        hasSocketRef: !!socketRef.current,
        socketConnected: socketIsConnected,
        stateConnected: socketConnected
      });
      return false;
    }

    const hasCode = !!code.trim();
    const gameIsReady =
      activeGame &&
      activeGame.status === "ongoing" &&
      activeGame.players.length === 2 &&
      gameStarted;

    const canSubmit = gameIsReady && !gameFinished && !submitting;
    
    console.log("📊 Submit validation result:", {
      hasCode,
      gameIsReady,
      canSubmit,
      finalResult: hasCode && canSubmit
    });
    
    return hasCode && canSubmit;
  };

  // Show game end modal
  if (showGameEndModal && gameFinished && activeGame) {
    const currentPlayer = getCurrentPlayer()
    const opponentPlayer = getOpponentPlayer()
    const isWinner = winner === user?.id
    console.log("🏆 Showing game end modal:", { isWinner, winner, userId: user?.id })
    return (
      <GameEndModal
        isWinner={isWinner}
        winner={winner}
        currentPlayer={currentPlayer}
        opponentPlayer={opponentPlayer}
        onClose={resetGame}
      />
    )
  }

  // Main game interface
  if (activeGame) {
    const currentPlayer = getCurrentPlayer()
    const opponentPlayer = getOpponentPlayer()
    console.log("🎮 Rendering game interface:", {
      gameId: activeGame._id,
      status: activeGame.status,
      playersCount: activeGame.players.length,
      currentPlayer: currentPlayer?.user.username,
      opponentPlayer: opponentPlayer?.user.username,
      gameStarted,
      socketConnected: socketRef.current?.connected,
      timeRemaining,
    })
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Game Status Card */}
        <GameStatusCard
          activeGame={activeGame}
          searchingForMatch={searchingForMatch}
          gameStarted={gameStarted}
          socketConnected={socketConnected}
        />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Game Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {activeGame.gameMode === "random" ? "Random Match" : `Room: ${activeGame.roomId}`}
                </h1>
                {activeGame.players.length === 2 && activeGame.problem && (
                  <p className="text-gray-600">
                    Problem: {activeGame.problem?.title}
                    {activeGame.problem && (
                      <span
                        className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(activeGame.problem.difficulty)}`}
                      >
                        {activeGame.problem.difficulty}
                      </span>
                    )}
                  </p>
                )}
                <div className="flex items-center space-x-4 mt-2">
                  <span
                    className={`text-sm px-2 py-1 rounded ${
                      activeGame.status === "ongoing" ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {activeGame.status === "ongoing" ? "Game Active" : "Waiting for players"}
                  </span>
                  <span className="text-sm text-gray-600">Players: {activeGame.players.length}/2</span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center text-red-600 mb-2">
                  <Clock className="h-5 w-5 mr-2" />
                  <span className="text-xl font-mono">{formatTime(timeRemaining)}</span>
                </div>
                <p className="text-sm text-gray-500">Time Limit: {activeGame.timeLimit} minutes</p>
                {!gameStarted && activeGame.players.length < 2 && (
                  <p className="text-sm text-orange-600 mt-1">Waiting for opponent...</p>
                )}
                {!gameStarted && activeGame.players.length === 2 && (
                  <p className="text-sm text-green-600 mt-1">Starting game...</p>
                )}
              </div>
            </div>
            {/* Added Leave Game Button */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={resetGame}
                className="flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Leave Game
              </button>
            </div>
          </div>

          {/* Players Progress */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{user?.username} (You)</h3>
                  <p className="text-sm text-gray-600">Rating: {currentPlayer?.user.ratings?.gameRating || 1200}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {currentPlayer?.testCasesPassed || 0}/{currentPlayer?.totalTestCases || 0}
                  </div>
                  <p className="text-sm text-gray-500">Tests passed</p>
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      currentPlayer?.totalTestCases
                        ? (currentPlayer.testCasesPassed / currentPlayer.totalTestCases) * 100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {opponentPlayer?.user.username || "Waiting for opponent..."}
                  </h3>
                  <p className="text-sm text-gray-600">Rating: {opponentPlayer?.user.ratings?.gameRating || "N/A"}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-purple-600">
                    {opponentProgress.testCasesPassed}/{opponentProgress.totalTestCases || 0}
                  </div>
                  <p className="text-sm text-gray-500">Tests passed</p>
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      opponentProgress.totalTestCases
                        ? (opponentProgress.testCasesPassed / opponentProgress.totalTestCases) * 100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Problem Description or Waiting Card */}
            {activeGame.problem && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6 transition-colors duration-200">
                {/* Show waiting card if not all players have joined or game hasn't started */}
                {(activeGame.players.length < 2 || !gameStarted) ? (
                  <div className="text-center py-12">
                    <div className="flex justify-center mb-6">
                      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400"></div>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      {activeGame.players.length < 2 ? "Waiting for Opponent" : "Preparing Game..."}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                      {activeGame.players.length < 2 
                        ? "The problem will be revealed once both players join to ensure fair competition." 
                        : "Game is starting soon..."}
                    </p>
                    <div className="bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 max-w-sm mx-auto">
                      <div className="flex items-center justify-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                        <span>Players:</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400">{activeGame.players.length}/2</span>
                      </div>
                      {activeGame.gameMode === "room" && (
                        <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                          <span>Room Code: </span>
                          <span className="font-mono font-semibold text-purple-600 dark:text-purple-400">{activeGame.roomId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // Show problem description only when both players are ready
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Problem Description</h3>
                    <div className="prose max-w-none">
                      <div className="mb-4">
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{activeGame.problem.description}</p>
                      </div>

                      {activeGame.problem.examples.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Examples:</h4>
                          {activeGame.problem.examples.map((example, index) => (
                            <div key={index} className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                              <div className="mb-2">
                                <strong className="text-gray-900 dark:text-gray-100">Input:</strong>
                                <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded mt-1 text-sm text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600">{example.input}</pre>
                              </div>
                              <div className="mb-2">
                                <strong className="text-gray-900 dark:text-gray-100">Output:</strong>
                                <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded mt-1 text-sm text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600">{example.output}</pre>
                              </div>
                              {example.explanation && (
                                <div>
                                  <strong className="text-gray-900 dark:text-gray-100">Explanation:</strong>
                                  <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{example.explanation}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div>
                        <h4 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Constraints:</h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{activeGame.problem.constraints}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Code Editor */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6 transition-colors duration-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Code Editor</h3>
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  disabled={gameFinished}
                >
                  <option value="cpp">C++20</option>
                  <option value="java">Java</option>
                  <option value="python">Python</option>
                  <option value="c">C</option>
                </select>
              </div>
              
              <div className="mb-4">
                <div className="relative">
                  <CodeMirrorEditor
                    value={code}
                    onChange={handleCodeChange}
                    language={language}
                    disabled={gameFinished || !gameStarted}
                    contestMode={true}
                    height="400px"
                  />
                  <div className="absolute bottom-2 right-2 bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold">
                    Copy/Paste Disabled
                  </div>
                </div>
              </div>
              <div className="flex space-x-4 mb-4">
                <button
                  onClick={handleSubmitCode}
                  disabled={!isSubmitEnabled()}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {submitting ? "Submitting..." : "Submit"}
                </button>

                {/* Debug info for submit button */}
                {!isSubmitEnabled() && (
                   <div className="text-xs text-gray-500 flex items-center flex-wrap">
                    {!code.trim() && <span className="mr-2">No code</span>}
                    {gameFinished && <span className="mr-2">Game finished</span>}
                    {!gameStarted && <span className="mr-2">Game not started</span>}
                    {submitting && <span className="mr-2">Submitting</span>}
                    {!(socketRef.current?.connected) && <span className="mr-2 text-red-600 font-semibold">Socket disconnected</span>}
                    {activeGame?.players?.length !== 2 && <span className="mr-2">Need 2 players</span>}
                    {activeGame?.status !== "ongoing" && <span className="mr-2">Game not ongoing</span>}
                  </div>
                )}
              </div>

              {/* Submission Result */}
              {submissionResult && (
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center mb-4">
                    {submissionResult.status === "Accepted" ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 mr-2" />
                    )}
                    <span
                      className={`font-semibold ${
                        submissionResult.status === "Accepted" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {submissionResult.status}
                    </span>
                  </div>

                  <div className="text-sm mb-4">
                    <span className="text-gray-600">Test Cases:</span>
                    <span className="ml-2 font-medium">
                      {submissionResult.passedTests}/{submissionResult.totalTests}
                    </span>
                  </div>
                  {submissionResult.testResults.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Test Results:</h4>
                      <div className="space-y-2">
                        {submissionResult.testResults.map((result, index) => (
                          <div key={index} className="text-sm">
                            <div className="flex items-center">
                              {result.passed ? (
                                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600 mr-2" />
                              )}
                              <span>Test Case {index + 1}</span>
                            </div>
                            {!result.passed && (
                              <div className="ml-6 mt-2 text-xs text-gray-600">
                                <div>Expected: {result.expectedOutput}</div>
                                <div>Got: {result.actualOutput}</div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Game lobby interface
  return (
    <div className="min-h-screen bg-gray-50">
      <GameStatusCard
        activeGame={activeGame}
        searchingForMatch={searchingForMatch}
        gameStarted={gameStarted}
        socketConnected={socketConnected}
      />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <Gamepad2 className="h-16 w-16 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Game Mode</h1>
          <p className="text-xl text-gray-600">Challenge other programmers in real-time coding battles</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Random Match */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Random Match</h2>
              <p className="text-gray-600">Get matched with another player instantly</p>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">How it works:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Random difficulty problems (Easy, Medium, Hard)</li>
                  <li>• Dynamic time limits based on difficulty</li>
                  <li>• ELO-based rating system</li>
                  <li>• Real-time multiplayer coding</li>
                </ul>
              </div>

              <button
                onClick={findRandomMatch}
                disabled={loading || searchingForMatch}
                className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {searchingForMatch ? "Searching for opponent..." : "Find Match"}
              </button>

              {user && (
                <div className="text-center text-sm text-gray-500">Your rating: {user.ratings?.gameRating || 1200}</div>
              )}
            </div>
          </div>

          {/* Room Match */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Room Match</h2>
              <p className="text-gray-600">Create or join a room to play with friends</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Easy">Easy (30 mins)</option>
                  <option value="Medium">Medium (45 mins)</option>
                  <option value="Hard">Hard (60 mins)</option>
                </select>
              </div>

              <button
                onClick={createRoom}
                disabled={loading}
                className="w-full bg-green-600 text-white py-3 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating Room..." : "Create Room"}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or</span>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Enter room code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={joinRoom}
                disabled={loading || !roomCode.trim()}
                className="w-full bg-purple-600 text-white py-3 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Joining Room..." : "Join Room"}
              </button>
            </div>
          </div>
        </div>

        {/* Game Rules */}
        <div className="mt-12">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8 text-center">Game Rules & Guidelines</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Winning Conditions Card */}
            <div className="group bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 border border-green-200/50 dark:border-green-600/30 hover:shadow-lg hover:scale-105 transition-all duration-200">
              <div className="flex items-center mb-4">
                <div className="flex items-center justify-center w-10 h-10 bg-green-100 dark:bg-green-800/50 rounded-full mr-3">
                  <Medal className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <h4 className="text-lg font-bold text-green-900 dark:text-green-100">Winning Conditions</h4>
              </div>
              <div className="bg-white/60 dark:bg-gray-800/40 rounded-xl p-4 border border-green-200/30 dark:border-green-600/20">
                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>First to solve the problem wins</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>If no one solves: most test cases passed wins</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Equal test cases: draw</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Time limit exceeded: draw</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>If a player leaves: opponent wins</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* ELO Rating System Card */}
            <div className="group bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200/50 dark:border-blue-600/30 hover:shadow-lg hover:scale-105 transition-all duration-200">
              <div className="flex items-center mb-4">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-800/50 rounded-full mr-3">
                  <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="text-lg font-bold text-blue-900 dark:text-blue-100">ELO Rating System</h4>
              </div>
              <div className="bg-white/60 dark:bg-gray-800/40 rounded-xl p-4 border border-blue-200/30 dark:border-blue-600/20">
                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
                  <li className="flex items-start">
                    <Zap className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Chess-style ELO calculation</span>
                  </li>
                  <li className="flex items-start">
                    <Zap className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>K-factor: 32 for dynamic changes</span>
                  </li>
                  <li className="flex items-start">
                    <Zap className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Rating changes based on opponent skill</span>
                  </li>
                  <li className="flex items-start">
                    <Zap className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Starting rating: 1200</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Time Limits Card */}
            <div className="group bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-2xl p-6 border border-orange-200/50 dark:border-orange-600/30 hover:shadow-lg hover:scale-105 transition-all duration-200">
              <div className="flex items-center mb-4">
                <div className="flex items-center justify-center w-10 h-10 bg-orange-100 dark:bg-orange-800/50 rounded-full mr-3">
                  <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <h4 className="text-lg font-bold text-orange-900 dark:text-orange-100">Time Limits</h4>
              </div>
              <div className="bg-white/60 dark:bg-gray-800/40 rounded-xl p-4 border border-orange-200/30 dark:border-orange-600/20">
                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
                  <li className="flex items-start">
                    <Clock className="h-4 w-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span><span className="font-medium text-green-600 dark:text-green-400">Easy</span> problems: 30 minutes</span>
                  </li>
                  <li className="flex items-start">
                    <Clock className="h-4 w-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span><span className="font-medium text-orange-600 dark:text-orange-400">Medium</span> problems: 45 minutes</span>
                  </li>
                  <li className="flex items-start">
                    <Clock className="h-4 w-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span><span className="font-medium text-red-600 dark:text-red-400">Hard</span> problems: 60 minutes</span>
                  </li>
                  <li className="flex items-start">
                    <Clock className="h-4 w-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Timer starts when both players join</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Fair Play Card */}
            <div className="group bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-2xl p-6 border border-purple-200/50 dark:border-purple-600/30 hover:shadow-lg hover:scale-105 transition-all duration-200">
              <div className="flex items-center mb-4">
                <div className="flex items-center justify-center w-10 h-10 bg-purple-100 dark:bg-purple-800/50 rounded-full mr-3">
                  <Heart className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h4 className="text-lg font-bold text-purple-900 dark:text-purple-100">Fair Play</h4>
              </div>
              <div className="bg-white/60 dark:bg-gray-800/40 rounded-xl p-4 border border-purple-200/30 dark:border-purple-600/20">
                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
                  <li className="flex items-start">
                    <Heart className="h-4 w-4 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Real-time code submission</span>
                  </li>
                  <li className="flex items-start">
                    <Heart className="h-4 w-4 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Automatic test case validation</span>
                  </li>
                  <li className="flex items-start">
                    <Heart className="h-4 w-4 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Fair matchmaking system</span>
                  </li>
                  <li className="flex items-start">
                    <Heart className="h-4 w-4 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Equal problem difficulty for both players</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Game