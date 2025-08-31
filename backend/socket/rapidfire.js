import RapidFireGame from '../models/RapidFireGame.js';
import MCQQuestion from '../models/MCQQuestion.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

console.log('🔥 BULLETPROOF Rapid Fire socket handlers loading...');

// Store active rapid fire games and their timers
const activeRapidFireGames = new Map();

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
const generateRandomQuestions = async (count = 10) => {
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

export const setupRapidFireSocket = (io) => {
  console.log('🔥 BULLETPROOF: Setting up rapid fire socket handlers...');
  
  io.on('connection', (socket) => {
    handleRapidFireSocket(io, socket);
  });
};

export const handleRapidFireSocket = (io, socket) => {
  console.log('🔥 BULLETPROOF: Setting up rapid fire socket handlers for:', socket.id);

  // BULLETPROOF: Join rapid fire game room
  socket.on('join-rapidfire-game', async (gameId) => {
    try {
      console.log('🎯 BULLETPROOF: User joining rapid fire game:', gameId);

      // STEP 1: Get basic game data (WITHOUT questionSet population)
      const gameData = await RapidFireGame.findById(gameId)
        .populate('players.user', 'username profile.avatar ratings.rapidFireRating')
        .lean();

      if (!gameData) {
        socket.emit('error', { message: 'Rapid fire game not found' });
        return;
      }

      // STEP 2: BULLETPROOF question fetching
      const questions = await fetchQuestionsForGame(gameData.questionSet);
      
      if (questions.length === 0) {
        console.error('❌ BULLETPROOF: No valid questions found for game:', gameId);
        socket.emit('error', { message: 'No questions available for this game' });
        return;
      }

      // STEP 3: Create bulletproof game object
      const bulletproofGame = {
        ...gameData,
        questionSet: questions // ALWAYS populated objects
      };

      // Join the socket room
      socket.join(`rapidfire-${gameId}`);
      socket.rapidFireGameId = gameId;

      console.log('🚀 BULLETPROOF: Sending game state with', questions.length, 'questions');

      // SEND BULLETPROOF DATA
      socket.emit('rapidfire-game-state', bulletproofGame);

      // If 2 players and not started yet, start the game
      if (gameData.players.length === 2 && gameData.status === 'waiting') {
        console.log('🚀 BULLETPROOF: Starting rapid fire game with 2 players');
        
        // Update game status in database
        await RapidFireGame.findByIdAndUpdate(gameId, {
          status: 'ongoing',
          startTime: new Date()
        });

        // BULLETPROOF: Emit game started with fresh questions
        const gameStartedData = {
          ...bulletproofGame,
          status: 'ongoing',
          startTime: new Date(),
          questionSet: questions // ALWAYS populated
        };

        console.log('🚀 BULLETPROOF: Emitting game-started with', questions.length, 'questions');
        
        io.to(`rapidfire-${gameId}`).emit('rapidfire-game-started', gameStartedData);

        // Start game timer (timeLimit is already in seconds)
        const timer = setTimeout(async () => {
          console.log('⏰ BULLETPROOF: Game timer expired, ending game');
          await endRapidFireGame(gameId, io);
        }, gameData.timeLimit * 1000); // Convert seconds to milliseconds

        activeRapidFireGames.set(gameId, { 
          timer,
          startTime: new Date(),
          questions: questions // Store questions in memory
        });
      }

    } catch (error) {
      console.error('❌ BULLETPROOF: Error in join-rapidfire-game:', error);
      socket.emit('error', { message: 'Failed to join rapid fire game' });
    }
  });

  // BULLETPROOF: Leave rapid fire game
  socket.on('leave-rapidfire-game', async (gameId) => {
    try {
      console.log('🚪 BULLETPROOF: User leaving rapid fire game:', gameId, 'Socket:', socket.id);

      if (!gameId) {
        console.warn('⚠️ No gameId provided for leave-rapidfire-game');
        return;
      }

      // Leave the socket room
      socket.leave(`rapidfire-${gameId}`);
      socket.rapidFireGameId = null;

      // Find and update the game to remove this player
      const game = await RapidFireGame.findById(gameId);
      if (game && socket.userId) {
        // Remove player from the game
        game.players = game.players.filter(player => 
          player.user.toString() !== socket.userId.toString()
        );

        // If no players left, mark game as abandoned
        if (game.players.length === 0) {
          game.status = 'abandoned';
          console.log('🏁 BULLETPROOF: Game abandoned - no players left');
        }

        await game.save();

        // Notify remaining players
        socket.to(`rapidfire-${gameId}`).emit('player-left', {
          playerId: socket.userId,
          totalPlayers: game.players.length,
          gameStatus: game.status
        });

        console.log('✅ BULLETPROOF: Player removed from game, remaining players:', game.players.length);
      }

    } catch (error) {
      console.error('❌ BULLETPROOF: Error in leave-rapidfire-game:', error);
    }
  });

  // BULLETPROOF: Submit answer
  socket.on('submit-rapidfire-answer', async (data) => {
    try {
      const { gameId, questionIndex, selectedOption } = data;
      console.log('📝 BULLETPROOF: Answer submitted:', { gameId, questionIndex, selectedOption });

      const game = await RapidFireGame.findById(gameId);
      if (!game || game.status !== 'ongoing') {
        socket.emit('error', { message: 'Game not found or not ongoing' });
        return;
      }

      // CRITICAL FIX: Check if player has already answered this question
      const playerIndex = game.players.findIndex(p => p.user.toString() === socket.userId);
      if (playerIndex !== -1) {
        // Count how many answers this player has for ANY question
        const playerAnswerCount = game.players[playerIndex].answers.length;
        
        // If they already have an answer for this question index, block it
        if (playerAnswerCount > questionIndex) {
          console.log('⚠️ BULLETPROOF: Player already answered this question (count-based check)', {
            playerId: socket.userId,
            questionIndex,
            playerAnswerCount,
            shouldHaveAnswers: questionIndex
          });
          return;
        }
      }

      // Get questions from memory or database
      let questions = activeRapidFireGames.get(gameId)?.questions;
      if (!questions) {
        questions = await fetchQuestionsForGame(game.questionSet);
      }

      if (!questions[questionIndex]) {
        socket.emit('error', { message: 'Question not found' });
        return;
      }

      const question = questions[questionIndex];
      const isCorrect = question.options[selectedOption]?.isCorrect || false;

      // Update player score with proper negative marking
      if (playerIndex !== -1) {
        if (isCorrect) {
          game.players[playerIndex].score += 1;
          game.players[playerIndex].correctAnswers = (game.players[playerIndex].correctAnswers || 0) + 1;
        } else {
          game.players[playerIndex].score -= 0.5; // NEGATIVE MARKING
          game.players[playerIndex].wrongAnswers = (game.players[playerIndex].wrongAnswers || 0) + 1;
        }
        game.players[playerIndex].questionsAnswered = (game.players[playerIndex].questionsAnswered || 0) + 1;
        
        game.players[playerIndex].answers.push({
          questionId: questions[questionIndex]._id, // Store the actual question ObjectId
          selectedOption,
          isCorrect,
          answeredAt: new Date()
        });

        console.log('🔍 BULLETPROOF: Storing answer with simplified data:', {
          questionIndex: questionIndex,
          storedAnswer: {
            questionId: questions[questionIndex]._id,
            selectedOption,
            isCorrect
          },
          playerAnswerCountAfter: game.players[playerIndex].answers.length
        });

        try {
          await game.save();
          console.log('✅ BULLETPROOF: Game saved successfully');
        } catch (saveError) {
          console.error('❌ BULLETPROOF: Error saving game:', saveError);
          return;
        }

        // Refresh the game from database to ensure we have the latest data
        const savedGame = await RapidFireGame.findById(gameId);
        
        console.log('🔍 BULLETPROOF: After save, player answers (simplified):', {
          playerId: socket.userId,
          playerIndex,
          totalAnswersStored: savedGame.players[playerIndex].answers.length,
          expectedForCurrentQ: questionIndex + 1,
          shouldAdvance: savedGame.players.every(p => p.answers.length > questionIndex),
          lastAnswer: savedGame.players[playerIndex].answers[savedGame.players[playerIndex].answers.length - 1]
        });

        // BULLETPROOF: Emit comprehensive game state update to ALL players
        const gameStateUpdate = {
          gameId: gameId,
          questionIndex: questionIndex,
          players: game.players.map(player => ({
            userId: player.user.toString(),
            username: player.usernameSnapshot,
            score: player.score,
            correctAnswers: player.correctAnswers || 0,
            wrongAnswers: player.wrongAnswers || 0,
            questionsAnswered: player.questionsAnswered || 0
          })),
          answerResult: {
            playerId: socket.userId,
            isCorrect,
            correctAnswer: question.options.findIndex(opt => opt.isCorrect)
          }
        };

        console.log('🔄 BULLETPROOF: Broadcasting complete game state update:', gameStateUpdate);
        
        // Send to ALL players in the game room
        io.to(`rapidfire-${gameId}`).emit('rapidfire-game-state-update', gameStateUpdate);

        // Also emit the individual answer result for backward compatibility
        io.to(`rapidfire-${gameId}`).emit('answer-submitted', {
          playerId: socket.userId,
          questionIndex,
          isCorrect,
          newScore: game.players[playerIndex].score,
          correctAnswers: game.players[playerIndex].correctAnswers,
          wrongAnswers: game.players[playerIndex].wrongAnswers,
          questionsAnswered: game.players[playerIndex].questionsAnswered,
          correctAnswer: question.options.findIndex(opt => opt.isCorrect)
        });

        // BULLETPROOF: Check if game should end or advance to next question
        const allPlayersFinished = savedGame.players.every(p => p.questionsAnswered >= savedGame.totalQuestions);
        
        // Check if both players have answered the current question (count-based approach)
        const currentQuestionAnswered = savedGame.players.length >= 2 && 
          savedGame.players.every(p => p.answers.length > questionIndex);
        
        console.log('🔍 BULLETPROOF: Game advancement check (count-based):', {
          allPlayersFinished,
          currentQuestionAnswered,
          questionIndex,
          playersCount: savedGame.players.length,
          player1Questions: savedGame.players[0]?.questionsAnswered,
          player2Questions: savedGame.players[1]?.questionsAnswered,
          totalQuestions: savedGame.totalQuestions,
          player1AnswerCount: savedGame.players[0]?.answers.length || 0,
          player2AnswerCount: savedGame.players[1]?.answers.length || 0,
          expectedAnswerCount: questionIndex + 1
        });
        
        if (allPlayersFinished) {
          console.log('🏁 BULLETPROOF: All players finished, ending game immediately');
          // Clear timer
          const gameTimer = activeRapidFireGames.get(gameId);
          if (gameTimer?.timer) {
            clearTimeout(gameTimer.timer);
          }
          await endRapidFireGame(gameId, io);
        } else if (currentQuestionAnswered && questionIndex + 1 < savedGame.totalQuestions) {
          // Both players answered current question, advance to next question
          console.log('➡️ BULLETPROOF: Both players answered current question, advancing to next question');
          
          setTimeout(() => {
            const gameData = activeRapidFireGames.get(gameId);
            if (gameData?.questions) {
              console.log('🚀 BULLETPROOF: Emitting next question advancement to all players');
              io.to(`rapidfire-${gameId}`).emit('rapidfire-next-question', {
                questionIndex: questionIndex + 1,
                question: gameData.questions[questionIndex + 1]
              });
            }
          }, 2000); // 2 second delay to show results
        } else if (currentQuestionAnswered && questionIndex + 1 >= game.totalQuestions) {
          // Both players completed all questions
          console.log('🏁 BULLETPROOF: All questions completed, ending game');
          setTimeout(async () => {
            await endRapidFireGame(gameId, io);
          }, 2000);
        } else {
          console.log('⏳ BULLETPROOF: Waiting for other player to answer question', questionIndex);
        }
      }

    } catch (error) {
      console.error('❌ BULLETPROOF: Error submitting answer:', error);
      socket.emit('error', { message: 'Failed to submit answer' });
    }
  });

  // BULLETPROOF: Handle game timeout from frontend
  socket.on('rapidfire-game-timeout', async (gameId) => {
    try {
      console.log('⏰ BULLETPROOF: Game timeout received from frontend:', gameId);
      await endRapidFireGame(gameId, io);
    } catch (error) {
      console.error('❌ BULLETPROOF: Error handling game timeout:', error);
    }
  });

  // BULLETPROOF: Handle disconnection
  socket.on('disconnect', () => {
    if (socket.rapidFireGameId) {
      console.log('🔌 BULLETPROOF: User disconnected from rapid fire game:', socket.rapidFireGameId);
      socket.to(`rapidfire-${socket.rapidFireGameId}`).emit('player-disconnected', {
        playerId: socket.userId
      });
    }
  });
};

// BULLETPROOF: Calculate Elo rating changes (like Chess.com)
const calculateEloRatingChange = (playerRating, opponentRating, result, kFactor = 32) => {
  // result: 1 for win, 0 for loss, 0.5 for draw
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const ratingChange = Math.round(kFactor * (result - expectedScore));
  return ratingChange;
};

// BULLETPROOF: End game function with Chess.com style Elo rating
const endRapidFireGame = async (gameId, io) => {
  try {
    console.log('🏁 BULLETPROOF: Ending rapid fire game:', gameId);

    const game = await RapidFireGame.findById(gameId)
      .populate('players.user', 'username profile.avatar ratings.rapidFireRating');

    if (!game) return;

    // Update game status
    game.status = 'finished'; // Change to 'finished' to match schema
    game.endTime = new Date();

    // Calculate final scores and ranks
    const sortedPlayers = game.players.sort((a, b) => b.score - a.score);
    
    // BULLETPROOF: Set game result and winner properly
    const isDraw = sortedPlayers.length >= 2 && sortedPlayers[0].score === sortedPlayers[1].score;
    
    if (isDraw) {
      game.result = 'draw';
      game.winner = null; // No winner in case of draw
    } else {
      game.result = 'win';
      game.winner = sortedPlayers[0].user._id; // Set the winner
    }
    
    console.log('🎯 Game result set:', {
      result: game.result,
      winner: game.winner,
      isDraw,
      scores: sortedPlayers.map(p => ({ user: p.user.username, score: p.score }))
    });
    
    // BULLETPROOF: Chess.com style Elo rating calculation
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
        
        // Add to rapid fire history
        if (!Array.isArray(player1User.rapidFireHistory)) {
          player1User.rapidFireHistory = [];
        }
        player1User.rapidFireHistory.push({
          opponent: player2.user._id,
          result: isDraw ? 'draw' : 'win',
          ratingChange: player1Change,
          score: player1.score,
          correctAnswers: player1.correctAnswers,
          wrongAnswers: player1.wrongAnswers,
          totalQuestions: game.totalQuestions,
          date: new Date()
        });
        
        await player1User.save();
        
        player1.ratingChange = player1Change;
        player1.newRating = newRating;
        player1.oldRating = player1OldRating;
        player1.ratingAfter = newRating;
        
        ratingUpdates.push({
          userId: player1.user._id,
          username: player1.user.username,
          oldRating: player1OldRating,
          newRating: newRating,
          change: player1Change,
          result: isDraw ? 'draw' : 'win'
        });
      }
      
      if (player2User) {
        const newRating = Math.max(100, player2OldRating + player2Change);
        player2User.ratings.rapidFireRating = newRating;
        
        // Add to rapid fire history
        if (!Array.isArray(player2User.rapidFireHistory)) {
          player2User.rapidFireHistory = [];
        }
        player2User.rapidFireHistory.push({
          opponent: player1.user._id,
          result: isDraw ? 'draw' : 'loss',
          ratingChange: player2Change,
          score: player2.score,
          correctAnswers: player2.correctAnswers,
          wrongAnswers: player2.wrongAnswers,
          totalQuestions: game.totalQuestions,
          date: new Date()
        });
        
        await player2User.save();
        
        player2.ratingChange = player2Change;
        player2.newRating = newRating;
        player2.oldRating = player2OldRating;
        player2.ratingAfter = newRating;
        
        ratingUpdates.push({
          userId: player2.user._id,
          username: player2.user.username,
          oldRating: player2OldRating,
          newRating: newRating,
          change: player2Change,
          result: isDraw ? 'draw' : 'loss'
        });
      }
    }

    await game.save();

    console.log('🎯 BULLETPROOF: Rating updates:', ratingUpdates);

    // Emit game results with rating changes
    io.to(`rapidfire-${gameId}`).emit('rapidfire-game-ended', {
      gameId,
      results: sortedPlayers.map((p, index) => ({
        userId: p.user._id,
        username: p.user.username,
        avatar: p.user.profile?.avatar,
        score: p.score,
        rank: p.rank,
        oldRating: p.oldRating,
        newRating: p.newRating,
        ratingChange: p.ratingChange,
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
    activeRapidFireGames.delete(gameId);

    console.log('✅ BULLETPROOF: Rapid fire game ended successfully with Elo ratings');

  } catch (error) {
    console.error('❌ BULLETPROOF: Error ending rapid fire game:', error);
  }
};
