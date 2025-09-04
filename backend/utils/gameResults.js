import User from '../models/User.js';

/**
 * Update user stats and recent game form after a game/contest/rapidfire
 * @param {String} userId - User ID
 * @param {String} gameType - 'game', 'contest', or 'rapidfire'
 * @param {String} result - 'W' (win), 'L' (loss), or 'D' (draw/tie)
 * @param {Number} ratingChange - Rating change (optional)
 */
export const updateGameResult = async (userId, gameType, result, ratingChange = 0) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Update stats based on game type
    const statsField = `stats.${gameType === 'rapidfire' ? 'rapidFire' : gameType}s`;
    
    // Increment played count
    user.stats[`${gameType === 'rapidfire' ? 'rapidFire' : gameType}sPlayed`] += 1;

    // Update win/loss/tie counts
    if (result === 'W') {
      user.stats[`${gameType === 'rapidfire' ? 'rapidFire' : gameType}sWon`] += 1;
    } else if (result === 'L') {
      user.stats[`${gameType === 'rapidfire' ? 'rapidFire' : gameType}sLost`] += 1;
    } else if (result === 'D') {
      user.stats[`${gameType === 'rapidfire' ? 'rapidFire' : gameType}sTied`] += 1;
    }

    // Update rating
    const ratingField = `${gameType === 'rapidfire' ? 'rapidFire' : gameType}Rating`;
    user.ratings[ratingField] = Math.max(0, user.ratings[ratingField] + ratingChange);

    // Add to recent game form (keep only last 10, but we'll display only 5)
    user.recentGameForm.unshift({
      result,
      gameType,
      date: new Date(),
      ratingChange
    });

    // Keep only last 10 game results
    if (user.recentGameForm.length > 10) {
      user.recentGameForm = user.recentGameForm.slice(0, 10);
    }

    await user.save();
    
    return {
      success: true,
      message: 'Game result updated successfully',
      newRating: user.ratings[ratingField],
      newStats: {
        played: user.stats[`${gameType === 'rapidfire' ? 'rapidFire' : gameType}sPlayed`],
        won: user.stats[`${gameType === 'rapidfire' ? 'rapidFire' : gameType}sWon`],
        lost: user.stats[`${gameType === 'rapidfire' ? 'rapidFire' : gameType}sLost`],
        tied: user.stats[`${gameType === 'rapidfire' ? 'rapidFire' : gameType}sTied`]
      }
    };
  } catch (error) {
    console.error('Error updating game result:', error);
    throw error;
  }
};

/**
 * Calculate ELO rating change
 * @param {Number} playerRating - Current player rating
 * @param {Number} opponentRating - Opponent rating
 * @param {Number} score - Game score (1 = win, 0.5 = draw, 0 = loss)
 * @param {Number} kFactor - K-factor for rating calculation (default: 32)
 */
export const calculateRatingChange = (playerRating, opponentRating, score, kFactor = 32) => {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const ratingChange = Math.round(kFactor * (score - expectedScore));
  return ratingChange;
};

/**
 * Batch update multiple users' game results
 * @param {Array} updates - Array of {userId, gameType, result, ratingChange}
 */
export const batchUpdateGameResults = async (updates) => {
  try {
    const promises = updates.map(update => 
      updateGameResult(update.userId, update.gameType, update.result, update.ratingChange)
    );
    
    const results = await Promise.all(promises);
    return {
      success: true,
      message: 'Batch update completed',
      results
    };
  } catch (error) {
    console.error('Error in batch update:', error);
    throw error;
  }
};
