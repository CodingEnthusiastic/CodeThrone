// Usage: node scripts/backfillContestHistory.js
// This script backfills users' contestHistory based on contests' participants arrays.


import mongoose from 'mongoose';
import User from '../models/User.js';
import Contest from '../models/Contest.js';
import dotenv from 'dotenv';

// dotenv.config();
dotenv.config({ path: '../.env' });
const MONGO_URI = process.env.MONGODB_URI;
console.log(MONGO_URI);
async function backfillContestHistory() {
  await mongoose.connect(MONGO_URI);
  const contests = await Contest.find({});
  let updatedCount = 0;

  // Step 1: Backfill contestHistory as before
  for (const contest of contests) {
    // Gather all participants for Elo calculation
    const participantIds = contest.participants.map(p => p.user);
    const users = await User.find({ _id: { $in: participantIds } });
    // Prepare ratings map
    const ratingsMap = {};
    users.forEach(u => {
      ratingsMap[u._id] = u.ratings?.contestRating || 1200;
    });

    // Step 2: Calculate Elo rating changes for all participants
    // Simple Elo: Each user compared to every other, K=40
    const K = 40;
    for (const participant of contest.participants) {
      const user = users.find(u => u._id.toString() === participant.user.toString());
      if (!user) continue;
      // Find contestHistory entry for this contest
      let historyEntry = user.contestHistory.find(
        (entry) => entry.contest && entry.contest.toString() === contest._id.toString()
      );
      // If not present, add it
      if (!historyEntry) {
        historyEntry = {
          contest: contest._id,
          rank: participant.rank || 0,
          score: participant.score || 0,
          ratingChange: 0,
          problemsSolved: participant.problemsSolved || 0,
          totalProblems: Array.isArray(contest.problems) ? contest.problems.length : 0,
          date: contest.endTime || contest.startTime,
        };
        user.contestHistory.push(historyEntry);
        updatedCount++;
      }
      // If score is 0 or rank is 0, no rating change
      let ratingChange = 0;
      if ((participant.score || 0) === 0 || (participant.rank || 0) === 0) {
        ratingChange = 0;
      } else {
        for (const opponent of contest.participants) {
          if (opponent.user.toString() === participant.user.toString()) continue;
          const userRating = ratingsMap[participant.user] || 1200;
          const oppRating = ratingsMap[opponent.user] || 1200;
          // Win if better rank
          const S = (participant.rank < opponent.rank) ? 1 : (participant.rank === opponent.rank ? 0.5 : 0);
          const EA = 1 / (1 + Math.pow(10, (oppRating - userRating) / 400));
          ratingChange += Math.round(K * (S - EA));
        }
        // Average over all opponents
        if (contest.participants.length > 1) {
          ratingChange = Math.round(ratingChange / (contest.participants.length - 1));
        }
      }
      historyEntry.ratingChange = ratingChange;
      // Update user's rating for next contest
      ratingsMap[participant.user] += ratingChange;
    }
    // Step 3: Save all users with updated contestHistory and contestRating
    for (const user of users) {
      // Recalculate contestRating from initial + all ratingChanges
      const initialRating = 1200;
      const totalRatingChange = user.contestHistory.reduce((acc, entry) => acc + (entry.ratingChange || 0), 0);
      user.ratings.contestRating = initialRating + totalRatingChange;
      await user.save();
    }
  }
  console.log(`Backfill complete. Updated ${updatedCount} contestHistory entries and contest ratings with Elo calculation.`);
  mongoose.disconnect();
}


// Run every 10 minutes
setInterval(() => {
  console.log('⏰ Running contest history backfill...');
  backfillContestHistory();
}, 10 * 60 * 1000);

// Run once immediately on startup
backfillContestHistory();
