import User from '../models/User.js';

/**
 * Update user stats after a game result
 * @param {string} userId - User ID
 * @param {string} gameType - Type of game ('game', 'rapidfire', 'contest')
 * @param {string} result - Result ('W', 'L', 'D')
 * @param {number} ratingChange - Optional rating change
 */
export const updateGameResult = async (userId, gameType, result, ratingChange = 0) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Initialize stats if not present
    if (!user.stats) {
      user.stats = {};
    }

    // Initialize recentGameForm if not present
    if (!user.recentGameForm) {
      user.recentGameForm = [];
    }

    // Update game-specific stats
    switch (gameType) {
      case 'game':
        user.stats.gamesPlayed = (user.stats.gamesPlayed || 0) + 1;
        if (result === 'W') {
          user.stats.gamesWon = (user.stats.gamesWon || 0) + 1;
        } else if (result === 'L') {
          user.stats.gamesLost = (user.stats.gamesLost || 0) + 1;
        } else if (result === 'D') {
          user.stats.gamesTied = (user.stats.gamesTied || 0) + 1;
        }
        // Update game rating if provided
        if (ratingChange !== 0) {
          user.stats.gameRating = (user.stats.gameRating || 1200) + ratingChange;
        }
        break;

      case 'rapidfire':
        user.stats.rapidFireGamesPlayed = (user.stats.rapidFireGamesPlayed || 0) + 1;
        if (result === 'W') {
          user.stats.rapidFireGamesWon = (user.stats.rapidFireGamesWon || 0) + 1;
        } else if (result === 'L') {
          user.stats.rapidFireGamesLost = (user.stats.rapidFireGamesLost || 0) + 1;
        } else if (result === 'D') {
          user.stats.rapidFireGamesTied = (user.stats.rapidFireGamesTied || 0) + 1;
        }
        // Update rapid fire rating if provided
        if (ratingChange !== 0) {
          user.stats.rapidFireRating = (user.stats.rapidFireRating || 1200) + ratingChange;
        }
        break;

      case 'contest':
        user.stats.contestsPlayed = (user.stats.contestsPlayed || 0) + 1;
        if (result === 'W') {
          user.stats.contestsWon = (user.stats.contestsWon || 0) + 1;
        } else if (result === 'L') {
          user.stats.contestsLost = (user.stats.contestsLost || 0) + 1;
        } else if (result === 'D') {
          user.stats.contestsTied = (user.stats.contestsTied || 0) + 1;
        }
        // Update contest rating if provided
        if (ratingChange !== 0) {
          user.stats.contestRating = (user.stats.contestRating || 1200) + ratingChange;
        }
        break;

      default:
        throw new Error('Invalid game type');
    }

    // Update recent game form (last 5 results)
    const formEntry = {
      gameType,
      result,
      date: new Date()
    };

    user.recentGameForm.unshift(formEntry);
    
    // Keep only last 20 games for filtering
    if (user.recentGameForm.length > 20) {
      user.recentGameForm = user.recentGameForm.slice(0, 20);
    }

    await user.save();
    return user;
  } catch (error) {
    console.error('Error updating game result:', error);
    throw error;
  }
};

/**
 * Calculate rating change based on ELO system
 * @param {number} playerRating - Current player rating
 * @param {number} opponentRating - Opponent rating
 * @param {string} result - Result ('W', 'L', 'D')
 * @param {number} kFactor - K-factor for ELO calculation
 * @returns {number} Rating change
 */
export const calculateRatingChange = (playerRating, opponentRating, result, kFactor = 32) => {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  let actualScore;
  
  switch (result) {
    case 'W': actualScore = 1; break;
    case 'L': actualScore = 0; break;
    case 'D': actualScore = 0.5; break;
    default: actualScore = 0;
  }
  
  return Math.round(kFactor * (actualScore - expectedScore));
};

/**
 * Batch update game results for multiple users
 * @param {Array} updates - Array of {userId, gameType, result, ratingChange}
 */
export const batchUpdateGameResults = async (updates) => {
  try {
    const promises = updates.map(update => 
      updateGameResult(update.userId, update.gameType, update.result, update.ratingChange)
    );
    
    await Promise.all(promises);
  } catch (error) {
    console.error('Error in batch update:', error);
    throw error;
  }
};
