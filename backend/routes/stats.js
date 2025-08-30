import express from 'express';
import User from '../models/User.js';
import Problem from '../models/Problem.js';
import Game from '../models/Game.js';
// import Submission from '../models/Submission.js';

const router = express.Router();

// FIXED: Get platform statistics with real data from database
router.get('/platform', async (req, res) => {
  console.log('📊 Fetching platform statistics...');
  
  try {
    // ASSUMPTION: These models exist in your database
    const [
      totalUsers,
      totalProblems,
      totalSubmissions,
      activeGames,
      topRatedUser,
      allUsers
    ] = await Promise.all([
      User.countDocuments(),
      Problem.countDocuments({ isPublished: true }),
      Submission.countDocuments(),
      Game.countDocuments({ status: 'ongoing' }),
      User.findOne({}, { username: 1, 'ratings.gameRating': 1 })
        .sort({ 'ratings.gameRating': -1 })
        .limit(1),
      User.find({ 'ratings.gameRating': { $exists: true } }, { 'ratings.gameRating': 1 })
    ]);

    // Calculate average rating
    const validRatings = allUsers
      .map(user => user.ratings?.gameRating)
      .filter(rating => rating && rating > 0);
    
    const averageRating = validRatings.length > 0 
      ? Math.round(validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length)
      : 1200;

    const stats = {
      totalUsers,
      totalProblems,
      totalSubmissions,
      activeGames,
      averageRating,
      topRatedUser: topRatedUser ? {
        username: topRatedUser.username,
        rating: topRatedUser.ratings?.gameRating || 1200
      } : null
    };

    console.log('✅ Platform statistics calculated:', stats);
    res.json(stats);

  } catch (error) {
    console.error('❌ Error fetching platform statistics:', error);
    res.status(500).json({ 
      message: 'Failed to fetch platform statistics',
      error: error.message 
    });
  }
});

// FIXED: Get recent activity with real data
router.get('/recent-activity', async (req, res) => {
  console.log('📈 Fetching recent activity...');
  
  try {
    // ASSUMPTION: Your models have the necessary fields for activity tracking
    const [recentSubmissions, recentGames] = await Promise.all([
      Submission.find({ status: 'Accepted' })
        .populate('user', 'username')
        .populate('problem', 'title')
        .sort({ submittedAt: -1 })
        .limit(10),
      Game.find({ status: 'finished', winner: { $exists: true } })
        .populate('winner', 'username')
        .populate('players.user', 'username')
        .sort({ endTime: -1 })
        .limit(10)
    ]);

    const activities = [];

    // Add submission activities
    recentSubmissions.forEach(submission => {
      if (submission.user && submission.problem) {
        activities.push({
          type: 'submission',
          user: submission.user.username,
          description: `solved "${submission.problem.title}" problem`,
          timestamp: submission.submittedAt || submission.createdAt
        });
      }
    });

    // Add game activities
    recentGames.forEach(game => {
      if (game.winner) {
        const opponent = game.players.find(p => 
          p.user && p.user._id.toString() !== game.winner._id.toString()
        );
        
        activities.push({
          type: 'game',
          user: game.winner.username,
          description: opponent 
            ? `won a game against ${opponent.user.username}`
            : 'won a coding game',
          timestamp: game.endTime || game.createdAt
        });
      }
    });

    // Sort by timestamp and limit
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const recentActivity = activities.slice(0, 15);

    console.log('✅ Recent activity fetched:', recentActivity.length, 'activities');
    res.json(recentActivity);

  } catch (error) {
    console.error('❌ Error fetching recent activity:', error);
    res.status(500).json({ 
      message: 'Failed to fetch recent activity',
      error: error.message 
    });
  }
});

// FIXED: Get leaderboard with real data
router.get('/leaderboard', async (req, res) => {
  console.log('🏆 Fetching leaderboard...');
  
  try {
    // ASSUMPTION: Users have gameHistory array for calculating win rates
    const users = await User.find(
      { 'ratings.gameRating': { $exists: true, $gt: 0 } },
      { 
        username: 1, 
        'ratings.gameRating': 1, 
        gameHistory: 1,
        'stats.gamesPlayed': 1
      }
    ).sort({ 'ratings.gameRating': -1 }).limit(50);

    const leaderboard = users.map(user => {
      const gamesPlayed = user.stats?.gamesPlayed || user.gameHistory?.length || 0;
      const wins = user.gameHistory?.filter(game => game.result === 'win').length || 0;
      const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;

      return {
        username: user.username,
        rating: user.ratings?.gameRating || 1200,
        gamesPlayed,
        winRate
      };
    });

    console.log('✅ Leaderboard fetched:', leaderboard.length, 'players');
    res.json(leaderboard);

  } catch (error) {
    console.error('❌ Error fetching leaderboard:', error);
    res.status(500).json({ 
      message: 'Failed to fetch leaderboard',
      error: error.message 
    });
  }
});

// Get user-specific statistics
router.get('/user/:userId', async (req, res) => {
  console.log('👤 Fetching user statistics for:', req.params.userId);
  
  try {
    const userId = req.params.userId;
    
    const [user, userSubmissions, userGames] = await Promise.all([
      User.findById(userId, { 
        username: 1, 
        'ratings.gameRating': 1, 
        'stats': 1,
        gameHistory: 1 
      }),
      Submission.countDocuments({ user: userId, status: 'Accepted' }),
      Game.countDocuments({ 
        'players.user': userId, 
        status: 'finished' 
      })
    ]);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const wins = user.gameHistory?.filter(game => game.result === 'win').length || 0;
    const winRate = userGames > 0 ? Math.round((wins / userGames) * 100) : 0;

    const userStats = {
      username: user.username,
      rating: user.ratings?.gameRating || 1200,
      problemsSolved: userSubmissions,
      gamesPlayed: userGames,
      winRate,
      totalSubmissions: user.stats?.totalSubmissions || 0
    };

    console.log('✅ User statistics fetched:', userStats);
    res.json(userStats);

  } catch (error) {
    console.error('❌ Error fetching user statistics:', error);
    res.status(500).json({ 
      message: 'Failed to fetch user statistics',
      error: error.message 
    });
  }
});

router.get('/global-leaderboard', async (req, res) => {
  try {
    // Fetch all users with ratings
    const users = await User.find({}, 'username ratings profile');
    console.log("Leaderboard userrs",users);
    // Sort by contest rating and get top 5
    const topContest = users
      .filter(u => typeof u.ratings?.contestRating === 'number')
      .sort((a, b) => b.ratings.contestRating - a.ratings.contestRating)
      .slice(0, 5);
    console.log(topContest);
    // Sort by game rating and get top 5
    const topGame = users
      .filter(u => typeof u.ratings?.gameRating === 'number')
      .sort((a, b) => b.ratings.gameRating - a.ratings.gameRating)
      .slice(0, 5);
    console.log(topGame);
    
    // Sort by rapid fire rating and get top 5
    const topRapidFire = users
      .filter(u => typeof u.ratings?.rapidFireRating === 'number')
      .sort((a, b) => b.ratings.rapidFireRating - a.ratings.rapidFireRating)
      .slice(0, 5);
    console.log(topRapidFire);
    
    res.json({ topContest, topGame, topRapidFire });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;


