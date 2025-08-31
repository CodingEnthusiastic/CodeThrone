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
              date: new Date(),
            });
            
            console.log(`✅ Updated rating for ${user.username}: ${oldRating} → ${newRating} (${ratingChanges[i] > 0 ? '+' : ''}${ratingChanges[i]})`)
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
      { status: "ended" },
    )
    
    if (endedContests.modifiedCount > 0) {
      console.log(`🔚 ${endedContests.modifiedCount} contests marked as ended`)
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
    await updateContestStatusesAndRatings();
    res.json({ message: "Contest statuses and ratings updated successfully" });
  } catch (error) {
    console.error("❌ Manual contest update error:", error);
    res.status(500).json({ message: "Failed to update contests", error: error.message });
  }
});

// Set up automatic status and rating updates every minute
setInterval(updateContestStatusesAndRatings, 60000); // Run every minute

export { updateContestStatusesAndRatings };
export default router;
