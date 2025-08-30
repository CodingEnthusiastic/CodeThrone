import express from 'express';
import RapidFireGame from '../models/RapidFireGame.js';
import MCQQuestion from '../models/MCQQuestion.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

console.log('🎯 Loading Rapid Fire routes...');

// Utility function to calculate ELO rating change
const calculateEloChange = (playerRating, opponentRating, result, kFactor = 32) => {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const actualScore = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
  return Math.round(kFactor * (actualScore - expectedScore));
};

// Generate random room ID
const generateRoomId = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Get random questions for rapid fire game
const getRandomQuestions = async () => {
  try {
    console.log('🎲 Generating random question set...');
    
    // Get questions by domain with specified distribution using regular find
    const [dsaQuestions, systemDesignQuestions, aimlQuestions, aptitudeQuestions] = await Promise.all([
      MCQQuestion.find({ domain: 'dsa', isActive: true }),
      MCQQuestion.find({ domain: 'system-design', isActive: true }),
      MCQQuestion.find({ domain: 'aiml', isActive: true }),
      MCQQuestion.find({ domain: 'aptitude', isActive: true })
    ]);

    // Randomly sample from each domain
    const getRandomSample = (array, size) => {
      const shuffled = array.sort(() => 0.5 - Math.random());
      return shuffled.slice(0, size);
    };

    const selectedQuestions = [
      ...getRandomSample(dsaQuestions, 3),
      ...getRandomSample(systemDesignQuestions, 3),
      ...getRandomSample(aimlQuestions, 2),
      ...getRandomSample(aptitudeQuestions, 2)
    ];

    // Final shuffle of all selected questions
    const allQuestions = selectedQuestions.sort(() => 0.5 - Math.random());

    console.log('✅ Generated question set:', {
      dsa: Math.min(dsaQuestions.length, 3),
      systemDesign: Math.min(systemDesignQuestions.length, 3),
      aiml: Math.min(aimlQuestions.length, 2),
      aptitude: Math.min(aptitudeQuestions.length, 2),
      total: allQuestions.length
    });

    if (allQuestions.length === 0) {
      throw new Error('No active questions found in database');
    }

    return allQuestions;
  } catch (error) {
    console.error('❌ Error generating questions:', error);
    throw error;
  }
};

// Create random rapid fire match
router.post('/random', authenticateToken, async (req, res) => {
  try {
    console.log('🎯 Creating random rapid fire match for user:', req.user.id);

    // Check if user is already in a game
    const existingGame = await RapidFireGame.findOne({
      'players.user': req.user.id,
      status: { $in: ['waiting', 'ongoing'] }
    });

    if (existingGame) {
      console.log('♻️ User already in rapid fire game:', existingGame._id);
      return res.json(existingGame);
    }

    // Look for waiting games
    let game = await RapidFireGame.findOne({
      status: 'waiting',
      'players.1': { $exists: false } // Less than 2 players
    }).populate('players.user', 'username profile.avatar ratings.rapidFireRating');

    if (game) {
      // Join existing game
      console.log('🎮 Joining existing rapid fire game:', game._id);
      
      const user = await User.findById(req.user.id);
      
      game.players.push({
        user: req.user.id,
        usernameSnapshot: user.username,
        avatarSnapshot: user.profile?.avatar || '',
        ratingBefore: user.ratings.rapidFireRating || 1200
      });

      await game.save();
      
      console.log('🔍 After joining - game questionSet:', game.questionSet.map(id => id.toString()));
      
      // Populate and return
      game = await RapidFireGame.findById(game._id)
        .populate('players.user', 'username profile.avatar ratings.rapidFireRating')
        .populate('questionSet');

      console.log('✅ Joined rapid fire game successfully');
      console.log('🔍 Populated game questionSet after join:', game.questionSet.length, 'questions');
      return res.json(game);
    }

    // Create new game
    console.log('🆕 Creating new rapid fire game...');
    
    const user = await User.findById(req.user.id);
    const questions = await getRandomQuestions();
    
    console.log('🔍 Generated questions sample:', {
      count: questions.length,
      firstQuestionId: questions[0]?._id,
      firstQuestionText: questions[0]?.question?.substring(0, 50),
      firstQuestionOptions: questions[0]?.options?.length,
      questionTypes: questions.map(q => typeof q)
    });
    
    game = new RapidFireGame({
      roomId: generateRoomId(),
      gameMode: 'random',
      questionSet: questions.map(q => q._id),
      totalQuestions: questions.length,
      questionDistribution: {
        dsa: 3,
        systemDesign: 3,
        aiml: 2,
        aptitude: 2
      },
      players: [{
        user: req.user.id,
        usernameSnapshot: user.username,
        avatarSnapshot: user.profile?.avatar || '',
        ratingBefore: user.ratings.rapidFireRating || 1200
      }]
    });

    await game.save();
    
    console.log('🔍 Saved game questionSet:', game.questionSet.map(id => id.toString()));
    
    // Populate and return
    game = await RapidFireGame.findById(game._id)
      .populate('players.user', 'username profile.avatar ratings.rapidFireRating')
      .populate('questionSet');

    console.log('✅ Created new rapid fire game:', game._id, 'with', game.questionSet.length, 'questions');
    res.json(game);

  } catch (error) {
    console.error('❌ Random rapid fire match error:', error);
    res.status(500).json({ message: 'Failed to create rapid fire match' });
  }
});

// Create rapid fire room
router.post('/room', authenticateToken, async (req, res) => {
  try {
    console.log('🏠 Creating rapid fire room for user:', req.user.id);

    const user = await User.findById(req.user.id);
    const questions = await getRandomQuestions();
    
    const game = new RapidFireGame({
      roomId: generateRoomId(),
      gameMode: 'room',
      questionSet: questions.map(q => q._id),
      totalQuestions: questions.length,
      questionDistribution: {
        dsa: 3,
        systemDesign: 3,
        aiml: 2,
        aptitude: 2
      },
      players: [{
        user: req.user.id,
        usernameSnapshot: user.username,
        avatarSnapshot: user.profile?.avatar || '',
        ratingBefore: user.ratings.rapidFireRating || 1200
      }]
    });

    await game.save();
    
    // Populate and return
    const populatedGame = await RapidFireGame.findById(game._id)
      .populate('players.user', 'username profile.avatar ratings.rapidFireRating')
      .populate('questionSet');

    console.log('✅ Created rapid fire room:', game.roomId, 'with', populatedGame.questionSet.length, 'questions');
    res.json(populatedGame);

  } catch (error) {
    console.error('❌ Rapid fire room creation error:', error);
    res.status(500).json({ message: 'Failed to create rapid fire room' });
  }
});

// Join rapid fire room
router.post('/room/:roomCode/join', authenticateToken, async (req, res) => {
  try {
    const { roomCode } = req.params;
    console.log('🚪 Joining rapid fire room:', roomCode, 'for user:', req.user.id);

    const game = await RapidFireGame.findOne({
      roomId: roomCode.toUpperCase(),
      status: 'waiting'
    }).populate('players.user', 'username profile.avatar ratings.rapidFireRating');

    if (!game) {
      return res.status(404).json({ message: 'Room not found or already started' });
    }

    if (game.players.length >= 2) {
      return res.status(400).json({ message: 'Room is full' });
    }

    // Check if user already in this game
    const alreadyInGame = game.players.some(p => p.user._id.toString() === req.user.id);
    if (alreadyInGame) {
      console.log('♻️ User already in this rapid fire game');
      return res.json(game);
    }

    const user = await User.findById(req.user.id);
    
    game.players.push({
      user: req.user.id,
      usernameSnapshot: user.username,
      avatarSnapshot: user.profile?.avatar || '',
      ratingBefore: user.ratings.rapidFireRating || 1200
    });

    await game.save();
    
    // Populate and return
    const populatedGame = await RapidFireGame.findById(game._id)
      .populate('players.user', 'username profile.avatar ratings.rapidFireRating')
      .populate('questionSet');

    console.log('✅ Joined rapid fire room successfully');
    res.json(populatedGame);

  } catch (error) {
    console.error('❌ Rapid fire room join error:', error);
    res.status(500).json({ message: 'Failed to join rapid fire room' });
  }
});

// Get rapid fire game by ID
router.get('/:gameId', authenticateToken, async (req, res) => {
  try {
    const { gameId } = req.params;
    console.log('📖 Getting rapid fire game:', gameId);

    const game = await RapidFireGame.findById(gameId)
      .populate('players.user', 'username profile.avatar ratings.rapidFireRating')
      .populate('questionSet');

    if (!game) {
      return res.status(404).json({ message: 'Rapid fire game not found' });
    }

    console.log('✅ Retrieved rapid fire game:', game._id);
    res.json(game);

  } catch (error) {
    console.error('❌ Get rapid fire game error:', error);
    res.status(500).json({ message: 'Failed to get rapid fire game' });
  }
});

// Submit answer for rapid fire game
router.post('/:gameId/answer', authenticateToken, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { questionId, selectedOption, timeSpent } = req.body;
    
    console.log('📝 Submitting rapid fire answer:', {
      gameId,
      userId: req.user.id,
      questionId,
      selectedOption,
      timeSpent
    });

    const game = await RapidFireGame.findById(gameId).populate('questionSet');
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    if (game.status !== 'ongoing') {
      return res.status(400).json({ message: 'Game is not active' });
    }

    const player = game.players.find(p => p.user.toString() === req.user.id);
    if (!player) {
      return res.status(403).json({ message: 'You are not in this game' });
    }

    // Check if already answered this question
    const alreadyAnswered = player.answers.some(a => a.questionId.toString() === questionId);
    if (alreadyAnswered) {
      return res.status(400).json({ message: 'Question already answered' });
    }

    // Get the question to check correct answer
    const question = await MCQQuestion.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
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

    console.log('✅ Answer submitted successfully:', {
      isCorrect,
      newScore: player.score,
      questionsAnswered: player.questionsAnswered
    });

    res.json({
      isCorrect,
      score: player.score,
      questionsAnswered: player.questionsAnswered,
      correctAnswers: player.correctAnswers,
      wrongAnswers: player.wrongAnswers
    });

  } catch (error) {
    console.error('❌ Submit rapid fire answer error:', error);
    res.status(500).json({ message: 'Failed to submit answer' });
  }
});

// Finish rapid fire game (called when time runs out or player finishes)
router.post('/:gameId/finish', authenticateToken, async (req, res) => {
  try {
    const { gameId } = req.params;
    console.log('🏁 Finishing rapid fire game for user:', req.user.id);

    const game = await RapidFireGame.findById(gameId).populate('players.user');
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    const player = game.players.find(p => p.user._id.toString() === req.user.id);
    if (!player) {
      return res.status(403).json({ message: 'You are not in this game' });
    }

    // Mark player as finished
    player.status = 'finished';
    player.finishedAt = new Date();

    // Check if both players are finished or if time is up
    const allFinished = game.players.every(p => p.status === 'finished' || p.status === 'left');
    const timeUp = new Date() > new Date(game.startTime.getTime() + game.timeLimit * 1000);

    if (allFinished || timeUp) {
      // End the game
      game.status = 'finished';
      game.endTime = new Date();
      
      // Determine winner
      const winner = game.determineWinner();
      
      if (winner === 'draw') {
        game.result = 'draw';
      } else if (winner) {
        game.winner = winner;
        game.result = 'win';
      }

      // Calculate rating changes for both players
      if (game.players.length === 2) {
        const [player1, player2] = game.players;
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

        // Update user ratings in database
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

        console.log('✅ Ratings updated:', {
          player1: { old: player1Rating, new: player1.ratingAfter, change: player1Change },
          player2: { old: player2Rating, new: player2.ratingAfter, change: player2Change }
        });
      }
    }

    await game.save();

    const populatedGame = await RapidFireGame.findById(game._id)
      .populate('players.user', 'username profile.avatar ratings.rapidFireRating')
      .populate('questionSet');

    console.log('✅ Rapid fire game finished');
    res.json(populatedGame);

  } catch (error) {
    console.error('❌ Finish rapid fire game error:', error);
    res.status(500).json({ message: 'Failed to finish rapid fire game' });
  }
});

// Leave rapid fire game
router.post('/:gameId/leave', authenticateToken, async (req, res) => {
  try {
    const { gameId } = req.params;
    console.log('🚪 User leaving rapid fire game:', gameId);

    const game = await RapidFireGame.findById(gameId).populate('players.user');
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    const player = game.players.find(p => p.user._id.toString() === req.user.id);
    if (!player) {
      return res.status(403).json({ message: 'You are not in this game' });
    }

    // Mark player as left
    player.status = 'left';
    player.leftAt = new Date();

    // If game is ongoing and both players leave, or one leaves and other finishes
    const activePlayers = game.players.filter(p => p.status !== 'left');
    
    if (activePlayers.length === 0 || game.status === 'ongoing') {
      // End the game based on current scores
      game.status = 'finished';
      game.endTime = new Date();
      
      const winner = game.determineWinner();
      if (winner === 'draw') {
        game.result = 'draw';
      } else if (winner) {
        game.winner = winner;
        game.result = game.players.find(p => p.status === 'left') ? 'opponent_left' : 'win';
      }
    }

    await game.save();

    console.log('✅ User left rapid fire game successfully');
    res.json({ message: 'Left game successfully' });

  } catch (error) {
    console.error('❌ Leave rapid fire game error:', error);
    res.status(500).json({ message: 'Failed to leave rapid fire game' });
  }
});

// Get rapid fire leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    console.log('🏆 Getting rapid fire leaderboard...');

    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const leaderboard = await User.find({
      'ratings.rapidFireRating': { $exists: true }
    })
    .select('username profile.avatar ratings.rapidFireRating rapidFireHistory')
    .sort({ 'ratings.rapidFireRating': -1 })
    .limit(parseInt(limit))
    .skip(skip);

    // Add rank and calculate stats
    const leaderboardWithStats = leaderboard.map((user, index) => {
      const totalGames = user.rapidFireHistory?.length || 0;
      const wins = user.rapidFireHistory?.filter(h => h.result === 'win').length || 0;
      const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : '0.0';

      return {
        rank: skip + index + 1,
        username: user.username,
        avatar: user.profile?.avatar,
        rating: user.ratings.rapidFireRating || 1200,
        totalGames,
        wins,
        winRate: parseFloat(winRate)
      };
    });

    console.log('✅ Retrieved rapid fire leaderboard:', leaderboardWithStats.length, 'users');
    res.json(leaderboardWithStats);

  } catch (error) {
    console.error('❌ Get rapid fire leaderboard error:', error);
    res.status(500).json({ message: 'Failed to get rapid fire leaderboard' });
  }
});

// Get rapid fire game by ID (for reconnection)
router.get('/game/:gameId', authenticateToken, async (req, res) => {
  try {
    const { gameId } = req.params;
    console.log('🔍 Getting rapid fire game:', gameId);

    const game = await RapidFireGame.findById(gameId)
      .populate('players.user', 'username profile.avatar ratings.rapidFireRating')
      .populate('questionSet');

    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    // Check if user is in this game
    const isPlayerInGame = game.players.some(p => p.user._id.toString() === req.user.id);
    if (!isPlayerInGame) {
      return res.status(403).json({ message: 'Not authorized to view this game' });
    }

    console.log('✅ Retrieved rapid fire game:', game._id, 'Status:', game.status);
    res.json(game);

  } catch (error) {
    console.error('❌ Get rapid fire game error:', error);
    res.status(500).json({ message: 'Failed to get game' });
  }
});

console.log('✅ Rapid Fire routes loaded');

export default router;
