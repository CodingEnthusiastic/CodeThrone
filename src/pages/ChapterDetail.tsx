import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Book, Clock, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ReactMarkdown from 'react-markdown';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Chapter {
  _id: string;
  title: string;
  type: 'article' | 'quiz' | 'video';
  content: string;
  module: string;
  order: number;
  duration: number;
}

interface Quiz {
  _id: string;
  title: string;
  questions: {
    _id: string;
    questionText: string;
    options: {
      text: string;
      isCorrect?: boolean;
    }[];
    explanation?: string;
  }[];
  timeLimit: number;
  passingScore: number;
}

interface Course {
  _id: string;
  title: string;
}

interface Module {
  _id: string;
  title: string;
  course: string;
}

const ChapterDetail: React.FC = () => {
  const { courseId, chapterId } = useParams<{ courseId: string, chapterId: string }>();
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [module, setModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [prevNextChapters, setPrevNextChapters] = useState<{prev: string | null, next: string | null}>({
    prev: null,
    next: null
  });
  
  // Quiz state
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizResults, setQuizResults] = useState<{
    score: number;
    passed: boolean;
    correctAnswers: number;
    totalQuestions: number;
  } | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: string]: number}>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [timerActive, setTimerActive] = useState(false);
  
  useEffect(() => {
    fetchChapterDetails();
  }, [chapterId]);
  
  // Quiz timer effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (quizStarted && timerActive && timeLeft > 0) {
      intervalId = setInterval(() => {
        setTimeLeft(prevTime => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerActive) {
      submitQuiz();
    }
    
    return () => clearInterval(intervalId);
  }, [quizStarted, timerActive, timeLeft]);
  
  const fetchChapterDetails = async () => {
    try {
      setLoading(true);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // Fetch chapter details
      const chapterResponse = await axios.get(
        `${API_URL}/courses/chapter/${chapterId}`,
        { headers }
      );
      
      setChapter(chapterResponse.data.chapter);
      
      if (chapterResponse.data.quiz) {
        setQuiz(chapterResponse.data.quiz);
        setTimeLeft(chapterResponse.data.quiz.timeLimit * 60); // Convert minutes to seconds
      }
      
      // Fetch module details
      const moduleResponse = await axios.get(
        `${API_URL}/courses/module/${chapterResponse.data.chapter.module}`,
        { headers }
      );
      
      setModule(moduleResponse.data.module);
      
      // Fetch course details
      const courseResponse = await axios.get(
        `${API_URL}/courses/${courseId}`,
        { headers }
      );
      
      setCourse(courseResponse.data.course);
      
      // Check if chapter is completed
      try {
        if (isAuthenticated && token) {
          const progressResponse = await axios.get(
            `${API_URL}/users/course-progress/${courseId}`,
            { headers }
          );
          
          if (progressResponse.data.chaptersCompleted.includes(chapterId)) {
            setCompleted(true);
          }
        }
      } catch (err) {
        console.error('Failed to fetch progress:', err);
      }
      
      // Get prev/next chapters
      const chaptersResponse = await axios.get(
        `${API_URL}/courses/module/${chapterResponse.data.chapter.module}/chapters`,
        { headers }
      );
      
      const chapters = chaptersResponse.data.chapters;
      const currentIndex = chapters.findIndex((ch: Chapter) => ch._id === chapterId);
      
      if (currentIndex > 0) {
        setPrevNextChapters(prev => ({
          ...prev,
          prev: chapters[currentIndex - 1]._id
        }));
      }
      
      if (currentIndex < chapters.length - 1) {
        setPrevNextChapters(prev => ({
          ...prev,
          next: chapters[currentIndex + 1]._id
        }));
      }
    } catch (err) {
      console.error('Error fetching chapter details:', err);
      setError('Failed to load chapter details');
    } finally {
      setLoading(false);
    }
  };
  
  const markChapterCompleted = async () => {
    if (!isAuthenticated || !token || completed) return;
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `${API_URL}/courses/chapter/${chapterId}/complete`,
        {},
        { headers }
      );
      
      setCompleted(true);
    } catch (err) {
      console.error('Error marking chapter as complete:', err);
    }
  };
  
  const startQuiz = () => {
    if (quiz) {
      setQuizStarted(true);
      setTimerActive(true);
      setSelectedAnswers({});
      setQuizCompleted(false);
      setQuizResults(null);
    }
  };
  
  const selectAnswer = (questionId: string, optionIndex: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };
  
  const submitQuiz = async () => {
    if (!quiz || !isAuthenticated || !token) return;
    
    setTimerActive(false);
    
    try {
      const answers = Object.keys(selectedAnswers).map(questionId => ({
        questionId,
        selectedOption: selectedAnswers[questionId]
      }));
      
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(
        `${API_URL}/courses/quiz/${quiz._id}/submit`,
        { answers },
        { headers }
      );
      
      setQuizResults({
        score: response.data.score,
        passed: response.data.passed,
        correctAnswers: response.data.correctAnswers,
        totalQuestions: response.data.totalQuestions
      });
      
      setQuizCompleted(true);
      
      if (response.data.passed) {
        setCompleted(true);
      }
    } catch (err) {
      console.error('Error submitting quiz:', err);
    }
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const renderMarkdown = (content: string) => {
    // Process the markdown content to handle image tags
    const imgRegex = /<img\s+src="([^"]+)"([^>]*)>/g;
    const processedContent = content.replace(imgRegex, (match, src, rest) => {
      // If src is already a full URL, leave it as is
      if (src.startsWith('http://') || src.startsWith('https://')) {
        return match;
      }
      
      // Otherwise, prepend the API_URL
      const fullSrc = `${API_URL}${src.startsWith('/') ? '' : '/'}${src}`;
      return `<img src="${fullSrc}"${rest}>`;
    });
    
    return (
      <ReactMarkdown
        components={{
          img: ({node, ...props}) => (
            <img 
              {...props} 
              className="max-w-full h-auto my-4 rounded-lg" 
              alt={props.alt || 'Course image'}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://via.placeholder.com/800x400?text=Image+Not+Found';
              }}
            />
          ),
          h1: ({node, ...props}) => <h1 className="text-3xl font-bold mt-6 mb-4" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-2xl font-bold mt-5 mb-3" {...props} />,
          h3: ({node, ...props}) => <h3 className="text-xl font-bold mt-4 mb-2" {...props} />,
          p: ({node, ...props}) => <p className="my-4" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc pl-6 my-4" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal pl-6 my-4" {...props} />,
          li: ({node, ...props}) => <li className="my-1" {...props} />,
          blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4" {...props} />,
          code: ({node, inline, ...props}) => 
            inline ? (
              <code className="bg-gray-100 dark:bg-gray-800 rounded px-1" {...props} />
            ) : (
              <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto my-4">
                <code {...props} />
              </pre>
            )
        }}
      >
        {processedContent}
      </ReactMarkdown>
    );
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-lg text-gray-600 dark:text-gray-400">Loading content...</span>
          </div>
        </div>
      </div>
    );
  }
  
  if (error || !chapter) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-lg text-red-600 dark:text-red-400 mb-4">{error || 'Chapter not found'}</p>
              <button 
                onClick={() => navigate(`/course/${courseId}`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Course
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Chapter Navigation Header */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
            <div className="flex items-center mb-4 sm:mb-0">
              <button
                onClick={() => navigate(`/course/${courseId}`)}
                className="mr-4 p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {chapter.title}
                </h1>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                  <span className="capitalize">{chapter.type}</span>
                  <span className="mx-2">•</span>
                  <span>{chapter.duration} min</span>
                  {course && module && (
                    <>
                      <span className="mx-2">•</span>
                      <Link 
                        to={`/course/${courseId}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {course.title}
                      </Link>
                      <ChevronRight className="h-4 w-4 mx-1" />
                      <span>{module.title}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {completed && (
              <div className="flex items-center text-green-500">
                <CheckCircle className="h-5 w-5 mr-1" />
                <span>Completed</span>
              </div>
            )}
          </div>
          
          {/* Progress Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => prevNextChapters.prev && navigate(`/course/${courseId}/chapter/${prevNextChapters.prev}`)}
              disabled={!prevNextChapters.prev}
              className={`flex items-center p-2 ${
                prevNextChapters.prev
                  ? 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
                  : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
              }`}
            >
              <ChevronLeft className="h-5 w-5 mr-1" />
              Previous
            </button>
            
            <button
              onClick={() => !completed && isAuthenticated && chapter.type !== 'quiz' && markChapterCompleted()}
              disabled={completed || !isAuthenticated || chapter.type === 'quiz'}
              className={`px-4 py-2 rounded-lg ${
                completed
                  ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 cursor-default'
                  : isAuthenticated && chapter.type !== 'quiz'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              {completed ? 'Completed' : 'Mark as Complete'}
            </button>
            
            <button
              onClick={() => prevNextChapters.next && navigate(`/course/${courseId}/chapter/${prevNextChapters.next}`)}
              disabled={!prevNextChapters.next}
              className={`flex items-center p-2 ${
                prevNextChapters.next
                  ? 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
                  : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
              }`}
            >
              Next
              <ChevronRight className="h-5 w-5 ml-1" />
            </button>
          </div>
        </div>
        
        {/* Content Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
          {chapter.type === 'article' ? (
            <div className="p-6 sm:p-8 prose prose-lg dark:prose-invert max-w-none">
              {renderMarkdown(chapter.content)}
              
              {!completed && isAuthenticated && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={markChapterCompleted}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Mark as Completed
                  </button>
                </div>
              )}
            </div>
          ) : chapter.type === 'quiz' ? (
            <div className="p-6">
              {!quizStarted ? (
                <div className="text-center py-8">
                  <Book className="h-16 w-16 mx-auto text-blue-500 mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {quiz?.title || 'Quiz'}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-lg mx-auto">
                    This quiz contains {quiz?.questions.length} questions. 
                    You have {quiz?.timeLimit} minutes to complete it.
                    The passing score is {quiz?.passingScore}%.
                  </p>
                  <button
                    onClick={startQuiz}
                    disabled={!isAuthenticated}
                    className={`px-6 py-3 rounded-lg ${
                      isAuthenticated
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isAuthenticated ? 'Start Quiz' : 'Login to Start Quiz'}
                  </button>
                  {!isAuthenticated && (
                    <p className="mt-2 text-sm text-gray-500">
                      You need to be logged in to take this quiz.
                    </p>
                  )}
                </div>
              ) : quizCompleted ? (
                <div className="text-center py-8">
                  {quizResults?.passed ? (
                    <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
                  ) : (
                    <div className="h-16 w-16 mx-auto text-red-500 mb-4 text-3xl">✗</div>
                  )}
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {quizResults?.passed ? 'Quiz Passed!' : 'Quiz Failed'}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-2">
                    You scored {quizResults?.score}% ({quizResults?.correctAnswers} out of {quizResults?.totalQuestions})
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    {quizResults?.passed 
                      ? 'Congratulations! You have successfully completed this quiz.' 
                      : `You need to score at least ${quiz?.passingScore}% to pass this quiz.`}
                  </p>
                  <div className="flex justify-center space-x-4">
                    {!quizResults?.passed && (
                      <button
                        onClick={startQuiz}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Try Again
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/course/${courseId}`)}
                      className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Back to Course
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {quiz?.title || 'Quiz'}
                    </h2>
                    <div className="text-lg font-mono bg-white dark:bg-gray-800 px-3 py-1 rounded-md shadow">
                      Time left: <span className={timeLeft < 60 ? 'text-red-600 dark:text-red-400' : ''}>{formatTime(timeLeft)}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-8 mb-8">
                    {quiz?.questions.map((question, qIndex) => (
                      <div key={question._id} className="p-5 bg-gray-50 dark:bg-gray-700 rounded-xl shadow">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          {qIndex + 1}. {question.questionText}
                        </h3>
                        <div className="space-y-3">
                          {question.options.map((option, oIndex) => (
                            <div 
                              key={oIndex}
                              onClick={() => selectAnswer(question._id, oIndex)}
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                selectedAnswers[question._id] === oIndex
                                  ? 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700'
                                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                            >
                              <div className="flex items-center">
                                <div className={`w-5 h-5 mr-3 rounded-full flex items-center justify-center border ${
                                  selectedAnswers[question._id] === oIndex
                                    ? 'border-blue-500 bg-blue-500'
                                    : 'border-gray-300 dark:border-gray-500'
                                }`}>
                                  {selectedAnswers[question._id] === oIndex && (
                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                  )}
                                </div>
                                <span className={`${
                                  selectedAnswers[question._id] === oIndex
                                    ? 'text-gray-900 dark:text-white font-medium'
                                    : 'text-gray-700 dark:text-gray-300'
                                }`}>
                                  {option.text}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      onClick={submitQuiz}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Submit Quiz
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Video content not available
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                This feature is coming soon.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChapterDetail;
