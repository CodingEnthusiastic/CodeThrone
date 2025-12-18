// Add this to your backend routes or create a separate service
import express from "express"
import Contest from "../models/Contest.js"
import User from "../models/User.js"
import Problem from "../models/Problem.js"
const router = express.Router()

// Calculate Codeforces-style Elo rating changes
function calculateCodeforcesElo(participants) {
  // Sort by rank (ascending)
  participants.sort((a, b) => a.rank - b.rank);

  // Get ratings before contest
  const ratingsBefore = participants.map(p => p.user.ratings.contestRating || 1200);

  // K-factor (Codeforces uses different K values but we'll use 40 for consistency)
  const K = 40;

  // Calculate expected place for each participant
  const expectedRanks = ratingsBefore.map((rating, i) => {
    let exp = 1;
    for (let j = 0; j < ratingsBefore.length; j++) {
      if (i === j) continue;
      exp += 1 / (1 + Math.pow(10, (ratingsBefore[j] - rating) / 400));
    }
    return exp;
  });

  // Actual ranks are their position (1-based)
  const actualRanks = participants.map(p => p.rank);

  // Calculate rating change for each participant
  const ratingChanges = ratingsBefore.map((rating, i) => {
    // The lower your actual rank compared to expected, the more you gain
    const delta = K * (expectedRanks[i] - actualRanks[i]);
    return Math.round(delta);
  });

  return ratingChanges;
}

// Helper function to finalize contest rankings
const finalizeContestRankings = async (contest) => {
  try {
    // Only finalize if not already done
    if (contest.ratingsFinalized) {
      console.log(`⚠️ Contest ${contest.name} ratings already finalized, skipping`);
      return;
    }

    // Sort participants by score (descending), then by submission time (ascending) for tie-breaking
    contest.participants.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score; // Higher score = better rank
      }
      // Tie-breaker: who solved first
      const aLastSubmit = a.submissions.length > 0 ? new Date(a.submissions[a.submissions.length - 1].timeSubmitted) : new Date(0);
      const bLastSubmit = b.submissions.length > 0 ? new Date(b.submissions[b.submissions.length - 1].timeSubmitted) : new Date(0);
      return aLastSubmit - bLastSubmit;
    });

    // Assign final ranks
    let currentRank = 1;
    let prevScore = null;
    contest.participants.forEach((participant, index) => {
      if (prevScore !== null && participant.score !== prevScore) {
        currentRank = index + 1;
      }
      participant.rank = currentRank;
      prevScore = participant.score;
    });

    await contest.save();
    console.log(`✅ Finalized rankings for contest: ${contest.name}`);
  } catch (error) {
    console.error(`❌ Error finalizing rankings for ${contest.name}:`, error);
  }
};

// Function to update contest statuses and ratings when contests end
const updateContestStatusesAndRatings = async () => {
  try {
    const now = new Date()
    console.log("🔄 Checking contest statuses at:", now.toISOString())

    // Update upcoming contests to ongoing
    const startedContests = await Contest.updateMany(
      {
        status: "upcoming",
        startTime: { $lte: now },
        endTime: { $gt: now },
      },
      { status: "ongoing" },
    )
    
    if (startedContests.modifiedCount > 0) {
      console.log(`🚀 ${startedContests.modifiedCount} contests started`)
    }

    // Find contests that just ended and need rating updates
    const endingContests = await Contest.find({
      status: "ongoing",
      endTime: { $lte: now },
    }).populate("participants.user");

    if (endingContests.length > 0) {
      console.log(`🏁 ${endingContests.length} contests ending, updating ratings...`)
    }

    // Update ratings for ended contests
    for (const contest of endingContests) {
      console.log(`📊 Processing ratings for contest: ${contest.name}`)
      
      // Finalize rankings before updating ratings
      await finalizeContestRankings(contest);
      
      // Filter valid participants (those with ranks > 0)
      const validParticipants = contest.participants.filter(p => p.rank > 0 && p.user);
      
      if (validParticipants.length < 2) {
        console.log(`⚠️ Contest ${contest.name} has less than 2 valid participants, skipping rating update`)
        continue;
      }

      // Calculate rating changes
      const ratingChanges = calculateCodeforcesElo(validParticipants);

      // Update user ratings and history
      let updatedUsers = 0;
      for (let i = 0; i < validParticipants.length; i++) {
        const participant = validParticipants[i];
        const user = await User.findById(participant.user._id);
        
        if (user) {
          // Update contest rating
          const oldRating = user.ratings.contestRating || 1200;
          const newRating = Math.max(800, oldRating + ratingChanges[i]); // Minimum 800 rating
          user.ratings.contestRating = newRating;

          // Ensure contestHistory array exists
          if (!Array.isArray(user.contestHistory)) {
            user.contestHistory = [];
          }

          // Check for duplicate contest history entry
          const alreadyExists = user.contestHistory.some(h =>
            h.contest && h.contest.toString() === contest._id.toString()
          );

          if (!alreadyExists) {
            user.contestHistory.push({
              contest: contest._id,
              rank: participant.rank,
              score: participant.score,
              ratingChange: ratingChanges[i],
              problemsSolved: participant.submissions.filter(s => s.score > 0).length,
              totalProblems: contest.problems.length,
              date: contest.endTime,
            });
            
            // Update contest stats
            user.stats.contestsPlayed = (user.stats.contestsPlayed || 0) + 1;
            if (participant.rank === 1) {
              user.stats.contestsWon = (user.stats.contestsWon || 0) + 1;
            }
            
            console.log(`✅ Updated rating for ${user.username}: ${oldRating} → ${newRating} (${ratingChanges[i] > 0 ? '+' : ''}${ratingChanges[i]})`)
          } else {
            console.log(`⚠️ Contest history already exists for ${user.username}, skipping duplicate`)
          }
          
          await user.save();
          updatedUsers++;
        }
      }

      console.log(`📈 Updated ratings for ${updatedUsers} users in contest: ${contest.name}`)
    }

    // Finally, update all ended contests status
    const endedContests = await Contest.updateMany(
      {
        status: "ongoing",
        endTime: { $lte: now },
      },
      { status: "ended", ratingsFinalized: true },
    )
    
    if (endedContests.modifiedCount > 0) {
      console.log(`🔚 ${endedContests.modifiedCount} contests marked as ended and ratings finalized`)
    }

    console.log("✅ Contest statuses and ratings updated successfully")
  } catch (error) {
    console.error("❌ Error updating contest statuses and ratings:", error)
  }
}

// Get contest problems - NEW ROUTE
router.get("/:id/problems", async (req, res) => {
  console.log("📋 Get contest problems request for contest:", req.params.id);

  try {
    console.log("🔍 Finding contest with problems...");
    const contest = await Contest.findById(req.params.id)
      .populate("createdBy", "username")
      .populate({
        path: "problems.problem",
        select: "title description difficulty constraints examples testCases codeTemplates"
      })
      .populate("participants.user", "username");

    if (!contest) {
      console.log("❌ Contest not found:", req.params.id);
      return res.status(404).json({ message: "Contest not found" });
    }

    // Update status based on current time
    const actualStatus = getContestStatus(contest.startTime, contest.endTime);
    if (contest.status !== actualStatus) {
      contest.status = actualStatus;
      await contest.save();
    }

    console.log("✅ Contest problems found:", contest.name, "Problems count:", contest.problems.length);
    res.json(contest);
  } catch (error) {
    console.error("❌ Get contest problems error:", error);
    console.error("📊 Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get specific problem in contest - NEW ROUTE
router.get("/:contestId/problem/:problemId", async (req, res) => {
  console.log("🎯 Get contest problem request");
  console.log("📊 Contest ID:", req.params.contestId);
  console.log("📊 Problem ID:", req.params.problemId);

  try {
    console.log("🔍 Finding contest...");
    const contest = await Contest.findById(req.params.contestId)
      .populate("createdBy", "username")
      .populate("participants.user", "username");

    if (!contest) {
      console.log("❌ Contest not found:", req.params.contestId);
      return res.status(404).json({ message: "Contest not found" });
    }

    // Check if problem exists in this contest
    const contestProblem = contest.problems.find(p => p.problem.toString() === req.params.problemId);
    if (!contestProblem) {
      console.log("❌ Problem not found in contest:", req.params.problemId);
      return res.status(404).json({ message: "Problem not found in this contest" });
    }

    console.log("🔍 Finding problem details...");
    // You'll need to import Problem model and populate the actual problem
    // For now, returning contest info - you'll need to adjust based on your Problem model
    const actualStatus = getContestStatus(contest.startTime, contest.endTime);
    if (contest.status !== actualStatus) {
      contest.status = actualStatus;
      await contest.save();
    }

    console.log("✅ Contest problem access granted for:", contest.name);
    res.json({
      contest: {
        _id: contest._id,
        name: contest.name,
        endTime: contest.endTime,
        status: actualStatus
      },
      problemId: req.params.problemId
    });
  } catch (error) {
    console.error("❌ Get contest problem error:", error);
    console.error("📊 Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/contest/:contestId/problems", async (req, res) => {
  console.log("🎯 Get contest problem request");
  console.log("📊 Contest ID:", req.params.contestId);
  console.log("📊 Problem ID:", req.params.problemId);

  try {
    console.log("🔍 Finding contest...");
    const contest = await Contest.findById(req.params.contestId)
      .populate("createdBy", "username")
      .populate("participants.user", "username");

    if (!contest) {
      console.log("❌ Contest not found:", req.params.contestId);
      return res.status(404).json({ message: "Contest not found" });
    }

    // Check if problem exists in this contest
    const contestProblem = contest.problems.find(p => p.problem.toString() === req.params.problemId);
    if (!contestProblem) {
      console.log("❌ Problem not found in contest:", req.params.problemId);
      return res.status(404).json({ message: "Problem not found in this contest" });
    }

    console.log("🔍 Finding problem details...");
    // You'll need to import Problem model and populate the actual problem
    // For now, returning contest info - you'll need to adjust based on your Problem model
    const actualStatus = getContestStatus(contest.startTime, contest.endTime);
    if (contest.status !== actualStatus) {
      contest.status = actualStatus;
      await contest.save();
    }

    console.log("✅ Contest problem access granted for:", contest.name);
    res.json({
      contest: {
        _id: contest._id,
        name: contest.name,
        endTime: contest.endTime,
        status: actualStatus
      },
      problemId: req.params.problemId
    });
  } catch (error) {
    console.error("❌ Get contest problem error:", error);
    console.error("📊 Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
// Route to manually trigger status update
router.post("/update-statuses", async (req, res) => {
  try {
    await updateContestStatuses()
    res.json({ message: "Contest statuses updated successfully" })
  } catch (error) {
    res.status(500).json({ message: "Error updating contest statuses", error: error.message })
  }
})

router.get(
  "/:contestId/problem/:problemId",
  async (req, res) => {
    const { contestId, problemId } = req.params;
    // load contest and populate the referenced problem
    const contest = await Contest.findById(contestId)
      .populate("createdBy", "username")
      .populate("participants.user", "username")
      .populate({
        path: "problems.problem",
        select: "title description difficulty constraints examples testCases codeTemplates"
      });

    if (!contest) {
      return res.status(404).json({ message: "Contest not found" });
    }

    // find the right sub‑doc
    const entry = contest.problems.find(
      (p) => p.problem._id.toString() === problemId
    );
    if (!entry) {
      return res.status(404).json({ message: "Problem not found in this contest" });
    }

    // now entry.problem is the full Problem document
    const problem = entry.problem;

    // optionally update contest.status here…

    res.json({
      contest: {
        _id: contest._id,
        name: contest.name,
        endTime: contest.endTime,
        status: getContestStatus(contest.startTime, contest.endTime),
      },
      problem,  // <-- full problem JSON
    });
  }
);

// Route to manually trigger contest status and rating updates (admin only)
router.post("/update-contests", async (req, res) => {
  try {
    console.log("🔄 Manual trigger: Updating contest statuses and ratings");
    await updateContestStatusesAndRatings();
    res.json({ message: "Contest statuses and ratings updated successfully" });
  } catch (error) {
    console.error("❌ Manual contest update error:", error);
    res.status(500).json({ message: "Failed to update contests", error: error.message });
  }
});

// CRITICAL: Immediate endpoint to finalize ratings for a specific contest when it ends
// Called immediately when contest end time is reached, not waiting for 60s poll
router.post("/:contestId/finalize-ratings", async (req, res) => {
  try {
    const { contestId } = req.params;
    console.log(`🏁 IMMEDIATE: Finalizing ratings for contest ${contestId}`);

    const contest = await Contest.findById(contestId)
      .populate("participants.user");

    if (!contest) {
      return res.status(404).json({ message: "Contest not found" });
    }

    // Check if already finalized
    if (contest.ratingsFinalized) {
      console.log(`⚠️ Contest ${contest.name} ratings already finalized`);
      return res.status(200).json({ message: "Ratings already finalized", alreadyFinalized: true });
    }

    // Only finalize if contest has actually ended
    const actualStatus = getContestStatus(contest.startTime, contest.endTime);
    if (actualStatus !== "ended") {
      return res.status(400).json({ message: "Contest has not ended yet" });
    }

    console.log(`🔍 Finalizing rankings and calculating ratings for: ${contest.name}`);

    // Finalize rankings
    await finalizeContestRankings(contest);

    // Get updated contest with finalized rankings
    const updatedContest = await Contest.findById(contestId)
      .populate("participants.user");

    // Filter valid participants
    const validParticipants = updatedContest.participants.filter(p => p.rank > 0 && p.user);

    if (validParticipants.length < 2) {
      console.log(`⚠️ Contest has less than 2 valid participants`);
      updatedContest.ratingsFinalized = true;
      await updatedContest.save();
      return res.status(200).json({ message: "Contest finalized but insufficient participants for rating calculation" });
    }

    // Calculate Elo ratings
    const ratingChanges = calculateCodeforcesElo(validParticipants);

    // Update user ratings and history
    let updatedUsers = 0;
    for (let i = 0; i < validParticipants.length; i++) {
      const participant = validParticipants[i];
      const user = await User.findById(participant.user._id);

      if (user) {
        const oldRating = user.ratings.contestRating || 1200;
        const newRating = Math.max(800, oldRating + ratingChanges[i]);
        user.ratings.contestRating = newRating;

        if (!Array.isArray(user.contestHistory)) {
          user.contestHistory = [];
        }

        // Prevent duplicates
        const alreadyExists = user.contestHistory.some(h =>
          h.contest && h.contest.toString() === contestId
        );

        if (!alreadyExists) {
          user.contestHistory.push({
            contest: contestId,
            rank: participant.rank,
            score: participant.score,
            ratingChange: ratingChanges[i],
            problemsSolved: participant.submissions.filter(s => s.score > 0).length,
            totalProblems: updatedContest.problems.length,
            date: updatedContest.endTime,
          });

          user.stats.contestsPlayed = (user.stats.contestsPlayed || 0) + 1;
          if (participant.rank === 1) {
            user.stats.contestsWon = (user.stats.contestsWon || 0) + 1;
          }

          console.log(`✅ ${user.username}: ${oldRating} → ${newRating} (${ratingChanges[i] > 0 ? '+' : ''}${ratingChanges[i]})`);
        }

        await user.save();
        updatedUsers++;
      }
    }

    // Mark ratings as finalized
    updatedContest.ratingsFinalized = true;
    updatedContest.status = "ended";
    await updatedContest.save();

    console.log(`✅ Finalized ratings for ${updatedUsers} users`);
    res.json({
      message: "Ratings finalized successfully",
      updatedUsers,
      contestName: updatedContest.name,
    });
  } catch (error) {
    console.error("❌ Error finalizing ratings:", error);
    res.status(500).json({ message: "Failed to finalize ratings", error: error.message });
  }
});

// Helper to get contest status (duplicated from contest.js for modularity)
const getContestStatus = (startTime, endTime) => {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (now < start) {
    return "upcoming";
  } else if (now >= start && now <= end) {
    return "ongoing";
  } else {
    return "ended";
  }
};

// Set up automatic status and rating updates every minute
setInterval(updateContestStatusesAndRatings, 60000); // Run every minute

export { updateContestStatusesAndRatings, finalizeContestRankings };
export default router;
