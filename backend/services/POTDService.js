import Problem from '../models/Problem.js';
import ProblemOfTheDay from '../models/ProblemOfTheDay.js';

class POTDService {
  // Helper function to get today's date in UTC (consistent across all timezones)
  static getTodayUTC() {
    const now = new Date();
    const utcDate = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0);
    return utcDate;
  }

  // Get today's Problem of the Day
  static async getTodaysPOTD() {
    const today = this.getTodayUTC();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    console.log(`📅 POTD Service: Looking for POTD for UTC date ${today.toISOString()}`);
    
    try {
      let potd = await ProblemOfTheDay.findOne({
        date: { $gte: today, $lt: tomorrow },
        isActive: true
      }).populate('problem');
      
      if (!potd) {
        console.log('📅 POTD not found for today, generating new one');
        // Generate new POTD for today
        potd = await this.generateNewPOTD(today);
      }
      
      console.log(`📅 POTD retrieved: ${potd?.problem?.title || 'Unknown'}`);
      return potd;
    } catch (error) {
      console.error('Error getting today\'s POTD:', error);
      throw error;
    }
  }
  
  // Generate new Problem of the Day
  static async generateNewPOTD(date = null) {
    try {
      // Use provided date or calculate today's UTC date
      if (!date) {
        date = this.getTodayUTC();
      }
      
      console.log(`📅 Generating new POTD for date ${date.toISOString()}`);
      
      // Get problems used in last 30 days to avoid repetition
      const thirtyDaysAgo = new Date(date.getTime() - 30 * 24 * 60 * 60 * 1000);
      const recentPOTDs = await ProblemOfTheDay.find({
        date: { $gte: thirtyDaysAgo }
      }).select('problem');
      
      const usedProblemIds = recentPOTDs.map(potd => potd.problem);
      console.log(`📅 Found ${recentPOTDs.length} recent POTDs, ${usedProblemIds.length} problems used`);
      
      // Get a random problem that hasn't been used recently
      const availableProblems = await Problem.find({
        _id: { $nin: usedProblemIds }
      });
      
      console.log(`📅 ${availableProblems.length} problems available for selection`);
      
      let selectedProblem;
      
      if (availableProblems.length === 0) {
        // If all problems used recently, just get any problem
        const allProblems = await Problem.find({});
        if (allProblems.length === 0) {
          throw new Error('No problems available in database');
        }
        selectedProblem = allProblems[Math.floor(Math.random() * allProblems.length)];
        console.log(`📅 All recent problems exhausted, selected random: ${selectedProblem.title}`);
      } else {
        // Select random problem from available ones
        selectedProblem = availableProblems[Math.floor(Math.random() * availableProblems.length)];
        console.log(`📅 Selected from available: ${selectedProblem.title}`);
      }
      
      const newPOTD = new ProblemOfTheDay({
        problem: selectedProblem._id,
        date: date,
        isActive: true,
        solvedCount: 0
      });
      
      await newPOTD.save();
      console.log(`📅 New POTD saved: ${selectedProblem.title} for ${date.toISOString()}`);
      
      return await ProblemOfTheDay.findById(newPOTD._id).populate('problem');
      
    } catch (error) {
      console.error('Error generating new POTD:', error);
      throw error;
    }
  }
  
  // Check if user has solved today's POTD
  static async hasUserSolvedTodaysPOTD(userId) {
    const today = this.getTodayUTC();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    const User = (await import('../models/User.js')).default;
    
    try {
      const user = await User.findById(userId);
      if (!user) return false;
      
      const todaysSolved = user.solvedPOTD.find(solved => {
        const solvedDate = new Date(solved.date);
        return solvedDate.getTime() >= today.getTime() && solvedDate.getTime() < tomorrow.getTime();
      });
      
      return !!todaysSolved;
    } catch (error) {
      console.error('Error checking user POTD status:', error);
      return false;
    }
  }
  
  // Award coins for solving POTD
  static async awardPOTDCoins(userId, problemId) {
    const today = this.getTodayUTC();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    const User = (await import('../models/User.js')).default;
    
    try {
      // Verify this is actually today's POTD
      const todaysPOTD = await this.getTodaysPOTD();
      if (!todaysPOTD || todaysPOTD.problem._id.toString() !== problemId.toString()) {
        console.log(`🪙 Not today's POTD. Expected: ${todaysPOTD?.problem?._id}, Got: ${problemId}`);
        return { awarded: false, reason: 'Not today\'s POTD' };
      }

      // Check if user already solved today's POTD
      const hasAlreadySolved = await this.hasUserSolvedTodaysPOTD(userId);
      if (hasAlreadySolved) {
        console.log(`🪙 User already solved today's POTD`);
        return { awarded: false, reason: 'Already solved today\'s POTD' };
      }

      // Award coins and add to solvedPOTD
      const user = await User.findByIdAndUpdate(
        userId,
        {
          $inc: { coins: 10 },
          $push: {
            solvedPOTD: {
              problemId: problemId,
              date: today,
              coinsEarned: 10
            }
          }
        },
        { new: true }
      );

      console.log(`🪙 POTD coins awarded to user ${userId}: 10 coins, total: ${user.coins}`);

      // Update POTD solved count
      await ProblemOfTheDay.findOneAndUpdate(
        { 
          problem: problemId, 
          date: { $gte: today, $lt: tomorrow } 
        },
        { $inc: { solvedCount: 1 } }
      );

      return { 
        awarded: true, 
        coinsEarned: 10, 
        totalCoins: user.coins,
        reason: 'POTD solved successfully!'
      };
      
    } catch (error) {
      console.error('Error awarding POTD coins:', error);
      throw error;
    }
  }
}

export default POTDService;
