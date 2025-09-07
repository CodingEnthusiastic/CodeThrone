import RapidFireGame from '../models/RapidFireGame.js';
import MCQQuestion from '../models/MCQQuestion.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

console.log('🔥 BULLETPROOF Rapid Fire socket handlers loading...');

// Store active rapid fire games and their timers
const activeRapidFireGames = new Map();
const GAME_DURATION = 120; // 120 seconds
const TOTAL_QUESTIONS = 10;

// BULLETPROOF helper function to fetch questions independently
const fetchQuestionsForGame = async (questionIds) => {
  try {
    console.log('🔥 BULLETPROOF: Fetching questions for IDs:', questionIds.map(id => id.toString()));
    
    const questions = await MCQQuestion.find({ 
      _id: { $in: questionIds }
    }).lean();
    
    console.log('✅ BULLETPROOF: Questions fetched:', questions.length);
    
    // Validate each question
    const validQuestions = questions.filter(q => 
      q && q.question && q.options && Array.isArray(q.options) && q.options.length >= 4
    );
    
    console.log('✅ BULLETPROOF: Valid questions:', validQuestions.length);
    
    return validQuestions;
  } catch (error) {
    console.error('❌ BULLETPROOF: Error fetching questions:', error);
    return [];
  }
};

// BULLETPROOF: Smart random question generator with unique selection
const generateRandomQuestions = async (count = TOTAL_QUESTIONS) => {
  try {
    console.log('🎲 BULLETPROOF: Generating random questions, count:', count);
    
    // Get all available MCQ questions
    const allQuestions = await MCQQuestion.find({ domain: 'dsa' }).lean();
    console.log('📚 Available questions in database:', allQuestions.length);
    
    if (allQuestions.length < count) {
      console.warn('⚠️ Not enough questions in database, using all available');
      return allQuestions.slice(0, count);
    }
    
    // Shuffle and select unique questions
    const shuffled = allQuestions.sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffled.slice(0, count);
    
    console.log('✅ BULLETPROOF: Selected random questions:', selectedQuestions.length);
    return selectedQuestions;
  } catch (error) {
    console.error('❌ BULLETPROOF: Error generating random questions:', error);
    return [];
  }
};

// BULLETPROOF: Calculate Elo rating changes (like Chess.com)
const calculateEloRatingChange = (playerRating, opponentRating, result, kFactor = 32) => {
  // result: 1 for win, 0 for loss, 0.5 for draw
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const ratingChange = Math.round(kFactor * (result - expectedScore));
  return ratingChange;
};

// BULLETPROOF: End game function
const endRapidFireGame = async (gameId, io) => {
  try {
    console.log('🏁 BULLETPROOF: Ending rapid fire game:', gameId);

    const game = await RapidFireGame.findById(gameId)
      .populate('players.user', 'username profile.avatar ratings.rapidFireRating');

    if (!game) {
      console.error('❌ Game not found for ending:', gameId);
      return;
    }

    // Mark game as finished
    game.status = 'finished';
    game.endTime = new Date();

    // Sort players by score
    const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score);
    
    // Determine winner
    if (sortedPlayers.length >= 2) {
      const topScore = sortedPlayers[0].score;
      const winners = sortedPlayers.filter(p => p.score === topScore);
      
      if (winners.length === 1) {
        game.winner = winners[0].user._id;
        game.result = 'winner';
      } else {
        game.result = 'draw';
      }
    }

    // Calculate rating changes
    const ratingUpdates = [];
    
    if (sortedPlayers.length === 2) {
      const [player1, player2] = sortedPlayers;
      
      // Handle tie case
      const isDraw = player1.score === player2.score;
      
      // Assign ranks
      player1.rank = 1;
      player2.rank = isDraw ? 1 : 2;
      
      const player1OldRating = player1.user.ratings?.rapidFireRating || 1200;
      const player2OldRating = player2.user.ratings?.rapidFireRating || 1200;
      
      // Store old ratings in game
      player1.ratingBefore = player1OldRating;
      player2.ratingBefore = player2OldRating;
      
      // Calculate rating changes
      const player1Change = calculateEloRatingChange(
        player1OldRating, 
        player2OldRating, 
        isDraw ? 0.5 : 1,
        32 // K-factor for rapid fire
      );
      const player2Change = calculateEloRatingChange(
        player2OldRating, 
        player1OldRating, 
        isDraw ? 0.5 : 0,
        32
      );
      
      // Update ratings in database
      const player1User = await User.findById(player1.user._id);
      const player2User = await User.findById(player2.user._id);
      
      if (player1User) {
        const newRating = Math.max(100, player1OldRating + player1Change);
        player1User.ratings.rapidFireRating = newRating;
        player1.ratingAfter = newRating;
        player1.ratingChange = player1Change;
        await player1User.save();
        
        ratingUpdates.push({
          userId: player1.user._id,
          oldRating: player1OldRating,
          newRating: newRating,
          change: player1Change
        });
      }
      
      if (player2User) {
        const newRating = Math.max(100, player2OldRating + player2Change);
        player2User.ratings.rapidFireRating = newRating;
        player2.ratingAfter = newRating;
        player2.ratingChange = player2Change;
        await player2User.save();
        
        ratingUpdates.push({
          userId: player2.user._id,
          oldRating: player2OldRating,
          newRating: newRating,
          change: player2Change
        });
      }

      console.log('🏆 BULLETPROOF: Rating changes applied:', ratingUpdates);
    }

    await game.save();

    // Emit game finished event
    io.to(`rapidfire-${gameId}`).emit('rapidfire-game-finished', {
      gameId,
      result: game.result,
      winner: game.winner,
      finalScores: sortedPlayers.map(p => ({
        userId: p.user._id,
        username: p.user.username,
        score: p.score,
        correctAnswers: p.correctAnswers,
        wrongAnswers: p.wrongAnswers,
        questionsAnswered: p.questionsAnswered,
        result: p.rank === 1 ? (isDraw ? 'draw' : 'win') : 'loss'
      })),
      ratingUpdates,
      gameDetails: {
        totalQuestions: game.totalQuestions,
        duration: game.timeLimit,
        gameResult: game.result,
        winner: game.winner
      }
    });

    // Clean up active game
    const activeGame = activeRapidFireGames.get(gameId);
    if (activeGame?.timer) {
      clearTimeout(activeGame.timer);
    }
    if (activeGame?.updateTimer) {
      clearInterval(activeGame.updateTimer);
    }
    activeRapidFireGames.delete(gameId);

    console.log('✅ BULLETPROOF: Rapid fire game ended successfully with Elo ratings');

  } catch (error) {
    console.error('❌ BULLETPROOF: Error ending rapid fire game:', error);
  }
};

const setupRapidFireSocket = (io) => {
  console.log('🔥 BULLETPROOF: Setting up rapid fire socket handlers...');
  
  // CRITICAL FIX: Add authentication middleware for RapidFire sockets
  const authenticateSocket = (socket, next) => {
    try {
      const { token, userId } = socket.handshake.auth;
      console.log("🔐 RapidFire Socket auth attempt:", { userId, hasToken: !!token });

      if (!token || !userId) {
        console.log("❌ Missing auth credentials for RapidFire socket");
        return next(new Error("Authentication required"));
      }

      // ✅ CRITICAL FIX: Verify the JWT token and get user data
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("✅ RapidFire JWT verified for user:", decoded.userId);
        
        // Validate that the userId matches the token
        if (decoded.userId !== userId) {
          console.error("❌ RapidFire User ID mismatch in token");
          return next(new Error("Invalid authentication"));
        }

        // Store user info in socket for easy access
        socket.userId = userId;
        socket.userInfo = decoded;

      } catch (jwtError) {
        console.error("❌ RapidFire JWT verification failed:", jwtError);
        return next(new Error("Invalid token"));
      }
      
      console.log("✅ RapidFire Socket authenticated for user:", userId, "Socket ID:", socket.id);
      next();
    } catch (error) {
      console.error("❌ RapidFire Socket auth error:", error);
      next(new Error("Authentication failed"));
    }
  };

  // Apply authentication middleware
  io.use(authenticateSocket);
  
  io.on('connection', (socket) => {
    console.log("🔌 User connected to RapidFire socket:", socket.id, "User:", socket.userId);

    // BULLETPROOF: Join rapid fire game room
    socket.on('join-rapidfire-game', async (gameId) => {
      try {
        console.log('🎯 BULLETPROOF: User joining rapid fire game:', gameId);

        // Get basic game data (WITHOUT questionSet population)
        const gameData = await RapidFireGame.findById(gameId)
          .populate('players.user', 'username profile.avatar ratings.rapidFireRating')
          .lean();

        if (!gameData) {
          socket.emit('error', { message: 'Rapid fire game not found' });
          return;
        }

        // Fetch questions
        const questions = await fetchQuestionsForGame(gameData.questionSet);
        
        if (questions.length === 0) {
          console.error('❌ BULLETPROOF: No valid questions found for game:', gameId);
          socket.emit('error', { message: 'No questions available for this game' });
          return;
        }

        console.log('✅ BULLETPROOF: Questions loaded for game:', questions.length);

        // Join game room
        socket.join(`rapidfire-${gameId}`);
        socket.rapidFireGameId = gameId;

        console.log('🔗 BULLETPROOF: User joined rapid fire room:', `rapidfire-${gameId}`);

        // Store questions in memory for this game session
        activeRapidFireGames.set(gameId, {
          questions: questions,
          gameData: gameData,
          startTime: new Date(),
          timer: null
        });

        // Send initial game state to the connecting user
        socket.emit('rapidfire-game-state', {
          ...gameData,
          questionSet: questions
        });

        console.log('✅ BULLETPROOF: Rapid fire game state sent to user');

        // If 2 players and game should start, start the 120-second timer
        if (gameData.players.length === 2 && gameData.status === 'waiting') {
          console.log('🚀 BULLETPROOF: Starting rapid fire game with 2 players - 120 second timer');
          
          // Update game status in database
          await RapidFireGame.findByIdAndUpdate(gameId, {
            status: 'ongoing',
            startTime: new Date()
          });

          // Start 120-second game timer
          const gameTimer = setTimeout(async () => {
            console.log(`⏰ BULLETPROOF: 120-second timer expired, ending game`);
            await endRapidFireGame(gameId, io);
          }, GAME_DURATION * 1000);
          
          // Store game state with timer
          activeRapidFireGames.set(gameId, {
            timer: gameTimer,
            startTime: new Date(),
            questions: questions,
            duration: GAME_DURATION,
            totalQuestions: TOTAL_QUESTIONS
          });

          // Emit game started event to all players
          io.to(`rapidfire-${gameId}`).emit('rapidfire-game-started', {
            ...gameData,
            questionSet: questions,
            status: 'ongoing',
            startTime: new Date(),
            duration: GAME_DURATION,
            totalQuestions: TOTAL_QUESTIONS
          });

          // Start periodic timer updates (every 5 seconds)
          const updateTimer = setInterval(() => {
            const gameState = activeRapidFireGames.get(gameId);
            if (gameState) {
              const elapsed = Math.floor((Date.now() - gameState.startTime.getTime()) / 1000);
              const remaining = Math.max(0, GAME_DURATION - elapsed);
              
              if (remaining > 0) {
                io.to(`rapidfire-${gameId}`).emit('rapidfire-live-update', { 
                  gameId: gameId,
                  timeRemaining: remaining 
                });
              } else {
                clearInterval(updateTimer);
              }
            } else {
              clearInterval(updateTimer);
            }
          }, 5000);
          
          // Store update timer reference
          const gameState = activeRapidFireGames.get(gameId);
          if (gameState) {
            gameState.updateTimer = updateTimer;
            activeRapidFireGames.set(gameId, gameState);
          }
        }

      } catch (error) {
        console.error('❌ BULLETPROOF: Error in join-rapidfire-game:', error);
        socket.emit('error', { message: 'Failed to join rapid fire game' });
      }
    });

    // BULLETPROOF: Submit answer - Independent user states
    socket.on('submit-rapidfire-answer', async (data) => {
      try {
        const { gameId, questionIndex, selectedOption } = data;
        console.log('📝 BULLETPROOF: Answer submitted:', { gameId, questionIndex, selectedOption, userId: socket.userId });

        const game = await RapidFireGame.findById(gameId);
        if (!game || game.status !== 'ongoing') {
          socket.emit('error', { message: 'Game not found or not ongoing' });
          return;
        }

        // Check if game timer has expired
        const gameState = activeRapidFireGames.get(gameId);
        if (!gameState) {
          socket.emit('error', { message: 'Game session not active' });
          return;
        }

        const elapsed = Math.floor((Date.now() - gameState.startTime.getTime()) / 1000);
        if (elapsed >= GAME_DURATION) {
          socket.emit('error', { message: 'Game time has expired' });
          return;
        }

        // Find player
        const playerIndex = game.players.findIndex(p => p.user.toString() === socket.userId);
        if (playerIndex === -1) {
          socket.emit('error', { message: 'Player not found in game' });
          return;
        }

        // Check if player has already answered this question
        const player = game.players[playerIndex];
        const alreadyAnswered = player.answers.some(answer => answer.questionIndex === questionIndex);
        
        if (alreadyAnswered) {
          console.log('⚠️ BULLETPROOF: Player already answered this question');
          socket.emit('error', { message: 'Already answered this question' });
          return;
        }

        // Get questions from memory
        let questions = gameState.questions;
        if (!questions || !questions[questionIndex]) {
          socket.emit('error', { message: 'Question not found' });
          return;
        }

        const question = questions[questionIndex];
        const isCorrect = question.options[selectedOption]?.isCorrect || false;

        // Update player score with proper negative marking
        if (isCorrect) {
          player.score += 1;
          player.correctAnswers = (player.correctAnswers || 0) + 1;
        } else {
          player.score -= 0.25; // NEGATIVE MARKING (-0.25 for wrong answer)
          player.wrongAnswers = (player.wrongAnswers || 0) + 1;
        }
        
        player.questionsAnswered = (player.questionsAnswered || 0) + 1;
        
        // Store answer with question index for independent tracking
        player.answers.push({
          questionId: question._id,
          questionIndex: questionIndex,
          selectedOption,
          isCorrect,
          answeredAt: new Date()
        });

        console.log('🔍 BULLETPROOF: Updated player stats:', {
          playerId: socket.userId,
          score: player.score,
          correctAnswers: player.correctAnswers,
          wrongAnswers: player.wrongAnswers,
          questionsAnswered: player.questionsAnswered
        });

        await game.save();

        // Emit live game state update to ALL players
        const gameStateUpdate = {
          gameId: gameId,
          players: game.players.map(p => ({
            userId: p.user.toString(),
            score: p.score,
            correctAnswers: p.correctAnswers || 0,
            wrongAnswers: p.wrongAnswers || 0,
            questionsAnswered: p.questionsAnswered || 0
          })),
          currentQuestion: questionIndex,
          timeRemaining: Math.max(0, GAME_DURATION - elapsed)
        };

        // Send to ALL players in the game room
        io.to(`rapidfire-${gameId}`).emit('rapidfire-live-update', gameStateUpdate);

        // Send answer result to the specific player
        socket.emit('answer-result', {
          questionIndex,
          isCorrect,
          correctAnswer: question.options.findIndex(opt => opt.isCorrect),
          explanation: question.explanation,
          newScore: player.score
        });

        // Auto-advance to next question after a short delay (2.5 seconds)
        // But only if the player hasn't reached the total questions limit
        if (player.questionsAnswered < TOTAL_QUESTIONS) {
          setTimeout(() => {
            const nextQuestionIndex = questionIndex + 1;
            if (nextQuestionIndex < TOTAL_QUESTIONS && gameState && gameState.questions[nextQuestionIndex]) {
              // Emit next question to the specific player who answered
              socket.emit('rapidfire-next-question', {
                questionIndex: nextQuestionIndex,
                question: gameState.questions[nextQuestionIndex],
                timeRemaining: Math.max(0, GAME_DURATION - Math.floor((Date.now() - gameState.startTime.getTime()) / 1000))
              });
              console.log(`🚀 BULLETPROOF: Sending next question ${nextQuestionIndex} to player ${socket.userId}`);
            }
          }, 2500); // 2.5 second delay to show result
        }

        // Check if both players have completed all questions
        const allPlayersFinished = game.players.every(p => p.questionsAnswered >= TOTAL_QUESTIONS);
        
        if (allPlayersFinished) {
          console.log('🏁 BULLETPROOF: All players finished, ending game immediately');
          // Clear timer
          if (gameState.timer) {
            clearTimeout(gameState.timer);
          }
          if (gameState.updateTimer) {
            clearInterval(gameState.updateTimer);
          }
          await endRapidFireGame(gameId, io);
        }

      } catch (error) {
        console.error('❌ BULLETPROOF: Error in submit-rapidfire-answer:', error);
        socket.emit('error', { message: 'Failed to submit answer' });
      }
    });

    // BULLETPROOF: Skip question handler
    socket.on('skip-rapidfire-question', async (data) => {
      try {
        const { gameId, questionIndex } = data;
        console.log('⏭️ BULLETPROOF: Question skipped:', { gameId, questionIndex, userId: socket.userId });

        const game = await RapidFireGame.findById(gameId);
        if (!game || game.status !== 'ongoing') {
          socket.emit('error', { message: 'Game not found or not ongoing' });
          return;
        }

        // Check if game timer has expired
        const gameState = activeRapidFireGames.get(gameId);
        if (!gameState) {
          socket.emit('error', { message: 'Game session not active' });
          return;
        }

        const elapsed = Math.floor((Date.now() - gameState.startTime.getTime()) / 1000);
        if (elapsed >= GAME_DURATION) {
          socket.emit('error', { message: 'Game time has expired' });
          return;
        }

        // Find player
        const playerIndex = game.players.findIndex(p => p.user.toString() === socket.userId);
        if (playerIndex === -1) {
          socket.emit('error', { message: 'Player not found in game' });
          return;
        }

        const player = game.players[playerIndex];
        
        // Check if player has already answered/skipped this question
        const alreadyProcessed = player.answers.some(answer => answer.questionIndex === questionIndex);
        
        if (alreadyProcessed) {
          console.log('⚠️ BULLETPROOF: Player already processed this question');
          socket.emit('error', { message: 'Question already answered or skipped' });
          return;
        }

        // Record the skip (no score change, but question counts as processed)
        player.answers.push({
          questionId: gameState.questions[questionIndex]._id,
          questionIndex: questionIndex,
          selectedOption: -1, // Special value for skip
          isCorrect: false,
          isSkipped: true,
          answeredAt: new Date()
        });

        // Increment questions answered count but no score change
        player.questionsAnswered = (player.questionsAnswered || 0) + 1;

        console.log('⏭️ BULLETPROOF: Question skipped, no score change:', {
          playerId: socket.userId,
          questionIndex,
          questionsAnswered: player.questionsAnswered
        });

        await game.save();

        // Emit live game state update to ALL players
        const gameStateUpdate = {
          gameId: gameId,
          players: game.players.map(p => ({
            userId: p.user.toString(),
            score: p.score,
            correctAnswers: p.correctAnswers || 0,
            wrongAnswers: p.wrongAnswers || 0,
            questionsAnswered: p.questionsAnswered || 0
          })),
          currentQuestion: questionIndex,
          timeRemaining: Math.max(0, GAME_DURATION - elapsed)
        };

        // Send to ALL players in the game room
        io.to(`rapidfire-${gameId}`).emit('rapidfire-live-update', gameStateUpdate);

        // Send skip confirmation to the specific player
        socket.emit('question-skipped', {
          questionIndex,
          newScore: player.score
        });

        // Auto-advance to next question after a short delay (1.5 seconds)
        // But only if the player hasn't reached the total questions limit
        if (player.questionsAnswered < TOTAL_QUESTIONS) {
          setTimeout(() => {
            const nextQuestionIndex = questionIndex + 1;
            if (nextQuestionIndex < TOTAL_QUESTIONS && gameState && gameState.questions[nextQuestionIndex]) {
              // Emit next question to the specific player who skipped
              socket.emit('rapidfire-next-question', {
                questionIndex: nextQuestionIndex,
                question: gameState.questions[nextQuestionIndex],
                timeRemaining: Math.max(0, GAME_DURATION - Math.floor((Date.now() - gameState.startTime.getTime()) / 1000))
              });
              console.log(`🚀 BULLETPROOF: Sending next question ${nextQuestionIndex} to player ${socket.userId} after skip`);
            }
          }, 1500); // 1.5 second delay for skip
        }

        // Check if both players have completed all questions
        const allPlayersFinished = game.players.every(p => p.questionsAnswered >= TOTAL_QUESTIONS);
        
        if (allPlayersFinished) {
          console.log('🏁 BULLETPROOF: All players finished, ending game immediately');
          // Clear timer
          if (gameState.timer) {
            clearTimeout(gameState.timer);
          }
          if (gameState.updateTimer) {
            clearInterval(gameState.updateTimer);
          }
          await endRapidFireGame(gameId, io);
        }

      } catch (error) {
        console.error('❌ BULLETPROOF: Error in skip-rapidfire-question:', error);
        socket.emit('error', { message: 'Failed to skip question' });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log("🔌 RapidFire User disconnected:", socket.id, "Reason:", reason, "User:", socket.userId);
    });
  });
};

export { setupRapidFireSocket };
