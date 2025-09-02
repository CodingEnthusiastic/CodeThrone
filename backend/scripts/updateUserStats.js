import '../loadenv.js'; // Load environment variables first
import mongoose from 'mongoose';
import User from '../models/User.js';
import Game from '../models/Game.js';
import Contest from '../models/Contest.js';
import RapidFireGame from '../models/RapidFireGame.js';

const updateUserStats = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const users = await User.find({});
    console.log(`📊 Found ${users.length} users to update`);

    for (const user of users) {
      let updated = false;
      
      // Update game stats from gameHistory
      if (user.gameHistory && user.gameHistory.length > 0) {
        const gamesPlayed = user.gameHistory.length;
        const gamesWon = user.gameHistory.filter(game => game.result === 'win').length;
        
        if (user.stats.gamesPlayed !== gamesPlayed || user.stats.gamesWon !== gamesWon) {
          user.stats.gamesPlayed = gamesPlayed;
          user.stats.gamesWon = gamesWon;
          updated = true;
          console.log(`🎮 Updated ${user.username}: games ${gamesPlayed}, wins ${gamesWon}`);
        }
      }
      
      // Update contest stats from contestHistory
      if (user.contestHistory && user.contestHistory.length > 0) {
        const contestsPlayed = user.contestHistory.length;
        const contestsWon = user.contestHistory.filter(contest => contest.rank === 1).length;
        
        if (user.stats.contestsPlayed !== contestsPlayed || user.stats.contestsWon !== contestsWon) {
          user.stats.contestsPlayed = contestsPlayed;
          user.stats.contestsWon = contestsWon;
          updated = true;
          console.log(`🏆 Updated ${user.username}: contests ${contestsPlayed}, wins ${contestsWon}`);
        }
      }
      
      // Update rapidfire stats from rapidFireHistory
      if (user.rapidFireHistory && user.rapidFireHistory.length > 0) {
        const rapidFireGamesPlayed = user.rapidFireHistory.length;
        const rapidFireGamesWon = user.rapidFireHistory.filter(game => game.result === 'win').length;
        
        if (user.stats.rapidFireGamesPlayed !== rapidFireGamesPlayed || user.stats.rapidFireGamesWon !== rapidFireGamesWon) {
          user.stats.rapidFireGamesPlayed = rapidFireGamesPlayed;
          user.stats.rapidFireGamesWon = rapidFireGamesWon;
          updated = true;
          console.log(`⚡ Updated ${user.username}: rapidfire ${rapidFireGamesPlayed}, wins ${rapidFireGamesWon}`);
        }
      }
      
      // Alternative: Count from Game collection if gameHistory is missing
      if (!user.gameHistory || user.gameHistory.length === 0) {
        const gameCount = await Game.countDocuments({
          'players.user': user._id,
          status: 'finished'
        });
        
        const wonGames = await Game.countDocuments({
          'players.user': user._id,
          status: 'finished',
          winner: user._id
        });
        
        if (gameCount > 0 && (user.stats.gamesPlayed !== gameCount || user.stats.gamesWon !== wonGames)) {
          user.stats.gamesPlayed = gameCount;
          user.stats.gamesWon = wonGames;
          updated = true;
          console.log(`🎮 Counted from Games collection for ${user.username}: games ${gameCount}, wins ${wonGames}`);
        }
      }
      
      // Alternative: Count from Contest collection if contestHistory is missing
      if (!user.contestHistory || user.contestHistory.length === 0) {
        const contestCount = await Contest.countDocuments({
          'participants.user': user._id,
          status: 'ended'
        });
        
        const wonContests = await Contest.countDocuments({
          'participants.user': user._id,
          status: 'ended',
          'participants': {
            $elemMatch: {
              user: user._id,
              rank: 1
            }
          }
        });
        
        if (contestCount > 0 && (user.stats.contestsPlayed !== contestCount || user.stats.contestsWon !== wonContests)) {
          user.stats.contestsPlayed = contestCount;
          user.stats.contestsWon = wonContests;
          updated = true;
          console.log(`🏆 Counted from Contests collection for ${user.username}: contests ${contestCount}, wins ${wonContests}`);
        }
      }
      
      // Alternative: Count from RapidFireGame collection if rapidFireHistory is missing
      if (!user.rapidFireHistory || user.rapidFireHistory.length === 0) {
        const rapidFireCount = await RapidFireGame.countDocuments({
          'players.user': user._id,
          status: 'finished'
        });
        
        const wonRapidFire = await RapidFireGame.countDocuments({
          'players.user': user._id,
          status: 'finished',
          'players': {
            $elemMatch: {
              user: user._id,
              position: 1
            }
          }
        });
        
        if (rapidFireCount > 0 && (user.stats.rapidFireGamesPlayed !== rapidFireCount || user.stats.rapidFireGamesWon !== wonRapidFire)) {
          user.stats.rapidFireGamesPlayed = rapidFireCount;
          user.stats.rapidFireGamesWon = wonRapidFire;
          updated = true;
          console.log(`⚡ Counted from RapidFireGames collection for ${user.username}: rapidfire ${rapidFireCount}, wins ${wonRapidFire}`);
        }
      }
      
      if (updated) {
        await user.save();
        console.log(`✅ Saved stats for ${user.username}`);
      }
    }
    
    console.log('🎉 Stats migration completed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

updateUserStats();
