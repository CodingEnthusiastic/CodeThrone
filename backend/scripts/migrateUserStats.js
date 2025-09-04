import mongoose from 'mongoose';
import User from '../models/User.js';
import Contest from '../models/Contest.js';

// Migration script to populate missing Loss/Draw statistics from existing history data
const migrateUserStats = async () => {
  try {
    console.log('🔄 Starting user stats migration...');
    
    const users = await User.find({});
    let updatedCount = 0;
    
    for (const user of users) {
      let updated = false;
      
      // Initialize stats if not present
      if (!user.stats) {
        user.stats = {};
        updated = true;
      }
      
      // Migrate game stats from gameHistory
      if (user.gameHistory && user.gameHistory.length > 0) {
        const gameStats = {
          wins: user.gameHistory.filter(g => g.result === 'win').length,
          losses: user.gameHistory.filter(g => g.result === 'lose').length,
          draws: user.gameHistory.filter(g => g.result === 'draw').length
        };
        
        if (user.stats.gamesLost !== gameStats.losses || user.stats.gamesTied !== gameStats.draws) {
          user.stats.gamesPlayed = user.gameHistory.length;
          user.stats.gamesWon = gameStats.wins;
          user.stats.gamesLost = gameStats.losses;
          user.stats.gamesTied = gameStats.draws;
          updated = true;
        }
      }
      
      // Migrate rapidfire stats from rapidFireHistory
      if (user.rapidFireHistory && user.rapidFireHistory.length > 0) {
        const rfStats = {
          wins: user.rapidFireHistory.filter(g => g.result === 'win').length,
          losses: user.rapidFireHistory.filter(g => g.result === 'lose').length,
          draws: user.rapidFireHistory.filter(g => g.result === 'draw').length
        };
        
        if (user.stats.rapidFireGamesLost !== rfStats.losses || user.stats.rapidFireGamesTied !== rfStats.draws) {
          user.stats.rapidFireGamesPlayed = user.rapidFireHistory.length;
          user.stats.rapidFireGamesWon = rfStats.wins;
          user.stats.rapidFireGamesLost = rfStats.losses;
          user.stats.rapidFireGamesTied = rfStats.draws;
          updated = true;
        }
      }
      
      // Migrate contest stats from contestHistory
      if (user.contestHistory && user.contestHistory.length > 0) {
        // For contests, we need a different approach since there's no direct win/lose/draw
        // Let's assume: 1st place = win, last place = loss, middle = draw
        const contestStats = {
          played: user.contestHistory.length,
          wins: 0,
          losses: 0,
          draws: 0
        };
        
        // We'll need to look up actual contest data to determine win/loss
        for (const contestEntry of user.contestHistory) {
          if (contestEntry.rank === 1) {
            contestStats.wins++;
          } else if (contestEntry.rank && contestEntry.rank > 10) { // Consider bottom performers as losses
            contestStats.losses++;
          } else {
            contestStats.draws++;
          }
        }
        
        if (user.stats.contestsLost !== contestStats.losses || user.stats.contestsTied !== contestStats.draws) {
          user.stats.contestsPlayed = contestStats.played;
          user.stats.contestsWon = contestStats.wins;
          user.stats.contestsLost = contestStats.losses;
          user.stats.contestsTied = contestStats.draws;
          updated = true;
        }
      }
      
      // Update recentGameForm from all history
      const allGames = [];
      
      // Add game results
      if (user.gameHistory) {
        user.gameHistory.forEach(game => {
          allGames.push({
            result: game.result === 'win' ? 'W' : game.result === 'lose' ? 'L' : 'D',
            gameType: 'game',
            date: game.date,
            ratingChange: game.ratingChange
          });
        });
      }
      
      // Add rapidfire results
      if (user.rapidFireHistory) {
        user.rapidFireHistory.forEach(game => {
          allGames.push({
            result: game.result === 'win' ? 'W' : game.result === 'lose' ? 'L' : 'D',
            gameType: 'rapidfire',
            date: game.date,
            ratingChange: game.ratingChange
          });
        });
      }
      
      // Add contest results
      if (user.contestHistory) {
        user.contestHistory.forEach(contest => {
          let result = 'D'; // Default to draw
          if (contest.rank === 1) result = 'W';
          else if (contest.rank && contest.rank > 10) result = 'L';
          
          allGames.push({
            result,
            gameType: 'contest',
            date: contest.date,
            ratingChange: contest.ratingChange
          });
        });
      }
      
      // Sort by date and take last 20
      allGames.sort((a, b) => new Date(b.date) - new Date(a.date));
      const recentGames = allGames.slice(0, 20);
      
      if (!user.recentGameForm || user.recentGameForm.length !== recentGames.length) {
        user.recentGameForm = recentGames;
        updated = true;
      }
      
      if (updated) {
        await user.save();
        updatedCount++;
        console.log(`✅ Updated stats for user: ${user.username}`);
      }
    }
    
    console.log(`🎉 Migration completed! Updated ${updatedCount} users.`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
};

export default migrateUserStats;
