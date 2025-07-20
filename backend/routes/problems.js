// 
import express from 'express';
import Problem from '../models/Problem.js';
import User from '../models/User.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get problems by company
router.get('/company', async (req, res) => {
  console.log('🏢 Get company statistics request')
  try {
    const companyStats = await Problem.aggregate([
      { $match: { isPublished: true } },
      { $unwind: '$companies' },
      {
        $group: {
          _id: '$companies',
          count: { $sum: 1 },
          avgAcceptanceRate: { $avg: '$acceptanceRate' },
          totalSubmissions: { $sum: '$submissions' },
          easyCount: {
            $sum: { $cond: [{ $eq: ['$difficulty', 'Easy'] }, 1, 0] }
          },
          mediumCount: {
            $sum: { $cond: [{ $eq: ['$difficulty', 'Medium'] }, 1, 0] }
          },
          hardCount: {
            $sum: { $cond: [{ $eq: ['$difficulty', 'Hard'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          company: '$_id',
          count: 1,
          avgAcceptanceRate: {
            $round: ['$avgAcceptanceRate', 2]
          },
          totalSubmissions: 1,
          easyCount: 1,
          mediumCount: 1,
          hardCount: 1,
          _id: 0
        }
      }
    ]);

    console.log('✅ Company stats generated:', companyStats.length, 'companies')
    res.json(companyStats)
  } catch (error) {
    console.error('❌ Error generating company stats:', error)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.get("/topic", async (req, res) => {
  console.log("📚 Get problems by topic request")
  console.log("📊 Query params:", req.query)

  try {
    const { page = 1, limit = 20, difficulty, topic } = req.query

    if (!topic) {
      return res.status(400).json({ message: "Topic parameter is required" })
    }

    const query = {
      isPublished: true,
      tags: { $in: [topic] }, // Filter by the single topic provided
    }
    if (difficulty) {
      query.difficulty = difficulty
      console.log("🎯 Filtering by difficulty:", difficulty)
    }
    console.log("🔍 Database query for topic problems:", query)

    const problems = await Problem.find(query)
      .select("-testCases -referenceSolution")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("createdBy", "username")
    const total = await Problem.countDocuments(query)
    console.log("✅ Found topic problems:", problems.length, "Total:", total)
    res.json({
      problems,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      topic,
    })
  } catch (error) {
    console.error("❌ Get topic problems error:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})


// Get all problems
router.get('/', async (req, res) => {
  console.log('📚 Get problems request');
  console.log('📊 Query params:', req.query);
  
  try {
    const { page = 1, limit = 20, difficulty, tags } = req.query;
    const query = { isPublished: true };

    if (difficulty) {
      query.difficulty = difficulty;
      console.log('🎯 Filtering by difficulty:', difficulty);
    }
    if (tags) {
      query.tags = { $in: tags.split(',') };
      console.log('🏷️ Filtering by tags:', tags);
    }

    console.log('🔍 Database query:', query);
    const problems = await Problem.find(query)
      .select('-testCases -referenceSolution')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'username');

    const total = await Problem.countDocuments(query);
    console.log('✅ Found problems:', problems.length, 'Total:', total);

    res.json({
      problems,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('❌ Get problems error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
// Move the topic-stats route BEFORE the /:id route
router.get('/topic-stats', async (req, res) => {
  console.log('📊 Get topic statistics request')
  try {
    const topicStats = await Problem.aggregate([
      { $match: { isPublished: true } },
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 },
          avgAcceptanceRate: { $avg: '$acceptanceRate' },
          easyCount: {
            $sum: { $cond: [{ $eq: ['$difficulty', 'Easy'] }, 1, 0] }
          },
          mediumCount: {
            $sum: { $cond: [{ $eq: ['$difficulty', 'Medium'] }, 1, 0] }
          },
          hardCount: {
            $sum: { $cond: [{ $eq: ['$difficulty', 'Hard'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          topic: '$_id',
          count: 1,
          avgAcceptanceRate: { $round: ['$avgAcceptanceRate', 2] }, // Round to 2 decimals
          easyCount: 1,
          mediumCount: 1,
          hardCount: 1,
          _id: 0
        }
      },
      { $sort: { count: -1 } }
    ]);

    console.log('✅ Topic stats generated:', topicStats);
    res.json(topicStats);
  } catch (error) {
    console.error('❌ Error generating topic stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
// Get problem by ID
router.get('/:id', async (req, res) => {
  console.log('📖 Get problem by ID request');
  console.log('🆔 Problem ID:', req.params.id);
  
  try {
    const problem = await Problem.findById(req.params.id)
      .populate('createdBy', 'username');

    if (!problem) {
      console.log('❌ Problem not found');
      return res.status(404).json({ message: 'Problem not found' });
    }

    console.log('✅ Problem found:', problem.title);

    // Only return public test cases for regular view
    const publicTestCases = problem.testCases.filter(tc => tc.isPublic);
    
    const response = {
      ...problem.toObject(),
      testCases: publicTestCases
    };

    console.log('📤 Returning problem with', publicTestCases.length, 'public test cases');
    res.json(response);
  } catch (error) {
    console.error('❌ Get problem error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Run code (test with public test cases only)
router.post('/:id/run', authenticateToken, async (req, res) => {
  console.log('▶️ Run code request');
  console.log('🆔 Problem ID:', req.params.id);
  console.log('👤 User:', req.user.username);
  console.log('💻 Language:', req.body.language);
  
  try {
    const { code, language } = req.body;
    
    if (!code || !language) {
      return res.status(400).json({ message: 'Code and language are required' });
    }

    const problem = await Problem.findById(req.params.id);
    if (!problem) {
      console.log('❌ Problem not found');
      return res.status(404).json({ message: 'Problem not found' });
    }

    console.log('🧪 Running code with public test cases only');
    const publicTestCases = problem.testCases.filter(tc => tc.isPublic);
    console.log('📊 Public test cases:', publicTestCases.length);

    // Use Judge0 API for code execution with public test cases only
    const judge0Response = await executeCodeWithJudge0(code, language, publicTestCases, true);
    
    if (!judge0Response.success) {
      console.log('❌ Judge0 execution failed:', judge0Response.error);
      return res.status(400).json({
        status: 'Compilation Error',
        error: judge0Response.error,
        testResults: judge0Response.testResults || []
      });
    }

    const { testResults, passedTests, totalTests } = judge0Response;
    console.log('✅ Code execution completed. Passed:', passedTests, 'Total:', totalTests);

    res.json({
      status: passedTests === totalTests ? 'Success' : 'Failed',
      passedTests,
      totalTests,
      testResults,
      executionTime: testResults[0]?.executionTime || 0,
      memory: testResults[0]?.memory || 0
    });
  } catch (error) {
    console.error('❌ Run code error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Submit solution
router.post('/:id/submit', authenticateToken, async (req, res) => {
  console.log('📤 Submit solution request');
  console.log('🆔 Problem ID:', req.params.id);
  console.log('👤 User:', req.user.username);
  console.log('💻 Language:', req.body.language);
  
  try {
    const { code, language } = req.body;
    
    if (!code || !language) {
      return res.status(400).json({ message: 'Code and language are required' });
    }

    const problem = await Problem.findById(req.params.id);
    if (!problem) {
      console.log('❌ Problem not found');
      return res.status(404).json({ message: 'Problem not found' });
    }

    console.log('🧪 Submitting code with all test cases');
    console.log('📊 Total test cases:', problem.testCases.length);

    // Use Judge0 API for code execution with all test cases
    const judge0Response = await executeCodeWithJudge0(code, language, problem.testCases, false);
    
    if (!judge0Response.success) {
      console.log('❌ Judge0 execution failed:', judge0Response.error);
      return res.status(400).json({
        status: 'Compilation Error',
        error: judge0Response.error,
        passedTests: 0,
        totalTests: problem.testCases.length
      });
    }

    const { testResults, passedTests, totalTests } = judge0Response;
    const isAccepted = passedTests === totalTests;
    
    console.log('📊 Submission result - Passed:', passedTests, 'Total:', totalTests, 'Accepted:', isAccepted);
    await Problem.findByIdAndUpdate(problem._id, {
      $inc: {
        submissions: 1,
        accepted: isAccepted ? 1 : 0
      },
      $set: {
        acceptanceRate: ((problem.accepted + (isAccepted ? 1 : 0)) / (problem.submissions + 1)) * 100
      }
    });

    
    // Update problem stats
    // problem.submissions += 1;
    // if (isAccepted) {
    //   problem.accepted += 1;
    // }
    // problem.acceptanceRate = (problem.accepted / problem.submissions) * 100;
    // await problem.save();
    console.log('📈 Updated problem stats');

    // Add submission to user's submissions
    const submission = {
      problem: problem._id,
      status: isAccepted ? 'accepted' : 'wrong',
      language,
      code,
      runtime: testResults[0]?.executionTime || 0,
      memory: testResults[0]?.memory || 0,
      date: new Date()
    };

    await User.findByIdAndUpdate(req.user._id, {
      $push: { submissions: submission }
    });
    console.log('📝 Added submission to user history');

    // Update user stats if accepted and not solved before
    if (isAccepted && !req.user.solvedProblems.includes(problem._id)) {
      const updateFields = {
        $push: { solvedProblems: problem._id },
        $inc: {
          [`stats.problemsSolved.${problem.difficulty.toLowerCase()}`]: 1,
          'stats.problemsSolved.total': 1,
          'stats.correctSubmissions': 1
        }
      };

      await User.findByIdAndUpdate(req.user._id, updateFields);
      console.log('🎉 Updated user stats for first solve');
    } else if (!isAccepted) {
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { 'stats.totalSubmissions': 1 }
      });
    }

    res.json({
      status: isAccepted ? 'Accepted' : 'Wrong Answer',
      passedTests,
      totalTests,
      testResults: testResults.slice(0, 3), // Show first 3 test results for feedback
      executionTime: testResults[0]?.executionTime || 0,
      memory: testResults[0]?.memory || 0
    });
  } catch (error) {
    console.error('❌ Submit solution error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helper function to execute code with Judge0
async function executeCodeWithJudge0(code, language, testCases, isRun = false) {
  console.log('🔧 Judge0 execution started');
  console.log('📊 Language:', language);
  console.log('📊 Test cases count:', testCases.length);
  console.log('📊 Is run mode:', isRun);
  
  try {
    const languageMap = {
      'cpp': 54,    // C++ (GCC 9.2.0)
      'java': 62,   // Java (OpenJDK 13.0.1)
      'python': 71, // Python (3.8.1)
      'c': 50       // C (GCC 9.2.0)
    };

    const languageId = languageMap[language];
    if (!languageId) {
      console.log('❌ Unsupported language:', language);
      return { success: false, error: 'Unsupported language' };
    }

    const testResults = [];
    const casesToTest = isRun ? testCases.slice(0, 3) : testCases; // Limit to 3 for run mode

    console.log('🧪 Testing', casesToTest.length, 'test cases');

    for (let i = 0; i < casesToTest.length; i++) {
      const testCase = casesToTest[i];
      console.log(`🧪 Testing case ${i + 1}:`, testCase.input.substring(0, 50) + '...');
      
      try {
        // Create submission
        const submissionResponse = await fetch('https://judge0-ce.p.rapidapi.com/submissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-RapidAPI-Key': process.env.JUDGE0_API_KEY || 'demo-key',
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
          },
          body: JSON.stringify({
            source_code: code,
            language_id: languageId,
            stdin: testCase.input,
            expected_output: testCase.output
          })
        });

        const submission = await submissionResponse.json();
        console.log(`📤 Submission ${i + 1} created:`, submission.token);
        
        if (!submission.token) {
          throw new Error('Failed to create submission');
        }

        // Wait for execution and get result
        let result;
        let attempts = 0;
        const maxAttempts = 10;

        do {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          
          const resultResponse = await fetch(`https://judge0-ce.p.rapidapi.com/submissions/${submission.token}`, {
            headers: {
              'X-RapidAPI-Key': process.env.JUDGE0_API_KEY || 'demo-key',
              'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
            }
          });
          
          result = await resultResponse.json();
          attempts++;
        } while (result.status.id <= 2 && attempts < maxAttempts); // Status 1-2 means processing
        
        console.log(`📊 Test case ${i + 1} result:`, result.status.description);

        const actualOutput = result.stdout ? result.stdout.trim() : '';
        const expectedOutput = testCase.output.trim();
        const passed = actualOutput === expectedOutput && result.status.id === 3; // Status 3 = Accepted

        testResults.push({
          input: testCase.input,
          expectedOutput: expectedOutput,
          actualOutput: actualOutput,
          passed: passed,
          executionTime: parseFloat(result.time) * 1000 || 0, // Convert to ms
          memory: parseFloat(result.memory) || 0,
          status: result.status.description,
          stderr: result.stderr || null
        });

        // If compilation error or runtime error, break early
        if (result.status.id === 6 || result.status.id === 5) { // Compilation Error or Time Limit Exceeded
          console.log('❌ Compilation/Runtime error:', result.stderr || result.compile_output);
          return { 
            success: false, 
            error: result.stderr || result.compile_output || 'Compilation/Runtime Error',
            testResults 
          };
        }

      } catch (error) {
        console.error(`Judge0 execution error for test case ${i + 1}:`, error);
        testResults.push({
          input: testCase.input,
          expectedOutput: testCase.output,
          actualOutput: '',
          passed: false,
          executionTime: 0,
          memory: 0,
          status: 'Runtime Error',
          stderr: error.message
        });
      }
    }

    const passedTests = testResults.filter(result => result.passed).length;
    console.log('✅ Judge0 execution completed. Passed:', passedTests, 'Total:', testResults.length);
    
    return {
      success: true,
      testResults,
      passedTests,
      totalTests: casesToTest.length
    };

  } catch (error) {
    console.error('Judge0 API error:', error);
    return { success: false, error: 'Code execution service unavailable' };
  }
}
// router.get("/:id/editorial", async (req, res) => {
//   console.log("📚 Get problem editorial request:", req.params.id)

//   try {
//     const problem = await Problem.findById(req.params.id).select("title difficulty editorial referenceSolution")

//     if (!problem) {
//       console.log("❌ Problem not found:", req.params.id)
//       return res.status(404).json({ message: "Problem not found" })
//     }

//     console.log("✅ Problem editorial found:", problem.title)
//     res.json(problem)
//   } catch (error) {
//     console.error("❌ Get problem editorial error:", error)
//     res.status(500).json({ message: "Server error", error: error.message })
//   }
// })
// Get editorial
router.get('/:id/editorial', async (req, res) => {
  console.log('📖 Get editorial request');
  console.log('🆔 Problem ID:', req.params.id);
  
  try {
    const problem = await Problem.findById(req.params.id).select('editorial');
    if (!problem) {
      console.log('❌ Problem not found');
      return res.status(404).json({ message: 'Problem not found' });
    }
    
    console.log('✅ Editorial found:', !!problem.editorial?.written);
    res.json({ editorial: problem.editorial });
  } catch (error) {
    console.error('❌ Get editorial error:', error);
    res.status(500).json({ message: 'Error fetching editorial', error: error.message });
  }
});

// Update editorial (Admin only)
router.put('/:id/editorial', authenticateToken, requireAdmin, async (req, res) => {
  console.log('✏️ Update editorial request');
  console.log('🆔 Problem ID:', req.params.id);
  
  try {
    const { editorial } = req.body;
    const problem = await Problem.findByIdAndUpdate(
      req.params.id,
      { editorial },
      { new: true }
    );
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }
    
    console.log('✅ Editorial updated successfully');
    res.json({ message: 'Editorial updated successfully', editorial: problem.editorial });
  } catch (error) {
    console.error('❌ Update editorial error:', error);
    res.status(500).json({ message: 'Error updating editorial', error: error.message });
  }
});

// Get user submissions for a problem
router.get('/:id/submissions', authenticateToken, async (req, res) => {
  console.log('📝 Get user submissions request');
  console.log('🆔 Problem ID:', req.params.id);
  console.log('👤 User:', req.user.username);
  
  try {
    const user = await User.findById(req.user._id).select('submissions');
    const problemSubmissions = user.submissions.filter(
      sub => sub.problem.toString() === req.params.id
    ).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    console.log('✅ Found submissions:', problemSubmissions.length);
    res.json({ submissions: problemSubmissions });
  } catch (error) {
    console.error('❌ Get submissions error:', error);
    res.status(500).json({ message: 'Error fetching submissions', error: error.message });
  }
});

// Get all official solutions for a problem
router.get('/:id/solutions', async (req, res) => {
  console.log('💡 Get solutions request');
  console.log('🆔 Problem ID:', req.params.id);
  
  try {
    const problem = await Problem.findById(req.params.id).select('referenceSolution');
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }
    
    console.log('✅ Solutions found:', problem.referenceSolution?.length || 0);
    res.json({ solutions: problem.referenceSolution || [] });
  } catch (error) {
    console.error('❌ Get solutions error:', error);
    res.status(500).json({ message: 'Error fetching solutions', error: error.message });
  }
});

// Add/update solutions for a problem (Admin only)
router.post('/:id/solutions', authenticateToken, requireAdmin, async (req, res) => {
  console.log('➕ Add solution request');
  console.log('🆔 Problem ID:', req.params.id);
  
  try {
    const { language, completeCode } = req.body;

    const problem = await Problem.findById(req.params.id);
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    // Initialize referenceSolution if it doesn't exist
    if (!problem.referenceSolution) {
      problem.referenceSolution = [];
    }

    // Replace if solution for that language exists, otherwise push
    const existingIndex = problem.referenceSolution.findIndex(sol => sol.language === language);
    if (existingIndex !== -1) {
      problem.referenceSolution[existingIndex] = { language, completeCode };
    } else {
      problem.referenceSolution.push({ language, completeCode });
    }

    await problem.save();
    console.log('✅ Solution added/updated successfully');
    res.json({ message: 'Solution added/updated successfully', solutions: problem.referenceSolution });
  } catch (error) {
    console.error('❌ Add solution error:', error);
    res.status(500).json({ message: 'Error saving solution', error: error.message });
  }
});

// Admin: Create problem
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  console.log('📝 Create problem request');
  console.log('👤 Admin user:', req.user.username);
  
  try {
    const problem = new Problem({
      ...req.body,
      createdBy: req.user._id,
      isPublished: req.body.isPublished || false
    });

    await problem.save();
    console.log('✅ Problem created:', problem.title);
    res.status(201).json(problem);
  } catch (error) {
    console.error('❌ Create problem error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: Update problem
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  console.log('✏️ Update problem request');
  console.log('🆔 Problem ID:', req.params.id);
  
  try {
    const problem = await Problem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    console.log('✅ Problem updated:', problem.title);
    res.json(problem);
  } catch (error) {
    console.error('❌ Update problem error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Single route to handle both company problems and stats
router.get('/company/:company', async (req, res) => {
  console.log('🏢 Get company problems and stats')
  try {
    const { company } = req.params
    const { page = 1, limit = 20, difficulty } = req.query
    
    const query = {
      isPublished: true,
      companies: company
    }

    if (difficulty) {
      query.difficulty = difficulty
    }

    // Get all problems and paginated problems in parallel
    const [problems, allProblems] = await Promise.all([
      Problem.find(query)
        .select('-testCases -referenceSolution')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('createdBy', 'username'),
      Problem.find(query)
    ]);

    // Calculate stats
    const stats = {
      totalProblems: allProblems.length,
      easyProblems: allProblems.filter(p => p.difficulty === 'Easy').length,
      mediumProblems: allProblems.filter(p => p.difficulty === 'Medium').length,
      hardProblems: allProblems.filter(p => p.difficulty === 'Hard').length,
      avgAcceptanceRate: allProblems.reduce((acc, p) => acc + p.acceptanceRate, 0) / allProblems.length
    };

    console.log('✅ Company data fetched:', {
      problemsCount: problems.length,
      stats: stats
    });

    res.json({
      problems,
      stats,
      totalPages: Math.ceil(allProblems.length / limit),
      currentPage: parseInt(page)
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: Delete problem
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  console.log('🗑️ Delete problem request');
  console.log('🆔 Problem ID:', req.params.id);
  
  try {
    const problem = await Problem.findByIdAndDelete(req.params.id);

    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    console.log('✅ Problem deleted:', problem.title);
    res.json({ message: 'Problem deleted successfully' });
  } catch (error) {
    console.error('❌ Delete problem error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// router.get('/topic-stats', async (req, res) => {
//   console.log('📊 Get topic statistics request')
//   try {
//     const topicStats = await Problem.aggregate([
//       { $match: { isPublished: true } },
//       { $unwind: '$tags' },
//       {
//         $group: {
//           _id: '$tags',
//           count: { $sum: 1 },
//           avgAcceptanceRate: { $avg: '$acceptanceRate' },
//           easyCount: {
//             $sum: { $cond: [{ $eq: ['$difficulty', 'Easy'] }, 1, 0] }
//           },
//           mediumCount: {
//             $sum: { $cond: [{ $eq: ['$difficulty', 'Medium'] }, 1, 0] }
//           },
//           hardCount: {
//             $sum: { $cond: [{ $eq: ['$difficulty', 'Hard'] }, 1, 0] }
//           }
//         }
//       },
//       {
//         $project: {
//           topic: '$_id',
//           count: 1,
//           avgAcceptanceRate: { $round: ['$avgAcceptanceRate', 1] },
//           easyCount: 1,
//           mediumCount: 1,
//           hardCount: 1,
//           _id: 0
//         }
//       },
//       { $sort: { count: -1 } }
//     ]);

//     // Map the raw topics to their display names
//     const topicMapping = {
//       'array': 'Array',
//       'dynamic-programming': 'Dynamic Programming',
//       'tree': 'Tree',
//       'graph': 'Graph',
//       'string': 'String',
//       'hash-table': 'Hash Table',
//       'two-pointers': 'Two Pointers',
//       'binary-search': 'Binary Search'
//     };

//     const mappedStats = topicStats.map(stat => ({
//       ...stat,
//       topic: topicMapping[stat.topic.toLowerCase()] || stat.topic
//     }));

//     console.log('✅ Topic stats generated:', mappedStats.length, 'topics')
//     res.json(mappedStats)
//   } catch (error) {
//     console.error('❌ Error generating topic stats:', error)
//     res.status(500).json({ message: 'Server error', error: error.message })
//   }
// });

export default router;