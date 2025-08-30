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

        // Start game timer
        const timer = setTimeout(async () => {
          await endRapidFireGame(gameId, io);
        }, gameData.timeLimit * 60 * 1000);

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

      // Update player score
      const playerIndex = game.players.findIndex(p => p.user.toString() === socket.userId);
      if (playerIndex !== -1) {
        if (isCorrect) {
          game.players[playerIndex].score += 1;
        }
        game.players[playerIndex].answers.push({
          questionIndex,
          selectedOption,
          isCorrect,
          answeredAt: new Date()
        });

        await game.save();

        // Emit answer result to all players
        io.to(`rapidfire-${gameId}`).emit('answer-submitted', {
          playerId: socket.userId,
          questionIndex,
          isCorrect,
          newScore: game.players[playerIndex].score,
          correctAnswer: question.options.findIndex(opt => opt.isCorrect)
        });
      }

    } catch (error) {
      console.error('❌ BULLETPROOF: Error submitting answer:', error);
      socket.emit('error', { message: 'Failed to submit answer' });
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

// BULLETPROOF: End game function
const endRapidFireGame = async (gameId, io) => {
  try {
    console.log('🏁 BULLETPROOF: Ending rapid fire game:', gameId);

    const game = await RapidFireGame.findById(gameId)
      .populate('players.user', 'username profile.avatar');

    if (!game) return;

    // Update game status
    game.status = 'completed';
    game.endTime = new Date();

    // Calculate final scores and update ratings
    const sortedPlayers = game.players.sort((a, b) => b.score - a.score);
    
    for (let i = 0; i < sortedPlayers.length; i++) {
      const player = sortedPlayers[i];
      player.rank = i + 1;
      
      // Update user rating
      const user = await User.findById(player.user._id);
      if (user) {
        const ratingChange = player.rank === 1 ? 25 : -10; // Winner gets +25, loser gets -10
        user.ratings.rapidFireRating = Math.max(0, user.ratings.rapidFireRating + ratingChange);
        await user.save();
      }
    }

    await game.save();

    // Emit game results
    io.to(`rapidfire-${gameId}`).emit('rapidfire-game-ended', {
      gameId,
      results: sortedPlayers.map(p => ({
        userId: p.user._id,
        username: p.user.username,
        score: p.score,
        rank: p.rank,
        avatar: p.user.profile?.avatar
      }))
    });

    // Clean up active game
    const activeGame = activeRapidFireGames.get(gameId);
    if (activeGame?.timer) {
      clearTimeout(activeGame.timer);
    }
    activeRapidFireGames.delete(gameId);

    console.log('✅ BULLETPROOF: Rapid fire game ended successfully');

  } catch (error) {
    console.error('❌ BULLETPROOF: Error ending rapid fire game:', error);
  }
};
