import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  Zap, 
  Users, 
  Trophy, 
  CheckCircle, 
  XCircle, 
  LogOut, 
  Brain,
  Target,
  Timer
} from 'lucide-react';
import { API_URL, SOCKET_URL } from '../config/api';

interface MCQQuestion {
  _id: string;
  question: string;
  options: {
    text: string;
    isCorrect: boolean;
  }[];
  domain: string;
  difficulty: string;
  explanation?: string;
}

interface RapidFireGame {
  _id: string;
  roomId: string;
  players: {
    user: {
      _id: string;
      username: string;
      ratings: {
        rapidFireRating: number;
      };
    };
    status: string;
    score: number;
    correctAnswers: number;
    wrongAnswers: number;
    questionsAnswered: number;
    ratingBefore?: number;
    ratingAfter?: number;
    ratingChange?: number;
  }[];
  questionSet: MCQQuestion[];
  gameMode: string;
  timeLimit: number;
  totalQuestions: number;
  status: string;
  startTime?: string;
  endTime?: string;
  winner?: string;
  result?: string;
}

interface AnswerResult {
  isCorrect: boolean;
  score: number;
  questionsAnswered: number;
  correctAnswers: number;
  wrongAnswers: number;
  correctOptionIndex: number;
  explanation?: string;
}

// Memoized sub-components for performance
const AnimatedBackground = memo(() => {
  const { isDark } = useTheme();
  
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {isDark ? (
        /* Dark theme rapid-fire animation */
        <div className="rapid-fire-dark">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={`rapid-dark-${i}`}
              className="absolute animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `rapid-pulse ${1 + Math.random() * 2}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 3}s`
              }}
            >
              <div className={`w-1 h-1 rounded-full ${
                i % 4 === 0 ? 'bg-red-400' :
                i % 4 === 1 ? 'bg-yellow-400' :
                i % 4 === 2 ? 'bg-green-400' : 'bg-blue-400'
              } opacity-70`}></div>
            </div>
          ))}
        </div>
      ) : (
        /* Light theme rapid-fire animation */
        <div className="rapid-fire-light">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={`rapid-light-${i}`}
              className="absolute"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `rapid-float ${2 + Math.random() * 3}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 4}s`
              }}
            >
              <div className={`w-2 h-2 rounded-full ${
                i % 4 === 0 ? 'bg-red-200' :
                i % 4 === 1 ? 'bg-yellow-200' :
                i % 4 === 2 ? 'bg-green-200' : 'bg-blue-200'
              } opacity-50`}></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

const LoadingSpinner = memo(() => (
  <div className="min-h-screen flex items-center justify-center dark:bg-gray-900 relative overflow-hidden">
    <AnimatedBackground />
    <div className="relative z-10 text-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 dark:border-red-400 mx-auto mb-4"></div>
      <p className="text-gray-600 dark:text-gray-300">Loading Rapid Fire...</p>
    </div>
  </div>
));

const GameStatusCard = memo(({ 
  activeGame, 
  searchingForMatch, 
  gameStarted, 
  socketConnected 
}: {
  activeGame: RapidFireGame | null;
  searchingForMatch: boolean;
  gameStarted: boolean;
  socketConnected: boolean;
}) => {
  if (!activeGame && !searchingForMatch) return null;

  const getStatusMessage = () => {
    if (searchingForMatch) return "🔍 Searching for rapid fire opponent...";
    if (!socketConnected) return "🔌 Connecting to rapid fire server...";
    
    if (activeGame) {
      if (activeGame.players.length === 1) return "⏳ Waiting for opponent to join...";
      if (activeGame.players.length === 2 && activeGame.status === "waiting") return "🚀 Match found! Starting rapid fire...";
      if (activeGame.status === "ongoing" && gameStarted) return "⚡ Rapid Fire in progress!";
    }
    
    return "🎯 Preparing rapid fire...";
  };

  const getStatusColor = () => {
    if (searchingForMatch || (activeGame && activeGame.players.length === 1)) {
      return "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-300";
    }
    if (!socketConnected) {
      return "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300";
    }
    if (gameStarted) {
      return "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300";
    }
    return "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300";
  };

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
          {activeGame.players.length === 2 && (
            <p>Opponents: {activeGame.players.map(p => p.user.username).join(" vs ")}</p>
          )}
        </div>
      )}
    </div>
  );
});

const MCQCard = memo(({ 
  question, 
  questionNumber, 
  onAnswerSelect, 
  selectedAnswer, 
  showResult, 
  isCorrect, 
  correctAnswer 
}: {
  question: MCQQuestion;
  questionNumber: number;
  onAnswerSelect: (optionIndex: number) => void;
  selectedAnswer: number | null;
  showResult: boolean;
  isCorrect?: boolean;
  correctAnswer?: number;
}) => {
  const getDomainColor = (domain: string) => {
    switch (domain) {
      case 'dsa': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
      case 'system-design': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300';
      case 'aiml': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
      case 'aptitude': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getDomainIcon = (domain: string) => {
    switch (domain) {
      case 'dsa': return '💻';
      case 'system-design': return '🏗️';
      case 'aiml': return '🤖';
      case 'aptitude': return '🧠';
      default: return '❓';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-gray-500 dark:text-gray-400">Q{questionNumber}</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDomainColor(question.domain)}`}>
            {getDomainIcon(question.domain)} {(question.domain || '').replace('-', ' ').toUpperCase()}
          </span>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          question.difficulty === 'Easy' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
          question.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' :
          'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
        }`}>
          {question.difficulty}
        </span>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 leading-relaxed">
        {question.question}
      </h3>

      <div className="space-y-3">
        {question?.options && Array.isArray(question.options) && question.options.length > 0 ? (
          question.options.map((option, index) => {
            let buttonClass = "w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ";
            
            if (showResult) {
              if (index === correctAnswer) {
                buttonClass += "bg-green-100 border-green-500 text-green-800 dark:bg-green-900/50 dark:border-green-600 dark:text-green-300";
              } else if (index === selectedAnswer && !isCorrect) {
                buttonClass += "bg-red-100 border-red-500 text-red-800 dark:bg-red-900/50 dark:border-red-600 dark:text-red-300";
              } else {
                buttonClass += "bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400";
              }
            } else if (selectedAnswer === index) {
              buttonClass += "bg-blue-100 border-blue-500 text-blue-800 dark:bg-blue-900/50 dark:border-blue-600 dark:text-blue-300";
            } else {
              buttonClass += "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600";
            }

            return (
              <button
                key={index}
                onClick={() => !showResult && onAnswerSelect(index)}
                disabled={showResult}
                className={buttonClass}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 flex items-center justify-center font-bold text-sm">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="font-medium">{option.text}</span>
                  {showResult && index === correctAnswer && (
                    <CheckCircle className="h-5 w-5 text-green-600 ml-auto" />
                  )}
                  {showResult && index === selectedAnswer && !isCorrect && (
                    <XCircle className="h-5 w-5 text-red-600 ml-auto" />
                  )}
                </div>
              </button>
            );
          })
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">Loading question options...</p>
            <div className="mt-2 text-xs text-gray-400">
              Debug: Question ID: {question?._id || 'undefined'}, Options: {question?.options?.length || 0}
            </div>
          </div>
        )}
      </div>

      {showResult && question.explanation && (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Explanation:</h4>
          <p className="text-blue-700 dark:text-blue-300 text-sm">{question.explanation}</p>
        </div>
      )}
    </div>
  );
});

const GameEndModal = memo(({ 
  isWinner, 
  currentPlayer, 
  opponentPlayer, 
  onClose 
}: {
  isWinner: boolean;
  winner: string | null;
  currentPlayer: any;
  opponentPlayer: any;
  onClose: () => void;
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full mx-4 text-center">
      {isWinner ? (
        <div>
          <Trophy className="h-20 w-20 text-yellow-500 mx-auto mb-4 animate-bounce" />
          <h1 className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">🎉 Victory! 🎉</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">You dominated the rapid fire round!</p>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg mb-4">
            <p className="text-green-800 dark:text-green-300 font-semibold">
              Rating Change: +{currentPlayer?.ratingChange || 0}
            </p>
            <p className="text-green-700 dark:text-green-400 text-sm">
              New Rating: {currentPlayer?.ratingAfter || 1200}
            </p>
          </div>
        </div>
      ) : (
        <div>
          <Brain className="h-20 w-20 text-red-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">Better Luck Next Time!</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">Keep practicing and you'll improve!</p>
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg mb-4">
            <p className="text-red-800 dark:text-red-300 font-semibold">
              Rating Change: {currentPlayer?.ratingChange || 0}
            </p>
            <p className="text-red-700 dark:text-red-400 text-sm">
              New Rating: {currentPlayer?.ratingAfter || 1200}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Your Score</h3>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {currentPlayer?.score?.toFixed(1) || '0.0'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {currentPlayer?.correctAnswers || 0}✓ {currentPlayer?.wrongAnswers || 0}✗
          </p>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Opponent Score</h3>
          <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
            {opponentPlayer?.score?.toFixed(1) || '0.0'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {opponentPlayer?.correctAnswers || 0}✓ {opponentPlayer?.wrongAnswers || 0}✗
          </p>
        </div>
      </div>

      <button
        onClick={onClose}
        className="bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 transition-colors"
      >
        Back to Lobby
      </button>
    </div>
  </div>
));

const ScoreBoard = memo(({ 
  currentPlayer, 
  opponentPlayer, 
  timeRemaining 
}: {
  currentPlayer: any;
  opponentPlayer: any;
  timeRemaining: number;
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6 border border-gray-200 dark:border-gray-700">
      <div className="grid grid-cols-3 gap-6">
        {/* Your Score */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Your Score</h3>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
            {currentPlayer?.score?.toFixed(1) || '0.0'}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {currentPlayer?.correctAnswers || 0}✓ {currentPlayer?.wrongAnswers || 0}✗
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {currentPlayer?.questionsAnswered || 0}/10 answered
          </p>
        </div>

        {/* Timer */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Time Left</h3>
          <div className={`text-3xl font-bold mb-1 ${
            timeRemaining <= 10 ? 'text-red-600 dark:text-red-400 animate-pulse' : 
            timeRemaining <= 30 ? 'text-yellow-600 dark:text-yellow-400' : 
            'text-green-600 dark:text-green-400'
          }`}>
            {formatTime(timeRemaining)}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <Timer className="h-4 w-4 inline mr-1" />
            60 seconds total
          </p>
        </div>

        {/* Opponent Score */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {opponentPlayer?.user?.username || 'Opponent'}
          </h3>
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">
            {opponentPlayer?.score?.toFixed(1) || '0.0'}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {opponentPlayer?.correctAnswers || 0}✓ {opponentPlayer?.wrongAnswers || 0}✗
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {opponentPlayer?.questionsAnswered || 0}/10 answered
          </p>
        </div>
      </div>
    </div>
  );
});

const RapidFire: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [activeGame, setActiveGame] = useState<RapidFireGame | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchingForMatch, setSearchingForMatch] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [gameFinished, setGameFinished] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [showGameEndModal, setShowGameEndModal] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const socketRef = useRef<any>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const timerRef = useRef<number | null>(null);
  const questionStartTime = useRef<number>(Date.now());

  // Socket connection effect
  useEffect(() => {
    if (!activeGame?._id || !user?.id) return;

    console.log('🔥 Setting up rapid fire socket connection');

    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
    }

    const newSocket = io(SOCKET_URL, {
      auth: { 
        token: localStorage.getItem("token"), 
        userId: user.id 
      },
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling']
    });

    socketRef.current = newSocket;

    newSocket.on("connect", () => {
      console.log("✅ Rapid fire socket connected!");
      setSocketConnected(true);
      newSocket.emit("join-rapidfire-game", activeGame._id);
    });

    newSocket.on("connect_error", (error: any) => {
      console.error("❌ Rapid fire socket connection error:", error);
      setSocketConnected(false);
    });

    newSocket.on("disconnect", () => {
      console.log("🔌 Rapid fire socket disconnected");
      setSocketConnected(false);
    });

    newSocket.on("rapidfire-game-state", (gameState: RapidFireGame) => {
      console.log("📊 Rapid fire game state received:", gameState);
      console.log("📋 Questions in state:", gameState.questionSet?.length || 0, "Total:", gameState.totalQuestions);
      
      if (gameState.questionSet && gameState.questionSet.length > 0) {
        console.log("✅ Questions are populated:", gameState.questionSet.map(q => q._id || 'no-id'));
        // Debug first question structure
        const firstQ = gameState.questionSet[0];
        console.log("🔍 First question structure:", {
          id: firstQ._id,
          question: firstQ.question?.substring(0, 50),
          optionsLength: firstQ.options?.length,
          options: firstQ.options
        });
      } else {
        console.warn("⚠️ Questions not populated in game state");
      }
      
      setActiveGame(gameState);
    });

    newSocket.on("rapidfire-game-started", (data: any) => {
      console.log("🚀 Rapid fire game started:", data);
      console.log("🎯 Questions available:", data.questionSet?.length || 0);
      
      // BULLETPROOF: Handle new backend format - direct object with questionSet
      if (data.questionSet && data.questionSet.length > 0) {
        console.log("📊 Game started - questionSet type:", typeof data.questionSet[0]);
        console.log("📊 First question in started game:", data.questionSet[0]);
        
        // Enhanced debug logging for question structure
        const firstQuestion = data.questionSet[0];
        console.log("🔍 First question detailed structure:", {
          id: firstQuestion._id,
          question: firstQuestion.question,
          optionsCount: firstQuestion.options?.length,
          options: firstQuestion.options,
          domain: firstQuestion.domain,
          type: typeof firstQuestion
        });
      }
      
      if (!data.questionSet || data.questionSet.length === 0) {
        console.error("❌ No questions in started game!");
        return;
      }
      
      // BULLETPROOF: Use the complete game object from backend (it has everything)
      console.log("✅ Setting complete game data:", {
        hasQuestionSet: !!data.questionSet,
        questionCount: data.questionSet?.length,
        hasPlayers: !!data.players,
        playersCount: data.players?.length,
        roomCode: data.roomCode,
        gameId: data._id,
        hasGameId: !!data._id
      });
      
      setActiveGame(data as any);
      setGameStarted(true);
      setTimeRemaining(data.timeLimit);
      setCurrentQuestionIndex(0); // Reset to first question
      questionStartTime.current = Date.now();
    });

    newSocket.on("rapidfire-player-joined", (payload: any) => {
      console.log("👥 Rapid fire player joined:", payload);
      setActiveGame(payload.game);
    });

    // BULLETPROOF: Handle answer submission result
    newSocket.on("answer-submitted", (result: any) => {
      console.log("📝 Answer submitted result:", result);
      setShowResult(true);
      
      // Show result for 2 seconds, then move to next question
      setTimeout(() => {
        setShowResult(false);
        setSelectedAnswer(null);
        setCurrentQuestionIndex(prev => prev + 1);
        questionStartTime.current = Date.now();
      }, 2000);
    });

    newSocket.on("rapidfire-opponent-progress", (progress: any) => {
      console.log("👥 Opponent progress:", progress);
      // Progress is handled via game state updates
    });

    newSocket.on("rapidfire-game-finished", (data: any) => {
      console.log("🏁 Rapid fire game finished:", data);
      setGameFinished(true);
      setGameStarted(false);
      setWinner(data.winner);
      setShowGameEndModal(true);
      setActiveGame(data.finalState);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    });

    newSocket.on("rapidfire-opponent-left", (data: any) => {
      console.log("🚪 Opponent left rapid fire:", data);
      alert(data.message);
    });

    newSocket.on("error", (err: { message: string }) => {
      console.error("❌ Rapid fire socket error:", err);
      alert(err.message);
    });

    return () => {
      console.log('🧹 Cleaning up rapid fire socket');
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocketConnected(false);
      }
    };
  }, [activeGame?._id, user?.id]);

  // Timer effect
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (gameStarted && timeRemaining > 0 && !gameFinished) {
      timerRef.current = window.setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = Math.max(0, prev - 1);
          
          if (newTime <= 0 && socketRef.current && !gameFinished) {
            console.log("⏰ Rapid fire time is up!");
            socketRef.current.emit("rapidfire-game-timeout", activeGame?._id);
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
          }
          
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [gameStarted, timeRemaining, gameFinished, activeGame?._id]);

  // Handle page refresh - persist game state
  useEffect(() => {
    if (activeGame) {
      localStorage.setItem('activeRapidFireGame', activeGame._id);
    } else {
      localStorage.removeItem('activeRapidFireGame');
    }
  }, [activeGame]);

  // Check for existing game on component mount
  useEffect(() => {
    const savedGameId = localStorage.getItem('activeRapidFireGame');
    if (savedGameId && !activeGame && user) {
      console.log('♻️ Restoring game from localStorage:', savedGameId);
      
      const reconnectToGame = async () => {
        try {
          const response = await axios.get(`${API_URL}/rapidfire/game/${savedGameId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          
          if (response.data && response.data.status !== 'finished' && response.data.status !== 'cancelled') {
            console.log('✅ Reconnected to rapid fire game:', response.data);
            setActiveGame(response.data);
            if (response.data.status === 'ongoing') {
              setGameStarted(true);
              // Socket will be set up by the useEffect dependency
            }
          } else {
            localStorage.removeItem('activeRapidFireGame');
          }
        } catch (error) {
          console.error('❌ Failed to reconnect:', error);
          localStorage.removeItem('activeRapidFireGame');
        }
      };
      
      reconnectToGame();
    }
  }, [user]);

  // Memoized handlers
  const handleAnswerSelect = useCallback((optionIndex: number) => {
    if (showResult || selectedAnswer !== null) return;
    
    setSelectedAnswer(optionIndex);
    
    const timeSpent = Math.floor((Date.now() - questionStartTime.current) / 1000);
    const currentQuestion = activeGame?.questionSet[currentQuestionIndex];
    
    console.log("🎯 BULLETPROOF Answer Submit Debug:", {
      hasActiveGame: !!activeGame,
      gameId: activeGame?._id,
      currentQuestionIndex,
      hasCurrentQuestion: !!currentQuestion,
      questionId: currentQuestion?._id,
      optionIndex,
      timeSpent
    });
    
    if (socketRef.current && currentQuestion && activeGame?._id) {
      console.log("📝 Submitting answer:", {
        gameId: activeGame._id,
        questionIndex: currentQuestionIndex, // FIXED: Send questionIndex instead of questionId
        selectedOption: optionIndex,
        timeSpent,
        questionId: currentQuestion._id // For debugging
      });
      
      socketRef.current.emit("submit-rapidfire-answer", {
        gameId: activeGame._id,
        questionIndex: currentQuestionIndex, // FIXED: Backend expects questionIndex
        selectedOption: optionIndex,
        timeSpent
      });
    } else {
      console.error("❌ Cannot submit answer:", {
        hasSocket: !!socketRef.current,
        hasQuestion: !!currentQuestion,
        hasGameId: !!activeGame?._id
      });
    }
  }, [showResult, selectedAnswer, activeGame, currentQuestionIndex]);

  const findRandomMatch = useCallback(async () => {
    if (!user) return;

    setSearchingForMatch(true);
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/rapidfire/random`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      console.log("✅ Random rapid fire match found:", response.data);
      setActiveGame(response.data);
      window.history.pushState({}, '', `/rapidfire/play/${response.data._id}`);
    } catch (error) {
      console.error("❌ Random rapid fire match error:", error);
      alert("Failed to find rapid fire match. Please try again.");
    } finally {
      setLoading(false);
      setSearchingForMatch(false);
    }
  }, [user]);

  const createRoom = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/rapidfire/room`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      console.log("✅ Rapid fire room created:", response.data);
      setActiveGame(response.data);
      window.history.pushState({}, '', `/rapidfire/play/${response.data._id}`);
    } catch (error) {
      console.error("❌ Rapid fire room creation error:", error);
      alert("Failed to create rapid fire room. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const joinRoom = useCallback(async () => {
    if (!user || !roomCode.trim()) return;

    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/rapidfire/room/${roomCode.toUpperCase()}/join`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      console.log("✅ Joined rapid fire room:", response.data);
      setActiveGame(response.data);
      window.history.pushState({}, '', `/rapidfire/play/${response.data._id}`);
    } catch (error) {
      console.error("❌ Rapid fire room join error:", error);
      alert("Failed to join rapid fire room. Please check the room code.");
    } finally {
      setLoading(false);
    }
  }, [user, roomCode]);

  const resetGame = useCallback(() => {
    console.log('🔄 Resetting rapid fire game');

    if (socketRef.current && socketRef.current.connected && activeGame) {
      socketRef.current.emit("leave-rapidfire-game", activeGame._id);
    }
    
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Clear localStorage
    localStorage.removeItem('activeRapidFireGame');

    // Reset all state
    setActiveGame(null);
    setGameFinished(false);
    setGameStarted(false);
    setWinner(null);
    setTimeRemaining(60);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setShowGameEndModal(false);
    setSearchingForMatch(false);

    window.history.pushState({}, '', '/rapidfire');
    window.location.reload();
  }, [activeGame]);

  // Memoized calculations
  const getCurrentPlayer = useMemo(() => {
    if (!activeGame || !user) return null;
    const userId = String(user._id || user.id);
    return activeGame.players.find(p => String(p.user._id) === userId);
  }, [activeGame, user]);

  const getOpponentPlayer = useMemo(() => {
    if (!activeGame || !user) return null;
    const userId = String(user._id || user.id);
    return activeGame.players.find(p => String(p.user._id) !== userId);
  }, [activeGame, user]);

  // Get current question with debug logging
  const currentQuestion = useMemo(() => {
    const question = activeGame?.questionSet[currentQuestionIndex];
    console.log("🎯 Current question debug:", {
      index: currentQuestionIndex,
      totalQuestions: activeGame?.questionSet?.length || 0,
      questionId: question?._id,
      hasOptions: question?.options?.length || 0,
      questionText: question?.question?.substring(0, 50),
      fullQuestion: question
    });
    
    // Additional debugging for the specific issue
    if (activeGame?.questionSet) {
      console.log("📋 Full question set structure:");
      console.log("Array length:", activeGame.questionSet.length);
      console.log("First element type:", typeof activeGame.questionSet[0]);
      console.log("First element:", JSON.stringify(activeGame.questionSet[0], null, 2));
    }
    
    return question;
  }, [activeGame, currentQuestionIndex]);

  if (loading) {
    return <LoadingSpinner />;
  }

  // Show game end modal
  if (showGameEndModal && gameFinished && activeGame) {
    const isWinner = winner === user?.id;
    return (
      <GameEndModal
        isWinner={isWinner}
        winner={winner}
        currentPlayer={getCurrentPlayer}
        opponentPlayer={getOpponentPlayer}
        onClose={resetGame}
      />
    );
  }

  // Main game interface
  if (activeGame && gameStarted && currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative">
        <AnimatedBackground />
        
        <GameStatusCard
          activeGame={activeGame}
          searchingForMatch={searchingForMatch}
          gameStarted={gameStarted}
          socketConnected={socketConnected}
        />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
          {/* Game Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Zap className="h-8 w-8 text-red-500" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Rapid Fire MCQ</h1>
            </div>
            <button
              onClick={resetGame}
              className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Leave Game
            </button>
          </div>

          {/* Score Board */}
          <ScoreBoard
            currentPlayer={getCurrentPlayer}
            opponentPlayer={getOpponentPlayer}
            timeRemaining={timeRemaining}
          />

          {/* Progress Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Question {currentQuestionIndex + 1} of {activeGame.totalQuestions}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {Math.round(((currentQuestionIndex + 1) / activeGame.totalQuestions) * 100)}% Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-red-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / activeGame.totalQuestions) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* MCQ Question */}
          {currentQuestionIndex < activeGame.questionSet.length ? (
            currentQuestion ? (
              <MCQCard
                question={currentQuestion}
                questionNumber={currentQuestionIndex + 1}
                onAnswerSelect={handleAnswerSelect}
                selectedAnswer={selectedAnswer}
                showResult={showResult}
                isCorrect={showResult ? currentQuestion?.options?.[selectedAnswer || 0]?.isCorrect : undefined}
                correctAnswer={showResult ? currentQuestion?.options?.findIndex(opt => opt.isCorrect) : undefined}
              />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center border border-gray-200 dark:border-gray-700">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mx-auto mb-4"></div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Loading Question...</h2>
                <p className="text-gray-600 dark:text-gray-300">Question {currentQuestionIndex + 1} is being prepared</p>
              </div>
            )
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center border border-gray-200 dark:border-gray-700">
              <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">All Questions Completed!</h2>
              <p className="text-gray-600 dark:text-gray-300">Waiting for final results...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Waiting room interface
  if (activeGame && !gameStarted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative">
        <AnimatedBackground />
        
        <GameStatusCard
          activeGame={activeGame}
          searchingForMatch={searchingForMatch}
          gameStarted={gameStarted}
          socketConnected={socketConnected}
        />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center border border-gray-200 dark:border-gray-700">
            <Zap className="h-16 w-16 text-red-500 mx-auto mb-4 animate-pulse" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Rapid Fire Room</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">Room Code: <span className="font-mono font-bold text-red-600 dark:text-red-400">{activeGame.roomId}</span></p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {activeGame.players.map((player) => (
                <div key={player.user._id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Users className="h-6 w-6 text-gray-500 dark:text-gray-400 mr-2" />
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{player.user.username}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Rating: {player.user.ratings.rapidFireRating || 1200}
                  </p>
                </div>
              ))}
              
              {activeGame.players.length === 1 && (
                <div className="p-4 bg-gray-100 dark:bg-gray-600 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-500">
                  <div className="flex items-center justify-center mb-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mr-2"></div>
                    <span className="text-gray-500 dark:text-gray-400">Waiting for opponent...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={resetGame}
                className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Leave Room
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Game lobby interface
  return (
    <div className={`min-h-screen transition-colors duration-300 relative ${
      isDark
        ? "bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900"
        : "bg-gradient-to-br from-gray-50 via-white to-gray-100"
    }`}>
      <AnimatedBackground />
      
      <GameStatusCard
        activeGame={activeGame}
        searchingForMatch={searchingForMatch}
        gameStarted={gameStarted}
        socketConnected={socketConnected}
      />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <Zap className="h-16 w-16 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">Rapid Fire MCQ</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">Answer 10 questions in 60 seconds. Fast thinking wins!</p>
          
          {/* Game Rules */}
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">⚡ Rapid Fire Rules</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-green-500" />
                <span>Correct Answer: <strong>+1 point</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span>Wrong Answer: <strong>-0.5 points</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-blue-500" />
                <span>Time Limit: <strong>60 seconds</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-500" />
                <span>Questions: <strong>3 DSA + 3 System + 2 AI/ML + 2 Aptitude</strong></span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Random Match */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 border border-gray-200 dark:border-gray-700">
            <div className="text-center mb-6">
              <Zap className="h-12 w-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Quick Match</h2>
              <p className="text-gray-600 dark:text-gray-300">Find a random opponent instantly</p>
            </div>

            <button
              onClick={findRandomMatch}
              disabled={loading || searchingForMatch}
              className="w-full bg-red-600 text-white py-3 px-6 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {searchingForMatch ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Searching...
                </div>
              ) : (
                "Find Match"
              )}
            </button>
          </div>

          {/* Room Match */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 border border-gray-200 dark:border-gray-700">
            <div className="text-center mb-6">
              <Users className="h-12 w-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Play with Friends</h2>
              <p className="text-gray-600 dark:text-gray-300">Create or join a private room</p>
            </div>

            <div className="space-y-4">
              <button
                onClick={createRoom}
                disabled={loading}
                className="w-full bg-red-600 text-white py-3 px-6 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors font-semibold"
              >
                Create Room
              </button>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter Room Code"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 font-mono text-center uppercase"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={6}
                />
              </div>

              <button
                onClick={joinRoom}
                disabled={loading || !roomCode.trim()}
                className="w-full bg-gray-600 text-white py-3 px-6 rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors font-semibold"
              >
                Join Room
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(RapidFire);
