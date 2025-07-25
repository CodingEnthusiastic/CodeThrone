import Problem from '../models/Problem.js';
import ProblemOfTheDay from '../models/ProblemOfTheDay.js';

class POTDService {
  // Get today's Problem of the Day
  static async getTodaysPOTD() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    try {
      let potd = await ProblemOfTheDay.findOne({
        date: today,
        isActive: true
      }).populate('problem');
      
      if (!potd) {
        // Generate new POTD for today
        potd = await this.generateNewPOTD(today);
      }
      
      return potd;
    } catch (error) {
      console.error('Error getting today\'s POTD:', error);
      throw error;
    }
  }
  
  // Generate new Problem of the Day
  static async generateNewPOTD(date = new Date()) {
    try {
      date.setHours(0, 0, 0, 0);
      
      // Get problems used in last 30 days to avoid repetition
      const recentPOTDs = await ProblemOfTheDay.find({
        date: { $gte: new Date(date.getTime() - 30 * 24 * 60 * 60 * 1000) }
      }).select('problem');
      
      const usedProblemIds = recentPOTDs.map(potd => potd.problem);
      
      // Get a random problem that hasn't been used recently
      const availableProblems = await Problem.find({
        _id: { $nin: usedProblemIds }
      });
      
      if (availableProblems.length === 0) {
        // If all problems used recently, just get any problem
        const allProblems = await Problem.find({});
        if (allProblems.length === 0) {
          throw new Error('No problems available in database');
        }
        const randomProblem = allProblems[Math.floor(Math.random() * allProblems.length)];
        
        const newPOTD = new ProblemOfTheDay({
          problem: randomProblem._id,
          date: date
        });
        
        await newPOTD.save();
        return await ProblemOfTheDay.findById(newPOTD._id).populate('problem');
      }
      
      // Select random problem from available ones
      const randomProblem = availableProblems[Math.floor(Math.random() * availableProblems.length)];
      
      const newPOTD = new ProblemOfTheDay({
        problem: randomProblem._id,
        date: date
      });
      
      await newPOTD.save();
      return await ProblemOfTheDay.findById(newPOTD._id).populate('problem');
      
    } catch (error) {
      console.error('Error generating new POTD:', error);
      throw error;
    }
  }
  
  // Check if user has solved today's POTD
  static async hasUserSolvedTodaysPOTD(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const User = (await import('../models/User.js')).default;
    
    try {
      const user = await User.findById(userId);
      if (!user) return false;
      
      const todaysSolved = user.solvedPOTD.find(solved => {
        const solvedDate = new Date(solved.date);
        solvedDate.setHours(0, 0, 0, 0);
        return solvedDate.getTime() === today.getTime();
      });
      
      return !!todaysSolved;
    } catch (error) {
      console.error('Error checking user POTD status:', error);
      return false;
    }
  }
  
  // Award coins for solving POTD
  static async awardPOTDCoins(userId, problemId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const User = (await import('../models/User.js')).default;
    
    try {
      // Verify this is actually today's POTD
      const todaysPOTD = await this.getTodaysPOTD();
      if (!todaysPOTD || todaysPOTD.problem._id.toString() !== problemId.toString()) {
        return { awarded: false, reason: 'Not today\'s POTD' };
      }

      // Check if user already solved today's POTD
      const hasAlreadySolved = await this.hasUserSolvedTodaysPOTD(userId);
      if (hasAlreadySolved) {
        return { awarded: false, reason: 'Already solved today\'s POTD' };
      }

      // Award coins
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

      // Update POTD solved count
      await ProblemOfTheDay.findOneAndUpdate(
        { problem: problemId, date: today },
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
