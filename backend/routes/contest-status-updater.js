// Add this to your backend routes or create a separate service
import express from "express"
import Contest from "../models/Contest.js"
import Problem from "../models/Problem.js"
const router = express.Router()

// Function to update contest statuses
const updateContestStatuses = async () => {
  try {
    const now = new Date()

    // Update upcoming contests to ongoing
    await Contest.updateMany(
      {
        status: "upcoming",
        startTime: { $lte: now },
        endTime: { $gt: now },
      },
      { status: "ongoing" },
    )

    // Update ongoing contests to ended
    await Contest.updateMany(
      {
        status: "ongoing",
        endTime: { $lte: now },
      },
      { status: "ended" },
    )

    console.log("Contest statuses updated successfully")
  } catch (error) {
    console.error("Error updating contest statuses:", error)
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

// Set up automatic status updates every minute
setInterval(updateContestStatuses, 60000) // Run every minute

export default router
export { updateContestStatuses }
