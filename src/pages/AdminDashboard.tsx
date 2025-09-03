import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Book, Plus, Edit, Archive, Layout, Layers, FileText, BookOpen, Home, GraduationCap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import CourseManager from './Admin/CourseManager';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Course {
  _id: string;
  title: string;
  description: string;
  thumbnail: string;
  instructor: string;
  level: string;
  published: boolean;
  createdAt: string;
}

const AdminDashboard: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('courses');
  
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    
    fetchCourses();
  }, [user, navigate]);
  
  const fetchCourses = async () => {
    try {
      setLoading(true);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API_URL}/admin/courses`, { headers });
      setCourses(response.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };
  
  const togglePublished = async (courseId: string, currentStatus: boolean) => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.put(
        `${API_URL}/admin/courses/${courseId}`, 
        { published: !currentStatus }, 
        { headers }
      );
      
      setCourses(courses.map(course => 
        course._id === courseId 
          ? { ...course, published: !currentStatus } 
          : course
      ));
    } catch (error) {
      console.error('Error updating course:', error);
    }
  };
  
  const renderSideNav = () => (
    <div className="w-64 bg-white dark:bg-gray-800 h-full shadow-md">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Admin Panel</h2>
      </div>
      <nav className="p-4">
        <ul className="space-y-2">
          <li>
            <Link
              to="/"
              className="flex items-center p-3 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Home className="h-5 w-5 mr-3" />
              Back to Site
            </Link>
          </li>
          <li>
            <button
              onClick={() => setActiveTab('courses')}
              className={`w-full flex items-center p-3 rounded-lg ${
                activeTab === 'courses' 
                  ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Book className="h-5 w-5 mr-3" />
              Courses
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveTab('modules')}
              className={`w-full flex items-center p-3 rounded-lg ${
                activeTab === 'modules' 
                  ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Layers className="h-5 w-5 mr-3" />
              Modules
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveTab('chapters')}
              className={`w-full flex items-center p-3 rounded-lg ${
                activeTab === 'chapters' 
                  ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <FileText className="h-5 w-5 mr-3" />
              Chapters
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveTab('quizzes')}
              className={`w-full flex items-center p-3 rounded-lg ${
                activeTab === 'quizzes' 
                  ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <BookOpen className="h-5 w-5 mr-3" />
              Quizzes
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveTab('announcements')}
              className={`w-full flex items-center p-3 rounded-lg ${
                activeTab === 'announcements' 
                  ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Layout className="h-5 w-5 mr-3" />
              Announcements
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
  
  const renderCourses = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Courses</h2>
        <Link
          to="/admin/courses/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Course
        </Link>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-4 text-lg text-gray-600 dark:text-gray-400">Loading courses...</span>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-lg text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button 
            onClick={fetchCourses}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-md">
          <Book className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No courses found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Start by creating your first course.
          </p>
          <Link
            to="/admin/courses/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Course
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Level</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Instructor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {courses.map(course => (
                  <tr key={course._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <img
                            className="h-10 w-10 rounded-md object-cover"
                            src={course.thumbnail || 'https://via.placeholder.com/40?text=Course'}
                            alt={course.title}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'https://via.placeholder.com/40?text=Course';
                            }}
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{course.title}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">{course.level}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">{course.instructor}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(course.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        course.published 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {course.published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          to={`/admin/courses/${course._id}`}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200"
                        >
                          <Edit className="h-5 w-5" />
                        </Link>
                        <button
                          onClick={() => togglePublished(course._id, course.published)}
                          className={`${
                            course.published 
                              ? 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                              : 'text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-200'
                          }`}
                        >
                          <Archive className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
  
  const renderModules = () => (
    <div className="text-center py-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Modules Management</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">Select a course to manage its modules.</p>
      <Link
        to="/admin/courses"
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Go to Courses
      </Link>
    </div>
  );
  
  const renderChapters = () => (
    <div className="text-center py-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Chapters Management</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">Select a module to manage its chapters.</p>
      <Link
        to="/admin/courses"
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Go to Courses
      </Link>
    </div>
  );
  
  const renderQuizzes = () => (
    <div className="text-center py-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Quizzes Management</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">Select a chapter to manage its quiz.</p>
      <Link
        to="/admin/courses"
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Go to Courses
      </Link>
    </div>
  );
  
  const renderAnnouncements = () => (
    <div className="text-center py-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Announcements Management</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">Create and manage announcements for courses.</p>
      <Link
        to="/admin/announcements/new"
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Create Announcement
      </Link>
    </div>
  );
  
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex">
      {/* Sidebar */}
      {renderSideNav()}
      
      {/* Main Content */}
      <div className="flex-1 p-8 overflow-auto">
        {activeTab === 'courses' && <CourseManager />}
        {activeTab === 'modules' && renderModules()}
        {activeTab === 'chapters' && renderChapters()}
        {activeTab === 'quizzes' && renderQuizzes()}
        {activeTab === 'announcements' && renderAnnouncements()}
      </div>
    </div>
  );
};

export default AdminDashboard;
