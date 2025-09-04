import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Book, Clock, CheckCircle, ChevronRight, User, Calendar, Award, Layers } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Certificate from '../components/Certificate';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Course {
  _id: string;
  title: string;
  description: string;
  thumbnail: string;
  instructor: string;
  duration: string;
  level: string;
  rating: number;
  ratingCount: number;
  tags: string[];
  createdAt: string;
}

interface Module {
  _id: string;
  title: string;
  description: string;
  order: number;
}

interface Chapter {
  _id: string;
  title: string;
  type: 'article' | 'quiz' | 'video';
  order: number;
  duration: number;
}

interface CourseProgress {
  progress: number;
  chaptersCompleted: string[];
  certificateId: string | null;
  completionDate: string | null;
}

interface CertificateData {
  certificateId: string;
  courseTitle: string;
  instructor: string;
  userName: string;
  userEmail: string;
  issueDate: string;
  completionDate: string;
}

const CourseDetail: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [moduleChapters, setModuleChapters] = useState<Record<string, Chapter[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseProgress, setCourseProgress] = useState<CourseProgress | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null);
  const [showCertificate, setShowCertificate] = useState(false);
  
  useEffect(() => {
    fetchCourseDetails();
  }, [courseId]);
  
  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const courseResponse = await axios.get(`${API_URL}/api/courses/${courseId}`, { headers });
      setCourse(courseResponse.data.course);
      setModules(courseResponse.data.modules);
      
      // Set the first module as expanded by default
      if (courseResponse.data.modules.length > 0) {
        setExpandedModules({ 
          [courseResponse.data.modules[0]._id]: true 
        });
        await fetchModuleChapters(courseResponse.data.modules[0]._id);
      }
      
      // Fetch user's progress if authenticated
      if (isAuthenticated && token) {
        try {
          const progressResponse = await axios.get(
            `${API_URL}/users/course-progress/${courseId}`,
            { headers }
          );
          setCourseProgress(progressResponse.data);
          
          // If the user has completed the course, fetch certificate data
          if (progressResponse.data.certificateId) {
            const certificateResponse = await axios.get(
              `${API_URL}/api/courses/certificate/${courseId}`,
              { headers }
            );
            setCertificateData(certificateResponse.data);
          }
        } catch (err) {
          console.error('Failed to fetch progress:', err);
          // Not enrolled yet, no progress
        }
      }
      
    } catch (err) {
      console.error('Error fetching course details:', err);
      setError('Failed to load course details');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchModuleChapters = async (moduleId: string) => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API_URL}/api/courses/module/${moduleId}`, { headers });
      setModuleChapters(prev => ({
        ...prev,
        [moduleId]: response.data.chapters
      }));
    } catch (err) {
      console.error('Error fetching module chapters:', err);
    }
  };
  
  const toggleModule = async (moduleId: string) => {
    setExpandedModules(prev => ({ 
      ...prev,
      [moduleId]: !prev[moduleId] 
    }));
    
    if (!moduleChapters[moduleId]) {
      await fetchModuleChapters(moduleId);
    }
  };
  
  const enrollInCourse = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/courses/${courseId}` } });
      return;
    }
    
    try {
      setEnrolling(true);
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_URL}/api/courses/enroll/${courseId}`, {}, { headers });
      
      // Refresh course details to get updated progress
      await fetchCourseDetails();
    } catch (err) {
      console.error('Error enrolling in course:', err);
      setError('Failed to enroll in course');
    } finally {
      setEnrolling(false);
    }
  };
  
  const viewCertificate = () => {
    if (certificateData) {
      setShowCertificate(true);
    }
  };
  
  const downloadCertificate = () => {
    // This function will be passed to the Certificate component
    console.log('Downloading certificate...');
  };
  
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={`text-lg ${i <= rating ? 'text-yellow-400' : 'text-gray-300'}`}>
          ★
        </span>
      );
    }
    return stars;
  };
  
  const isChapterCompleted = (chapterId: string) => {
    return courseProgress?.chaptersCompleted.includes(chapterId) || false;
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-lg text-gray-600 dark:text-gray-400">Loading course details...</span>
          </div>
        </div>
      </div>
    );
  }
  
  if (error || !course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-lg text-red-600 dark:text-red-400 mb-4">{error || 'Course not found'}</p>
              <button 
                onClick={() => navigate('/courses')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Courses
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Course Header */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between">
          <div className="flex items-center mb-4 sm:mb-0">
            <button
              onClick={() => navigate('/courses')}
              className="mr-4 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-all duration-200"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {course.title}
            </h1>
          </div>
          
          {courseProgress?.certificateId && (
            <button
              onClick={viewCertificate}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors flex items-center"
            >
              <Award className="mr-2 h-5 w-5" />
              View Certificate
            </button>
          )}
        </div>
        
        {/* Course Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Course Image */}
            <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg mb-8">
              <div className="relative h-64 md:h-80">
                <img 
                  src={course.thumbnail} 
                  alt={course.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://via.placeholder.com/800x400?text=Course+Image';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
              </div>
              
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  About This Course
                </h2>
                
                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line mb-6">
                  {course.description}
                </p>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <User className="h-6 w-6 text-blue-500 mb-2" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Instructor</span>
                    <span className="text-gray-900 dark:text-white font-medium">{course.instructor}</span>
                  </div>
                  
                  <div className="flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Clock className="h-6 w-6 text-blue-500 mb-2" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Duration</span>
                    <span className="text-gray-900 dark:text-white font-medium">{course.duration}</span>
                  </div>
                  
                  <div className="flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Layers className="h-6 w-6 text-blue-500 mb-2" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Level</span>
                    <span className="text-gray-900 dark:text-white font-medium">{course.level}</span>
                  </div>
                  
                  <div className="flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Calendar className="h-6 w-6 text-blue-500 mb-2" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Updated</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {new Date(course.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Course Content/Curriculum */}
            <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg mb-8">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Course Content
                </h2>
              </div>
              
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {modules.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                    No content available for this course yet.
                  </div>
                ) : (
                  modules.map(module => (
                    <div key={module._id} className="overflow-hidden">
                      {/* Module Header */}
                      <button
                        onClick={() => toggleModule(module._id)}
                        className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none"
                      >
                        <div className="flex items-start space-x-4">
                          <div className="w-8 h-8 flex items-center justify-center bg-blue-100 dark:bg-blue-900 rounded-full text-blue-600 dark:text-blue-400 font-semibold">
                            {module.order}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {module.title}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {module.description}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${expandedModules[module._id] ? 'transform rotate-90' : ''}`} />
                      </button>
                      
                      {/* Module Content */}
                      {expandedModules[module._id] && (
                        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4">
                          {!moduleChapters[module._id] ? (
                            <div className="text-center py-4">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                              <span className="mt-2 block text-sm text-gray-500 dark:text-gray-400">Loading chapters...</span>
                            </div>
                          ) : moduleChapters[module._id].length === 0 ? (
                            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                              No chapters available for this module yet.
                            </div>
                          ) : (
                            <ul className="divide-y divide-gray-200 dark:divide-gray-600">
                              {moduleChapters[module._id].map(chapter => (
                                <li key={chapter._id} className="py-3">
                                  <Link 
                                    to={`/courses/${courseId}/chapter/${chapter._id}`}
                                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                  >
                                    <div className="flex items-center">
                                      <div className={`w-8 h-8 flex items-center justify-center rounded-full mr-3 ${
                                        chapter.type === 'article' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' :
                                        chapter.type === 'quiz' ? 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400' :
                                        'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                                      }`}>
                                        {chapter.type === 'article' ? (
                                          <Book className="h-4 w-4" />
                                        ) : chapter.type === 'quiz' ? (
                                          <span className="text-sm font-bold">Q</span>
                                        ) : (
                                          <span className="text-sm font-bold">▶</span>
                                        )}
                                      </div>
                                      <div>
                                        <h4 className="font-medium text-gray-900 dark:text-white">
                                          {chapter.title}
                                        </h4>
                                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                          <span className="capitalize">{chapter.type}</span>
                                          <span className="mx-1">•</span>
                                          <span>{chapter.duration} min</span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {courseProgress && (
                                      isChapterCompleted(chapter._id) ? (
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                      ) : (
                                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600"></div>
                                      )
                                    )}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              {/* Course Info Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-6">
                {courseProgress ? (
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                      Your Progress
                    </h3>
                    
                    <div className="mb-6">
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-600 dark:text-gray-400">Completion</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {Math.round(courseProgress.progress)}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                          style={{ width: `${courseProgress.progress}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {courseProgress.completionDate ? (
                      <div className="text-center">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                        <p className="font-medium text-gray-900 dark:text-white mb-1">
                          Course Completed!
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          {new Date(courseProgress.completionDate).toLocaleDateString()}
                        </p>
                        {courseProgress.certificateId && (
                          <button
                            onClick={viewCertificate}
                            className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors flex items-center justify-center"
                          >
                            <Award className="mr-2 h-5 w-5" />
                            View Certificate
                          </button>
                        )}
                      </div>
                    ) : (
                      <Link
                        to={`/courses/${courseId}/chapter/${moduleChapters[modules[0]?._id]?.[0]?._id}`}
                        className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                      >
                        {courseProgress.progress > 0 ? 'Continue Learning' : 'Start Learning'}
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        {renderStars(course.rating)}
                        <span className="ml-2 text-gray-500 dark:text-gray-400">
                          ({course.ratingCount} ratings)
                        </span>
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                        This course includes:
                      </h4>
                      <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <li className="flex items-center">
                          <Book className="h-4 w-4 mr-2 text-blue-500" />
                          Full lifetime access
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="h-4 w-4 mr-2 text-blue-500" />
                          Certificate of completion
                        </li>
                        <li className="flex items-center">
                          <Layers className="h-4 w-4 mr-2 text-blue-500" />
                          {modules.length} modules
                        </li>
                      </ul>
                    </div>
                    
                    <button
                      onClick={enrollInCourse}
                      disabled={enrolling}
                      className={`w-full px-4 py-3 ${enrolling 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700'
                      } text-white font-medium rounded-lg transition-colors flex items-center justify-center`}
                    >
                      {enrolling ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Enrolling...
                        </>
                      ) : 'Enroll Now - Free'}
                    </button>
                  </div>
                )}
              </div>
              
              {/* Tags */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Course Tags
                  </h3>
                  
                  <div className="flex flex-wrap gap-2">
                    {course.tags.map(tag => (
                      <span 
                        key={tag} 
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Certificate Modal */}
      {showCertificate && certificateData && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Course Certificate
              </h3>
              <button 
                onClick={() => setShowCertificate(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              <Certificate 
                certificateData={{
                  ...certificateData,
                  isEligible: true,
                  completionPercentage: 100,
                  company: course.title,
                  totalProblems: 1,
                  solvedProblems: 1,
                  difficultyStats: { easy: { total: 0, solved: 0 }, medium: { total: 0, solved: 0 }, hard: { total: 0, solved: 0 } }
                }}
                onDownload={downloadCertificate}
              />
              
              <div className="mt-6 flex justify-center">
                <button
                  onClick={downloadCertificate}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Award className="mr-2 h-5 w-5" />
                  Download Certificate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetail;
