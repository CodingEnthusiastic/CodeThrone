import RapidFireGame from '../models/RapidFireGame.js';
import MCQQuestion from '../models/MCQQuestion.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

console.log('🔥 Loading Rapid Fire socket handlers...');

// Utility function to calculate ELO rating change
const calculateEloChange = (playerRating, opponentRating, result, kFactor = 32) => {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const actualScore = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
  return Math.round(kFactor * (actualScore - expectedScore));
};

// Store active rapid fire games and their timers
const activeRapidFireGames = new Map();

export const handleRapidFireSocket = (io, socket) => {
  console.log('🔥 Setting up rapid fire socket handlers for:', socket.id);

  // Join rapid fire game room
  socket.on('join-rapidfire-game', async (gameId) => {
    try {
      console.log('🎯 User joining rapid fire game:', gameId, 'Socket:', socket.id);

      const game = await RapidFireGame.findById(gameId)
        .populate('players.user', 'username profile.avatar ratings.rapidFireRating');

      if (!game) {
        socket.emit('error', { message: 'Rapid fire game not found' });
        return;
      }

      // Join the socket room
      socket.join(`rapidfire-${gameId}`);
      socket.rapidFireGameId = gameId;

      console.log('✅ Joined rapid fire game room:', gameId);

      // Send current game state with detailed logging
      console.log('📊 Sending game state - Questions:', game.questionSet?.length || 0, 'Total:', game.totalQuestions);
      console.log('🔍 Raw game.questionSet type check:', {
        isArray: Array.isArray(game.questionSet),
        length: game.questionSet?.length || 0,
        firstElementType: typeof game.questionSet?.[0],
        firstElementIsObjectId: game.questionSet?.[0] && typeof game.questionSet[0] === 'object' && game.questionSet[0]._id,
        firstElementId: game.questionSet?.[0]?._id || game.questionSet?.[0],
        sampleData: game.questionSet?.[0]
      });
      
      // Manually fetch and populate questionSet to ensure it's properly populated
      const questionIds = game.questionSet;
      console.log('🔍 Initial question IDs to populate:', questionIds.length);
      console.log('🔍 Question IDs array:', questionIds.map(id => id.toString()));
      
      let populatedQuestions = [];
      try {
        // Debug: Check if questionIds are valid ObjectIds
        const validIds = questionIds.filter(id => {
          const isValid = mongoose.Types.ObjectId.isValid(id);
          console.log('🔍 ID validation:', id.toString(), 'valid:', isValid);
          return isValid;
        });
        
        console.log('🔍 Valid IDs for query:', validIds.length, 'out of', questionIds.length);
        
        // First, check if ANY questions exist in database
        const totalQuestions = await MCQQuestion.countDocuments();
        console.log('🔍 Total questions in database:', totalQuestions);
        
        // Check if specific IDs exist
        const existingQuestions = await MCQQuestion.find({ _id: { $in: validIds } }).select('_id');
        console.log('🔍 Questions that exist for these IDs:', existingQuestions.map(q => q._id.toString()));
        
        populatedQuestions = await MCQQuestion.find({ 
          _id: { $in: validIds },
          isActive: true 
        }).lean(); // Use lean() for better performance and plain objects
        
        console.log('🔍 Initial populated questions found:', populatedQuestions.length);
        console.log('🔍 Raw query result sample:', populatedQuestions[0]);
        
        // If still no results, try different approach
        if (populatedQuestions.length === 0) {
          console.log('🔄 Trying to fetch ANY active questions as fallback...');
          populatedQuestions = await MCQQuestion.find({ isActive: true }).limit(10).lean();
          console.log('🔍 Fallback questions found:', populatedQuestions.length);
        }
        
        // Debug each question structure
        populatedQuestions.forEach((q, index) => {
          console.log(`🔍 Question ${index + 1}:`, {
            id: q._id.toString(),
            hasQuestion: !!q.question,
            questionText: q.question?.substring(0, 40) || 'NO TEXT',
            optionsCount: q.options?.length || 0,
            optionsStructure: q.options?.map(opt => ({ text: opt.text?.substring(0, 20), isCorrect: opt.isCorrect })),
            domain: q.domain,
            isValidStructure: !!(q.question && q.options && q.options.length >= 4)
          });
        });
        
      } catch (error) {
        console.error('❌ Error fetching questions manually:', error);
        populatedQuestions = [];
      }
      
      // Create properly structured game object with populated questions
      let finalQuestionSet;
      if (populatedQuestions.length > 0) {
        console.log('✅ Using manually populated questions');
        finalQuestionSet = populatedQuestions;
      } else {
        console.log('⚠️ Manual population failed, checking original game.questionSet');
        // Check if original questionSet has populated data
        if (game.questionSet && game.questionSet.length > 0 && typeof game.questionSet[0] === 'object' && game.questionSet[0].question) {
          console.log('✅ Using original populated questionSet from database');
          finalQuestionSet = game.questionSet;
        } else {
          console.log('❌ No valid questions available');
          finalQuestionSet = [];
        }
      }
      
      const gameWithQuestions = {
        _id: game._id,
        gameId: game.gameId,
        players: game.players,
        questionSet: finalQuestionSet,
        totalQuestions: game.totalQuestions,
        timeLimit: game.timeLimit,
        status: game.status,
        startTime: game.startTime,
        createdAt: game.createdAt,
        updatedAt: game.updatedAt
      };

      console.log('🔍 CRITICAL: Initial gameWithQuestions.questionSet after creation:', {
        length: gameWithQuestions.questionSet.length,
        firstType: typeof gameWithQuestions.questionSet[0],
        firstId: gameWithQuestions.questionSet[0]?._id,
        firstQuestion: gameWithQuestions.questionSet[0]?.question?.substring(0, 30)
      });

        // Validate questions before sending
        const validQuestions = gameWithQuestions.questionSet.filter(q => {
          const isValid = q && q.question && q.options && q.options.length >= 4;
          if (!isValid) {
            console.warn('❌ Invalid question filtered out:', q?._id);
          }
          return isValid;
        });
        console.log('✅ Valid questions to send:', validQuestions.length, 'out of', gameWithQuestions.questionSet.length);
        gameWithQuestions.questionSet = validQuestions;
        
        console.log('📤 Sending game-started with', gameWithQuestions.questionSet.length, 'questions');
        console.log('📤 First question preview:', {
          id: gameWithQuestions.questionSet[0]?._id,
          question: gameWithQuestions.questionSet[0]?.question?.substring(0, 50),
          optionsCount: gameWithQuestions.questionSet[0]?.options?.length
        });      console.log('📤 Sending initial game state with', gameWithQuestions.questionSet.length, 'questions');
      console.log('📤 First question preview:', {
        id: gameWithQuestions.questionSet[0]?._id,
        question: gameWithQuestions.questionSet[0]?.question?.substring(0, 50),
        optionsCount: gameWithQuestions.questionSet[0]?.options?.length
      });
      
      console.log('📊 Game state with manually populated questions:', populatedQuestions.length);
      
      // Debug first question if available
      if (populatedQuestions && populatedQuestions.length > 0) {
        const firstQuestion = populatedQuestions[0];
        console.log('🔍 First question sample:', {
          id: firstQuestion._id,
          question: firstQuestion.question?.substring(0, 50),
          optionsCount: firstQuestion.options?.length || 0,
          domain: firstQuestion.domain,
          hasQuestionText: !!firstQuestion.question,
          hasOptions: Array.isArray(firstQuestion.options) && firstQuestion.options.length > 0
        });
      } else {
        console.warn('⚠️ No questions found after manual population!');
      }
      
      socket.emit('rapidfire-game-state', gameWithQuestions);
      
      console.log('📤 EMITTED rapidfire-game-state with:', {
        questionSetLength: gameWithQuestions.questionSet.length,
        firstQuestionType: typeof gameWithQuestions.questionSet[0],
        firstQuestionId: gameWithQuestions.questionSet[0]?._id,
        firstQuestionText: gameWithQuestions.questionSet[0]?.question?.substring(0, 30)
      });

      // If 2 players and not started yet, start the game
      if (game.players.length === 2 && game.status === 'waiting') {
        console.log('🚀 Starting rapid fire game with 2 players');
        
        game.status = 'ongoing';
        game.startTime = new Date();
        await game.save();

        // Refresh game with populated questionSet using manual population
        const updatedGame = await RapidFireGame.findById(gameId)
          .populate('players.user', 'username profile.avatar ratings.rapidFireRating');

        // Manually populate questionSet to ensure it works
        const questionIds = updatedGame.questionSet;
        console.log('🔍 Game-start question IDs to populate:', questionIds.length);
        console.log('🔍 Game-start question IDs array:', questionIds.map(id => id.toString()));
        
        let populatedQuestions = [];
        try {
          // Debug: Check if questionIds are valid ObjectIds
          const validIds = questionIds.filter(id => {
            const isValid = mongoose.Types.ObjectId.isValid(id);
            console.log('🔍 Game-start ID validation:', id.toString(), 'valid:', isValid);
            return isValid;
          });
          
          console.log('🔍 Game-start valid IDs for query:', validIds.length, 'out of', questionIds.length);
          
          // First, check if ANY questions exist in database
          const totalQuestions = await MCQQuestion.countDocuments();
          console.log('🔍 Total questions in database:', totalQuestions);
          
          // Check if specific IDs exist
          const existingQuestions = await MCQQuestion.find({ _id: { $in: validIds } }).select('_id');
          console.log('🔍 Questions that exist for these IDs:', existingQuestions.map(q => q._id.toString()));
          
          populatedQuestions = await MCQQuestion.find({ 
            _id: { $in: validIds },
            isActive: true 
          }).lean(); // Use lean() for better performance and plain objects
          
          console.log('🔍 Game-start populated questions found:', populatedQuestions.length);
          console.log('🔍 Game-start raw query result sample:', populatedQuestions[0]);
          
          // If still no results, try different approach
          if (populatedQuestions.length === 0) {
            console.log('🔄 Trying to fetch ANY active questions as fallback...');
            populatedQuestions = await MCQQuestion.find({ isActive: true }).limit(10).lean();
            console.log('🔍 Fallback questions found:', populatedQuestions.length);
          }
          
          // Debug each question structure for game start
          populatedQuestions.forEach((q, index) => {
            console.log(`🔍 Game-start Question ${index + 1}:`, {
              id: q._id.toString(),
              hasQuestion: !!q.question,
              questionText: q.question?.substring(0, 40) || 'NO TEXT',
              optionsCount: q.options?.length || 0,
              optionsStructure: q.options?.map(opt => ({ text: opt.text?.substring(0, 20), isCorrect: opt.isCorrect })),
              domain: q.domain,
              isValidStructure: !!(q.question && q.options && q.options.length >= 4)
            });
          });
          
        } catch (error) {
          console.error('❌ Error fetching questions for game start:', error);
          populatedQuestions = [];
        }
        
        // Create properly structured game object with populated questions
        let finalQuestionSet;
        if (populatedQuestions.length > 0) {
          console.log('✅ Game-start: Using manually populated questions');
          finalQuestionSet = populatedQuestions;
        } else {
          console.log('⚠️ Game-start: Manual population failed, checking updatedGame.questionSet');
          // Check if original questionSet has populated data
          if (updatedGame.questionSet && updatedGame.questionSet.length > 0 && typeof updatedGame.questionSet[0] === 'object' && updatedGame.questionSet[0].question) {
            console.log('✅ Game-start: Using original populated questionSet from database');
            finalQuestionSet = updatedGame.questionSet;
          } else {
            console.log('❌ Game-start: No valid questions available');
            finalQuestionSet = [];
          }
        }
        
        const gameWithQuestions = {
          _id: updatedGame._id,
          gameId: updatedGame.gameId,
          players: updatedGame.players,
          questionSet: finalQuestionSet,
          totalQuestions: updatedGame.totalQuestions,
          timeLimit: updatedGame.timeLimit,
          status: updatedGame.status,
          startTime: updatedGame.startTime,
          createdAt: updatedGame.createdAt,
          updatedAt: updatedGame.updatedAt
        };

        console.log('🔍 CRITICAL: gameWithQuestions.questionSet after creation:', {
          length: gameWithQuestions.questionSet.length,
          firstType: typeof gameWithQuestions.questionSet[0],
          firstId: gameWithQuestions.questionSet[0]?._id,
          firstQuestion: gameWithQuestions.questionSet[0]?.question?.substring(0, 30)
        });

        // Validate questions before sending
        const validQuestions = gameWithQuestions.questionSet.filter(q => q && q.question && q.options && q.options.length >= 4);
        console.log('✅ Valid questions to send:', validQuestions.length, 'out of', gameWithQuestions.questionSet.length);
        gameWithQuestions.questionSet = validQuestions;

        console.log('🎯 Game started - Questions available:', populatedQuestions.length);

        // Debug what we're sending in game-started event
        if (populatedQuestions && populatedQuestions.length > 0) {
          const firstQ = populatedQuestions[0];
          console.log('🔍 Sending game-started with first question:', {
            id: firstQ._id,
            question: firstQ.question?.substring(0, 50),
            optionsCount: firstQ.options?.length || 0,
            type: typeof firstQ,
            hasQuestionText: !!firstQ.question,
            hasOptions: Array.isArray(firstQ.options) && firstQ.options.length > 0
          });
        } else {
          console.error('❌ No questions to send in game-started event!');
        }

        // Notify all players that game is starting
        console.log('🚀 Emitting rapidfire-game-started with questionSet length:', gameWithQuestions.questionSet?.length);
        console.log('🚀 First question in emit:', gameWithQuestions.questionSet?.[0]?._id, gameWithQuestions.questionSet?.[0]?.question?.substring(0, 30));
        io.to(`rapidfire-${gameId}`).emit('rapidfire-game-started', {
          game: gameWithQuestions,
          timeLimit: gameWithQuestions.timeLimit
        });

        // Set timer for game end
        const gameTimer = setTimeout(async () => {
          console.log('⏰ Rapid fire game time limit reached:', gameId);
          await endRapidFireGame(gameId, io, 'timeout');
        }, game.timeLimit * 1000);

        activeRapidFireGames.set(gameId, {
          timer: gameTimer,
          startTime: game.startTime
        });

        console.log('✅ Rapid fire game started successfully');
      } else {
        // Notify about player joining
        socket.to(`rapidfire-${gameId}`).emit('rapidfire-player-joined', {
          playerId: socket.userId,
          playerCount: game.players.length,
          game
        });
      }

    } catch (error) {
      console.error('❌ Join rapid fire game error:', error);
      socket.emit('error', { message: 'Failed to join rapid fire game' });
    }
  });

  // Submit MCQ answer
  socket.on('submit-rapidfire-answer', async (data) => {
    try {
      const { gameId, questionId, selectedOption, timeSpent } = data;
      console.log('📝 Rapid fire answer submission:', {
        gameId,
        userId: socket.userId,
        questionId,
        selectedOption,
        timeSpent
      });

      const game = await RapidFireGame.findById(gameId).populate('questionSet');
      if (!game || game.status !== 'ongoing') {
        socket.emit('rapidfire-submission-error', { message: 'Game not active' });
        return;
      }

      const player = game.players.find(p => p.user.toString() === socket.userId);
      if (!player) {
        socket.emit('rapidfire-submission-error', { message: 'Player not found' });
        return;
      }

      // Check if already answered this question
      const alreadyAnswered = player.answers.some(a => a.questionId.toString() === questionId);
      if (alreadyAnswered) {
        socket.emit('rapidfire-submission-error', { message: 'Question already answered' });
        return;
      }

      // Get the question to check correct answer
      const question = await MCQQuestion.findById(questionId);
      if (!question) {
        socket.emit('rapidfire-submission-error', { message: 'Question not found' });
        return;
      }

      const isCorrect = question.options[selectedOption]?.isCorrect || false;
      
      // Update player stats
      player.answers.push({
        questionId,
        selectedOption,
        isCorrect,
        timeSpent,
        answeredAt: new Date()
      });

      if (isCorrect) {
        player.correctAnswers += 1;
        player.score += 1;
      } else {
        player.wrongAnswers += 1;
        player.score -= 0.5;
      }
      
      player.questionsAnswered += 1;

      // Update question statistics
      question.totalAttempts += 1;
      if (isCorrect) {
        question.correctAnswers += 1;
      }
      
      await Promise.all([game.save(), question.save()]);

      console.log('✅ Rapid fire answer processed:', {
        isCorrect,
        newScore: player.score,
        questionsAnswered: player.questionsAnswered
      });

      // Send result to player
      socket.emit('rapidfire-answer-result', {
        isCorrect,
        score: player.score,
        questionsAnswered: player.questionsAnswered,
        correctAnswers: player.correctAnswers,
        wrongAnswers: player.wrongAnswers,
        correctOptionIndex: question.options.findIndex(opt => opt.isCorrect),
        explanation: question.explanation
      });

      // Send progress update to opponent
      socket.to(`rapidfire-${gameId}`).emit('rapidfire-opponent-progress', {
        playerId: socket.userId,
        score: player.score,
        questionsAnswered: player.questionsAnswered,
        correctAnswers: player.correctAnswers,
        wrongAnswers: player.wrongAnswers
      });

      // Check if player finished all questions
      if (player.questionsAnswered >= game.totalQuestions) {
        console.log('🏁 Player finished all questions');
        player.status = 'finished';
        player.finishedAt = new Date();
        await game.save();

        // Check if game should end
        const allFinished = game.players.every(p => p.status === 'finished' || p.status === 'left');
        if (allFinished) {
          await endRapidFireGame(gameId, io, 'completed');
        }
      }

    } catch (error) {
      console.error('❌ Submit rapid fire answer error:', error);
      socket.emit('rapidfire-submission-error', { message: 'Failed to submit answer' });
    }
  });

  // Leave rapid fire game
  socket.on('leave-rapidfire-game', async (gameId) => {
    try {
      console.log('🚪 Player leaving rapid fire game:', gameId, 'Socket:', socket.id);

      const game = await RapidFireGame.findById(gameId);
      if (!game) {
        console.log('⚠️ Game not found for leave action');
        return;
      }

      const player = game.players.find(p => p.user.toString() === socket.userId);
      if (!player) {
        console.log('⚠️ Player not found in game for leave action');
        return;
      }

      // Update player status
      player.status = 'left';
      player.leftAt = new Date();

      // If game is ongoing, end it due to player leaving
      if (game.status === 'ongoing') {
        const remainingPlayer = game.players.find(p => p.user.toString() !== socket.userId);
        if (remainingPlayer) {
          game.winner = remainingPlayer.user;
          game.result = 'opponent_left';
        }
        await endRapidFireGame(gameId, io, 'opponent_left');
      } else if (game.status === 'waiting') {
        // If waiting, just remove the player or cancel the game
        if (game.players.length === 1) {
          game.status = 'cancelled';
          await game.save();
        }
      }

      await game.save();

      // Leave the socket room
      socket.leave(`rapidfire-${gameId}`);
      
      // Notify other players
      socket.to(`rapidfire-${gameId}`).emit('rapidfire-player-left', {
        playerId: socket.userId,
        gameStatus: game.status,
        winner: game.winner
      });

      console.log('✅ Player left rapid fire game successfully');

    } catch (error) {
      console.error('❌ Leave rapid fire game error:', error);
    }
  });

  // Leave rapid fire game
  socket.on('leave-rapidfire-game', async (gameId) => {
    try {
      console.log('🚪 User leaving rapid fire game:', gameId, 'Socket:', socket.id);

      const game = await RapidFireGame.findById(gameId).populate('players.user');
      if (!game) return;

      const player = game.players.find(p => p.user._id.toString() === socket.userId);
      if (!player) return;

      // Mark player as left
      player.status = 'left';
      player.leftAt = new Date();

      // Check if game should end
      const activePlayers = game.players.filter(p => p.status !== 'left');
      
      if (activePlayers.length === 0) {
        // Both players left
        await endRapidFireGame(gameId, io, 'cancelled');
      } else if (activePlayers.length === 1 && game.status === 'ongoing') {
        // One player left during game - other continues for remaining time
        await game.save();
        
        // Notify remaining player
        socket.to(`rapidfire-${gameId}`).emit('rapidfire-opponent-left', {
          message: 'Opponent left the game. Continue playing for remaining time.',
          canContinue: true
        });
      } else {
        await game.save();
      }

      // Leave socket room
      socket.leave(`rapidfire-${gameId}`);
      socket.rapidFireGameId = null;

      console.log('✅ User left rapid fire game successfully');

    } catch (error) {
      console.error('❌ Leave rapid fire game error:', error);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    if (socket.rapidFireGameId) {
      console.log('🔌 Socket disconnected, handling rapid fire game leave:', socket.rapidFireGameId);
      socket.emit('leave-rapidfire-game', socket.rapidFireGameId);
    }
  });
};

// Function to end rapid fire game
const endRapidFireGame = async (gameId, io, reason = 'completed') => {
  try {
    console.log('🏁 Ending rapid fire game:', gameId, 'Reason:', reason);

    const game = await RapidFireGame.findById(gameId).populate('players.user');
    if (!game || game.status === 'finished') return;

    // Clear the game timer
    const gameData = activeRapidFireGames.get(gameId);
    if (gameData?.timer) {
      clearTimeout(gameData.timer);
      activeRapidFireGames.delete(gameId);
    }

    // Mark game as finished
    game.status = 'finished';
    game.endTime = new Date();

    // Determine winner based on scores
    const winner = game.determineWinner();
    
    if (winner === 'draw') {
      game.result = 'draw';
    } else if (winner) {
      game.winner = winner;
      game.result = reason === 'timeout' ? 'timeout' : 'win';
    }

    // Calculate rating changes for both players if both participated
    if (game.players.length === 2) {
      const [player1, player2] = game.players;
      
      // Only calculate ratings if both players answered at least one question
      if (player1.questionsAnswered > 0 && player2.questionsAnswered > 0) {
        const player1Rating = player1.ratingBefore;
        const player2Rating = player2.ratingBefore;

        let player1Result, player2Result;
        
        if (game.result === 'draw') {
          player1Result = player2Result = 'draw';
        } else if (game.winner.toString() === player1.user._id.toString()) {
          player1Result = 'win';
          player2Result = 'lose';
        } else {
          player1Result = 'lose';
          player2Result = 'win';
        }

        const player1Change = calculateEloChange(player1Rating, player2Rating, player1Result);
        const player2Change = calculateEloChange(player2Rating, player1Rating, player2Result);

        player1.ratingAfter = Math.max(800, player1Rating + player1Change);
        player2.ratingAfter = Math.max(800, player2Rating + player2Change);
        player1.ratingChange = player1Change;
        player2.ratingChange = player2Change;

        // Update user ratings and history in database
        await User.findByIdAndUpdate(player1.user._id, {
          'ratings.rapidFireRating': player1.ratingAfter,
          $push: {
            rapidFireHistory: {
              opponent: player2.user._id,
              result: player1Result,
              ratingChange: player1Change,
              score: player1.score,
              correctAnswers: player1.correctAnswers,
              wrongAnswers: player1.wrongAnswers,
              totalQuestions: game.totalQuestions,
              date: new Date()
            }
          }
        });

        await User.findByIdAndUpdate(player2.user._id, {
          'ratings.rapidFireRating': player2.ratingAfter,
          $push: {
            rapidFireHistory: {
              opponent: player1.user._id,
              result: player2Result,
              ratingChange: player2Change,
              score: player2.score,
              correctAnswers: player2.correctAnswers,
              wrongAnswers: player2.wrongAnswers,
              totalQuestions: game.totalQuestions,
              date: new Date()
            }
          }
        });

        console.log('✅ Rapid fire ratings updated:', {
          player1: { old: player1Rating, new: player1.ratingAfter, change: player1Change },
          player2: { old: player2Rating, new: player2.ratingAfter, change: player2Change }
        });
      }
    }

    await game.save();

    // Notify all players about game end
    const finalGame = await RapidFireGame.findById(gameId)
      .populate('players.user', 'username profile.avatar ratings.rapidFireRating')
      .populate('questionSet');

    io.to(`rapidfire-${gameId}`).emit('rapidfire-game-finished', {
      game: finalGame,
      winner: game.winner,
      reason,
      finalState: finalGame
    });

    console.log('✅ Rapid fire game ended successfully');

  } catch (error) {
    console.error('❌ End rapid fire game error:', error);
  }
};

console.log('✅ Rapid Fire socket handlers loaded');

export const setupRapidFireSocket = (io) => {
  console.log('🚀 Setting up Rapid Fire socket handlers');

  io.on('connection', (socket) => {
    console.log(`🔥 New socket connection for rapid fire: ${socket.id}`);

    // Join rapid fire game room
    socket.on('join-rapidfire-game', async (gameId) => {
      console.log(`🎯 Socket ${socket.id} joining rapid fire game: ${gameId}`);
      
      try {
        const game = await RapidFireGame.findById(gameId).populate('players.user');
        if (!game) {
          socket.emit('error', { message: 'Rapid fire game not found' });
          return;
        }

        socket.join(gameId);
        socket.rapidfireGameId = gameId;

        // Send current game state
        socket.emit('rapidfire-game-state', game);

        // If game has 2 players and hasn't started, start it
        if (game.players.length === 2 && game.status === 'waiting') {
          game.status = 'ongoing';
          game.startTime = new Date();
          await game.save();

          console.log(`🚀 Starting rapid fire game: ${gameId}`);
          io.to(gameId).emit('rapidfire-game-started', {
            game,
            timeLimit: game.timeLimit
          });
        }
      } catch (error) {
        console.error('❌ Join rapid fire game error:', error);
        socket.emit('error', { message: 'Failed to join rapid fire game' });
      }
    });

    // Submit answer for rapid fire
    socket.on('submit-rapidfire-answer', async (data) => {
      console.log(`📝 Rapid fire answer submitted:`, data);
      
      try {
        const { gameId, questionId, selectedOption, timeSpent } = data;
        const userId = socket.userId;

        const game = await RapidFireGame.findById(gameId).populate('questionSet');
        if (!game || game.status !== 'ongoing') {
          socket.emit('error', { message: 'Game not found or not active' });
          return;
        }

        const question = game.questionSet.find(q => q._id.toString() === questionId);
        if (!question) {
          socket.emit('error', { message: 'Question not found' });
          return;
        }

        const playerIndex = game.players.findIndex(p => p.user.toString() === userId);
        if (playerIndex === -1) {
          socket.emit('error', { message: 'Player not found in game' });
          return;
        }

        const isCorrect = question.options[selectedOption]?.isCorrect || false;
        const correctOptionIndex = question.options.findIndex(opt => opt.isCorrect);

        // Update player's answer
        game.players[playerIndex].answers.push({
          questionId: questionId,
          selectedOption: selectedOption,
          isCorrect: isCorrect,
          timeSpent: timeSpent
        });

        // Calculate score
        const player = game.players[playerIndex];
        const score = game.calculatePlayerScore(player);
        player.score = score;
        player.correctAnswers = player.answers.filter(a => a.isCorrect).length;
        player.wrongAnswers = player.answers.filter(a => !a.isCorrect).length;
        player.questionsAnswered = player.answers.length;

        await game.save();

        // Send result to player
        socket.emit('rapidfire-answer-result', {
          isCorrect,
          score,
          questionsAnswered: player.questionsAnswered,
          correctAnswers: player.correctAnswers,
          wrongAnswers: player.wrongAnswers,
          correctOptionIndex,
          explanation: question.explanation
        });

        // Send progress to opponent
        socket.to(gameId).emit('rapidfire-opponent-progress', {
          score,
          questionsAnswered: player.questionsAnswered,
          correctAnswers: player.correctAnswers,
          wrongAnswers: player.wrongAnswers
        });

        // Check if game should end
        const allPlayersFinished = game.players.every(p => p.questionsAnswered >= game.totalQuestions);
        const timeUp = (Date.now() - new Date(game.startTime).getTime()) >= game.timeLimit * 1000;

        if (allPlayersFinished || timeUp) {
          await endRapidFireGame(game, io);
        }

      } catch (error) {
        console.error('❌ Submit rapid fire answer error:', error);
        socket.emit('error', { message: 'Failed to submit answer' });
      }
    });

    // Handle game timeout
    socket.on('rapidfire-game-timeout', async (gameId) => {
      console.log(`⏰ Rapid fire game timeout: ${gameId}`);
      
      try {
        const game = await RapidFireGame.findById(gameId);
        if (game && game.status === 'ongoing') {
          await endRapidFireGame(game, io);
        }
      } catch (error) {
        console.error('❌ Rapid fire timeout error:', error);
      }
    });

    // Leave rapid fire game
    socket.on('leave-rapidfire-game', async (gameId) => {
      console.log(`🚪 Socket ${socket.id} leaving rapid fire game: ${gameId}`);
      
      try {
        if (socket.rapidfireGameId) {
          socket.leave(socket.rapidfireGameId);
          socket.to(socket.rapidfireGameId).emit('rapidfire-opponent-left', {
            message: 'Your opponent left the rapid fire game'
          });
          delete socket.rapidfireGameId;
        }
      } catch (error) {
        console.error('❌ Leave rapid fire game error:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 Socket ${socket.id} disconnected from rapid fire`);
      
      if (socket.rapidfireGameId) {
        socket.to(socket.rapidfireGameId).emit('rapidfire-opponent-left', {
          message: 'Your opponent disconnected from the rapid fire game'
        });
      }
    });
  });
};
