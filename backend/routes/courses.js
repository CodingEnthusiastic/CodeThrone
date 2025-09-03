
import express from 'express';
const router = express.Router();
import Course from '../models/Course.js';
import Module from '../models/Module.js';
import Chapter from '../models/Chapter.js';
import Quiz from '../models/Quiz.js';
import CourseCompletion from '../models/CourseCompletion.js';
import { authenticateToken as auth, requireAdmin as admin } from '../middleware/auth.js';

// Get all published courses
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find({ published: true })
      .select('title description thumbnail instructor duration level rating ratingCount tags createdAt')
      .sort({ createdAt: -1 });
    
    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a single course with its modules
router.get('/:courseId', async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Get all modules for this course
    const modules = await Module.find({ 
      course: req.params.courseId,
      published: true
    }).sort({ order: 1 });

    res.json({ course, modules });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a module with its chapters
router.get('/module/:moduleId', async (req, res) => {
  try {
    const module = await Module.findById(req.params.moduleId);
    
    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }

    // Get all chapters for this module
    const chapters = await Chapter.find({ 
      module: req.params.moduleId,
      published: true
    }).sort({ order: 1 });

    res.json({ module, chapters });
  } catch (error) {
    console.error('Error fetching module:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a chapter with its content
router.get('/chapter/:chapterId', async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.chapterId);
    
    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    // If it's a quiz, get the quiz data but exclude correct answers
    let quiz = null;
    if (chapter.type === 'quiz') {
      quiz = await Quiz.findOne({ chapter: chapter._id });
      
      if (quiz) {
        // Remove correct answers from response
        quiz = quiz.toObject();
        quiz.questions = quiz.questions.map(q => {
          return {
            ...q,
            options: q.options.map(o => ({ text: o.text }))
          };
        });
      }
    }

    res.json({ chapter, quiz });
  } catch (error) {
    console.error('Error fetching chapter:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Enroll in a course
router.post('/enroll/:courseId', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if already enrolled
    let courseCompletion = await CourseCompletion.findOne({
      user: req.user.id,
      course: req.params.courseId
    });

    if (courseCompletion) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    // Create new enrollment
    courseCompletion = new CourseCompletion({
      user: req.user.id,
      course: req.params.courseId,
      startDate: new Date()
    });

    await courseCompletion.save();

    // Update course enrolled users
    course.enrolledUsers.push(req.user.id);
    await course.save();

    res.json({ message: 'Successfully enrolled in course', courseCompletion });
  } catch (error) {
    console.error('Error enrolling in course:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark chapter as completed
router.post('/chapter/:chapterId/complete', auth, async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.chapterId);
    
    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    // Find the module and course
    const module = await Module.findById(chapter.module);
    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }

    // Find course completion record
    const courseCompletion = await CourseCompletion.findOne({
      user: req.user.id,
      course: module.course
    });

    if (!courseCompletion) {
      return res.status(400).json({ message: 'Not enrolled in this course' });
    }

    // Add chapter to completed list if not already there
    if (!courseCompletion.chaptersCompleted.includes(chapter._id)) {
      courseCompletion.chaptersCompleted.push(chapter._id);
      
      // Update course progress
      const totalChapters = await Chapter.countDocuments({
        module: { $in: await Module.find({ course: module.course }).distinct('_id') },
        published: true
      });
      
      courseCompletion.progress = (courseCompletion.chaptersCompleted.length / totalChapters) * 100;
      
      // Check if course is completed
      if (courseCompletion.progress >= 100 && !courseCompletion.completionDate) {
        courseCompletion.completionDate = new Date();
        courseCompletion.certificateId = `CERT-${module.course.toString().slice(-6)}-${req.user.id.toString().slice(-6)}-${Date.now()}`;
        courseCompletion.certificateIssueDate = new Date();
      }
      
      await courseCompletion.save();
    }

    res.json({ 
      message: 'Chapter marked as complete',
      progress: courseCompletion.progress,
      isCompleted: courseCompletion.completionDate ? true : false,
      certificateId: courseCompletion.certificateId || null
    });
  } catch (error) {
    console.error('Error marking chapter as complete:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit quiz answers
router.post('/quiz/:quizId/submit', auth, async (req, res) => {
  try {
    const { answers } = req.body;
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Invalid quiz submission' });
    }

    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const chapter = await Chapter.findById(quiz.chapter);
    if (!chapter) {
      return res.status(404).json({ message: 'Associated chapter not found' });
    }

    const module = await Module.findById(chapter.module);
    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }

    // Find course completion record
    const courseCompletion = await CourseCompletion.findOne({
      user: req.user.id,
      course: module.course
    });

    if (!courseCompletion) {
      return res.status(400).json({ message: 'Not enrolled in this course' });
    }

    // Calculate score
    let correctAnswers = 0;
    answers.forEach(answer => {
      const question = quiz.questions.find(q => q._id.toString() === answer.questionId);
      if (question) {
        const correctOption = question.options.findIndex(o => o.isCorrect);
        if (correctOption === answer.selectedOption) {
          correctAnswers++;
        }
      }
    });

    const score = (correctAnswers / quiz.questions.length) * 100;
    const passed = score >= quiz.passingScore;

    // Update quiz scores
    const existingScore = courseCompletion.quizScores.findIndex(qs => qs.quiz.toString() === quiz._id.toString());
    if (existingScore >= 0) {
      courseCompletion.quizScores[existingScore] = {
        quiz: quiz._id,
        score,
        passedAt: passed ? new Date() : null
      };
    } else {
      courseCompletion.quizScores.push({
        quiz: quiz._id,
        score,
        passedAt: passed ? new Date() : null
      });
    }

    // Mark chapter as complete if quiz is passed
    if (passed && !courseCompletion.chaptersCompleted.includes(chapter._id)) {
      courseCompletion.chaptersCompleted.push(chapter._id);
      
      // Update course progress
      const totalChapters = await Chapter.countDocuments({
        module: { $in: await Module.find({ course: module.course }).distinct('_id') },
        published: true
      });
      
      courseCompletion.progress = (courseCompletion.chaptersCompleted.length / totalChapters) * 100;
      
      // Check if course is completed
      if (courseCompletion.progress >= 100 && !courseCompletion.completionDate) {
        courseCompletion.completionDate = new Date();
        courseCompletion.certificateId = `CERT-${module.course.toString().slice(-6)}-${req.user.id.toString().slice(-6)}-${Date.now()}`;
        courseCompletion.certificateIssueDate = new Date();
      }
    }

    await courseCompletion.save();

    res.json({ 
      score,
      passed,
      correctAnswers,
      totalQuestions: quiz.questions.length,
      progress: courseCompletion.progress,
      isCompleted: courseCompletion.completionDate ? true : false,
      certificateId: courseCompletion.certificateId || null
    });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get course certificate
router.get('/certificate/:courseId', auth, async (req, res) => {
  try {
    const courseCompletion = await CourseCompletion.findOne({
      user: req.user.id,
      course: req.params.courseId
    }).populate('user', 'username email').populate('course', 'title instructor');
    
    if (!courseCompletion) {
      return res.status(404).json({ message: 'Course enrollment not found' });
    }
    
    if (!courseCompletion.certificateId) {
      return res.status(400).json({ message: 'Course not completed yet' });
    }
    
    const certificateData = {
      certificateId: courseCompletion.certificateId,
      courseTitle: courseCompletion.course.title,
      instructor: courseCompletion.course.instructor,
      userName: courseCompletion.user.username,
      userEmail: courseCompletion.user.email,
      issueDate: courseCompletion.certificateIssueDate,
      completionDate: courseCompletion.completionDate
    };
    
    res.json(certificateData);
  } catch (error) {
    console.error('Error fetching certificate:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ADMIN ROUTES

// Create a new course (admin only)
router.post('/', admin, async (req, res) => {
  try {
    const { title, description, thumbnail, instructor, duration, level, tags } = req.body;
    
    const newCourse = new Course({
      title,
      description,
      thumbnail,
      instructor,
      duration,
      level,
      tags: tags || []
    });
    
    const course = await newCourse.save();
    res.status(201).json(course);
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new module (admin only)
router.post('/module', admin, async (req, res) => {
  try {
    const { title, description, courseId, order } = req.body;
    
    const newModule = new Module({
      title,
      description,
      course: courseId,
      order
    });
    
    const module = await newModule.save();
    res.status(201).json(module);
  } catch (error) {
    console.error('Error creating module:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new chapter (admin only)
router.post('/chapter', admin, async (req, res) => {
  try {
    const { title, moduleId, order, type, content, duration } = req.body;
    
    const newChapter = new Chapter({
      title,
      module: moduleId,
      order,
      type,
      content,
      duration
    });
    
    const chapter = await newChapter.save();
    res.status(201).json(chapter);
  } catch (error) {
    console.error('Error creating chapter:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new quiz (admin only)
router.post('/quiz', admin, async (req, res) => {
  try {
    const { title, chapterId, questions, passingScore, timeLimit } = req.body;
    
    const newQuiz = new Quiz({
      title,
      chapter: chapterId,
      questions,
      passingScore,
      timeLimit
    });
    
    const quiz = await newQuiz.save();
    res.status(201).json(quiz);
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update course (admin only)
router.put('/:courseId', admin, async (req, res) => {
  try {
    const { title, description, thumbnail, instructor, duration, level, published, tags } = req.body;
    
    const course = await Course.findByIdAndUpdate(
      req.params.courseId,
      {
        title,
        description,
        thumbnail,
        instructor,
        duration,
        level,
        published,
        tags,
        updatedAt: Date.now()
      },
      { new: true }
    );
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    res.json(course);
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update module (admin only)
router.put('/module/:moduleId', admin, async (req, res) => {
  try {
    const { title, description, order, published } = req.body;
    
    const module = await Module.findByIdAndUpdate(
      req.params.moduleId,
      {
        title,
        description,
        order,
        published,
        updatedAt: Date.now()
      },
      { new: true }
    );
    
    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }
    
    res.json(module);
  } catch (error) {
    console.error('Error updating module:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update chapter (admin only)
router.put('/chapter/:chapterId', admin, async (req, res) => {
  try {
    const { title, order, type, content, published, duration } = req.body;
    
    const chapter = await Chapter.findByIdAndUpdate(
      req.params.chapterId,
      {
        title,
        order,
        type,
        content,
        published,
        duration,
        updatedAt: Date.now()
      },
      { new: true }
    );
    
    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }
    
    res.json(chapter);
  } catch (error) {
    console.error('Error updating chapter:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
