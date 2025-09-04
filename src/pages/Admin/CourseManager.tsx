import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Book, FileText, FilePlus, Trash2, Edit, Plus, Check, X, ChevronDown, ChevronUp } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Course {
  _id: string;
  title: string;
  description: string;
  thumbnail: string;
  instructor: string;
  duration: string;
  level: string;
  published: boolean;
  tags: string[];
  createdAt: string;
}

interface Module {
  _id: string;
  title: string;
  description: string;
  course: string;
  order: number;
  published: boolean;
}

interface Chapter {
  _id: string;
  title: string;
  module: string;
  order: number;
  type: 'article' | 'video' | 'quiz';
  content: string;
  duration: number;
  published: boolean;
}

interface Quiz {
  _id: string;
  title: string;
  chapter: string;
  questions: {
    text: string;
    options: {
      text: string;
      isCorrect: boolean;
    }[];
    explanation: string;
  }[];
  passingScore: number;
  timeLimit: number;
}

const CourseManager: React.FC = () => {
  const { token } = useAuth();
  const { isDark } = useTheme();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showAddModule, setShowAddModule] = useState(false);
  const [showAddChapter, setShowAddChapter] = useState(false);
  
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    thumbnail: '',
    instructor: '',
    duration: '',
    level: 'Beginner',
    tags: [''],
    published: false
  });
  
  const [newModule, setNewModule] = useState({
    title: '',
    description: '',
    order: 0,
    published: false
  });
  
  const [newChapter, setNewChapter] = useState({
    title: '',
    order: 0,
    type: 'article' as 'article' | 'video' | 'quiz',
    content: '',
    duration: 0,
    published: false
  });

  // Course CRUD
  const fetchCourses = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/api/courses/admin`, { headers });
      setCourses(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError('Failed to load courses');
      setLoading(false);
    }
  };
  
  const createCourse = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `${API_URL}/api/courses`, 
        newCourse,
        { headers }
      );
      
      setSuccess('Course created successfully!');
      setNewCourse({
        title: '',
        description: '',
        thumbnail: '',
        instructor: '',
        duration: '',
        level: 'Beginner',
        tags: [''],
        published: false
      });
      setShowAddCourse(false);
      fetchCourses();
    } catch (err) {
      console.error('Error creating course:', err);
      setError('Failed to create course');
    } finally {
      setLoading(false);
    }
  };
  
  const updateCourse = async (courseId: string, updates: Partial<Course>) => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(
        `${API_URL}/api/courses/${courseId}`,
        updates,
        { headers }
      );
      
      setSuccess('Course updated successfully!');
      fetchCourses();
    } catch (err) {
      console.error('Error updating course:', err);
      setError('Failed to update course');
    } finally {
      setLoading(false);
    }
  };
  
  const deleteCourse = async (courseId: string) => {
    if (!window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API_URL}/api/courses/${courseId}`, { headers });
      
      setSuccess('Course deleted successfully!');
      setSelectedCourse(null);
      fetchCourses();
    } catch (err) {
      console.error('Error deleting course:', err);
      setError('Failed to delete course');
    } finally {
      setLoading(false);
    }
  };

  // Module CRUD
  const fetchModules = async (courseId: string) => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/api/courses/${courseId}`, { headers });
      setModules(response.data.modules);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching modules:', err);
      setError('Failed to load modules');
      setLoading(false);
    }
  };
  
  const createModule = async () => {
    if (!selectedCourse) return;
    
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `${API_URL}/api/courses/module`,
        {
          ...newModule,
          course: selectedCourse._id
        },
        { headers }
      );
      
      setSuccess('Module created successfully!');
      setNewModule({
        title: '',
        description: '',
        order: modules.length + 1,
        published: false
      });
      setShowAddModule(false);
      fetchModules(selectedCourse._id);
    } catch (err) {
      console.error('Error creating module:', err);
      setError('Failed to create module');
    } finally {
      setLoading(false);
    }
  };
  
  const updateModule = async (moduleId: string, updates: Partial<Module>) => {
    if (!selectedCourse) return;
    
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(
        `${API_URL}/api/courses/module/${moduleId}`,
        updates,
        { headers }
      );
      
      setSuccess('Module updated successfully!');
      fetchModules(selectedCourse._id);
    } catch (err) {
      console.error('Error updating module:', err);
      setError('Failed to update module');
    } finally {
      setLoading(false);
    }
  };
  
  const deleteModule = async (moduleId: string) => {
    if (!selectedCourse) return;
    
    if (!window.confirm('Are you sure you want to delete this module? All chapters will be deleted too.')) {
      return;
    }
    
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API_URL}/api/courses/module/${moduleId}`, { headers });
      
      setSuccess('Module deleted successfully!');
      setSelectedModule(null);
      fetchModules(selectedCourse._id);
    } catch (err) {
      console.error('Error deleting module:', err);
      setError('Failed to delete module');
    } finally {
      setLoading(false);
    }
  };

  // Chapter CRUD
  const fetchChapters = async (moduleId: string) => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/api/courses/module/${moduleId}`, { headers });
      setChapters(response.data.chapters);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching chapters:', err);
      setError('Failed to load chapters');
      setLoading(false);
    }
  };
  
  const createChapter = async () => {
    if (!selectedModule) return;
    
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `${API_URL}/api/courses/chapter`,
        {
          ...newChapter,
          module: selectedModule._id
        },
        { headers }
      );
      
      setSuccess('Chapter created successfully!');
      setNewChapter({
        title: '',
        order: chapters.length + 1,
        type: 'article',
        content: '',
        duration: 0,
        published: false
      });
      setShowAddChapter(false);
      fetchChapters(selectedModule._id);
    } catch (err) {
      console.error('Error creating chapter:', err);
      setError('Failed to create chapter');
    } finally {
      setLoading(false);
    }
  };
  
  const updateChapter = async (chapterId: string, updates: Partial<Chapter>) => {
    if (!selectedModule) return;
    
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(
        `${API_URL}/api/courses/chapter/${chapterId}`,
        updates,
        { headers }
      );
      
      setSuccess('Chapter updated successfully!');
      fetchChapters(selectedModule._id);
    } catch (err) {
      console.error('Error updating chapter:', err);
      setError('Failed to update chapter');
    } finally {
      setLoading(false);
    }
  };
  
  const deleteChapter = async (chapterId: string) => {
    if (!selectedModule) return;
    
    if (!window.confirm('Are you sure you want to delete this chapter?')) {
      return;
    }
    
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API_URL}/api/courses/chapter/${chapterId}`, { headers });
      
      setSuccess('Chapter deleted successfully!');
      fetchChapters(selectedModule._id);
    } catch (err) {
      console.error('Error deleting chapter:', err);
      setError('Failed to delete chapter');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [token]);
  
  useEffect(() => {
    if (selectedCourse) {
      fetchModules(selectedCourse._id);
      setSelectedModule(null);
    }
  }, [selectedCourse]);
  
  useEffect(() => {
    if (selectedModule) {
      fetchChapters(selectedModule._id);
    }
  }, [selectedModule]);
  
  return (
    <div className={`p-4 ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {error && (
        <div className="p-4 mb-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg">
          {error}
          <button 
            className="ml-2 text-red-600 dark:text-red-400"
            onClick={() => setError(null)}
          >
            ×
          </button>
        </div>
      )}
      
      {success && (
        <div className="p-4 mb-4 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg">
          {success}
          <button 
            className="ml-2 text-green-600 dark:text-green-400"
            onClick={() => setSuccess(null)}
          >
            ×
          </button>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row gap-4">
        {/* Course List */}
        <div className="md:w-1/3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Courses</h3>
            <button 
              onClick={() => setShowAddCourse(!showAddCourse)}
              className={`flex items-center px-3 py-1 rounded-md ${
                isDark 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-blue-500 hover:bg-blue-600'
              } text-white`}
            >
              {showAddCourse ? <X size={16} /> : <Plus size={16} />}
              <span className="ml-1">{showAddCourse ? 'Cancel' : 'New Course'}</span>
            </button>
          </div>
          
          {/* Add Course Form */}
          {showAddCourse && (
            <div className={`p-4 mb-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <h4 className="text-lg font-medium mb-2">Add New Course</h4>
              
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Title</label>
                <input 
                  type="text" 
                  value={newCourse.title}
                  onChange={(e) => setNewCourse({...newCourse, title: e.target.value})}
                  className={`w-full px-3 py-2 rounded-md ${isDark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'} border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
                  placeholder="Course Title"
                />
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea 
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
                  className={`w-full px-3 py-2 rounded-md ${isDark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'} border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
                  placeholder="Course Description"
                  rows={3}
                ></textarea>
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Thumbnail URL</label>
                <input 
                  type="text" 
                  value={newCourse.thumbnail}
                  onChange={(e) => setNewCourse({...newCourse, thumbnail: e.target.value})}
                  className={`w-full px-3 py-2 rounded-md ${isDark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'} border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Instructor</label>
                <input 
                  type="text" 
                  value={newCourse.instructor}
                  onChange={(e) => setNewCourse({...newCourse, instructor: e.target.value})}
                  className={`w-full px-3 py-2 rounded-md ${isDark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'} border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
                  placeholder="Instructor Name"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Duration</label>
                  <input 
                    type="text" 
                    value={newCourse.duration}
                    onChange={(e) => setNewCourse({...newCourse, duration: e.target.value})}
                    className={`w-full px-3 py-2 rounded-md ${isDark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'} border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
                    placeholder="e.g. 4 hours"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Level</label>
                  <select
                    value={newCourse.level}
                    onChange={(e) => setNewCourse({...newCourse, level: e.target.value})}
                    className={`w-full px-3 py-2 rounded-md ${isDark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'} border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Tags (comma separated)</label>
                <input 
                  type="text" 
                  value={newCourse.tags.join(', ')}
                  onChange={(e) => setNewCourse({...newCourse, tags: e.target.value.split(',').map(tag => tag.trim())})}
                  className={`w-full px-3 py-2 rounded-md ${isDark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'} border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
                  placeholder="javascript, web, programming"
                />
              </div>
              
              <div className="flex items-center mb-4">
                <input 
                  type="checkbox" 
                  id="published" 
                  checked={newCourse.published}
                  onChange={(e) => setNewCourse({...newCourse, published: e.target.checked})}
                  className="w-4 h-4"
                />
                <label htmlFor="published" className="ml-2 text-sm">Publish immediately</label>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={createCourse}
                  disabled={loading}
                  className={`px-4 py-2 rounded-md ${
                    isDark 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  } flex items-center`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={16} className="mr-1" /> Create Course
                    </>
                  )}
                </button>
                <button 
                  onClick={() => setShowAddCourse(false)}
                  className={`px-4 py-2 rounded-md ${
                    isDark 
                      ? 'bg-gray-700 hover:bg-gray-600' 
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          {/* Course List */}
          <div className={`rounded-lg overflow-hidden border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            {courses.length === 0 ? (
              <div className={`p-4 text-center ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                No courses found. Create one to get started.
              </div>
            ) : (
              <ul>
                {courses.map((course) => (
                  <li 
                    key={course._id} 
                    className={`border-b last:border-b-0 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
                  >
                    <button
                      onClick={() => setSelectedCourse(course)}
                      className={`w-full text-left p-3 flex items-center ${
                        selectedCourse?._id === course._id
                          ? isDark ? 'bg-blue-900/30' : 'bg-blue-50'
                          : isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                      }`}
                    >
                      <Book size={18} className={`mr-2 ${course.published ? 'text-green-500' : 'text-gray-400'}`} />
                      <div className="flex-1">
                        <span className="block font-medium">{course.title}</span>
                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {course.level} • {course.duration}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        {/* Modules */}
        <div className="md:w-1/3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">
              {selectedCourse ? `Modules: ${selectedCourse.title}` : 'Modules'}
            </h3>
            {selectedCourse && (
              <button 
                onClick={() => setShowAddModule(!showAddModule)}
                disabled={!selectedCourse}
                className={`flex items-center px-3 py-1 rounded-md ${
                  !selectedCourse
                    ? 'bg-gray-400 cursor-not-allowed'
                    : isDark 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-blue-500 hover:bg-blue-600'
                } text-white`}
              >
                {showAddModule ? <X size={16} /> : <Plus size={16} />}
                <span className="ml-1">{showAddModule ? 'Cancel' : 'New Module'}</span>
              </button>
            )}
          </div>
          
          {/* Add Module Form */}
          {showAddModule && selectedCourse && (
            <div className={`p-4 mb-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <h4 className="text-lg font-medium mb-2">Add New Module</h4>
              
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Title</label>
                <input 
                  type="text" 
                  value={newModule.title}
                  onChange={(e) => setNewModule({...newModule, title: e.target.value})}
                  className={`w-full px-3 py-2 rounded-md ${isDark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'} border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
                  placeholder="Module Title"
                />
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea 
                  value={newModule.description}
                  onChange={(e) => setNewModule({...newModule, description: e.target.value})}
                  className={`w-full px-3 py-2 rounded-md ${isDark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'} border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
                  placeholder="Module Description"
                  rows={3}
                ></textarea>
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Order</label>
                <input 
                  type="number" 
                  value={newModule.order}
                  onChange={(e) => setNewModule({...newModule, order: parseInt(e.target.value)})}
                  className={`w-full px-3 py-2 rounded-md ${isDark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'} border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
                />
              </div>
              
              <div className="flex items-center mb-4">
                <input 
                  type="checkbox" 
                  id="module-published" 
                  checked={newModule.published}
                  onChange={(e) => setNewModule({...newModule, published: e.target.checked})}
                  className="w-4 h-4"
                />
                <label htmlFor="module-published" className="ml-2 text-sm">Publish immediately</label>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={createModule}
                  disabled={loading}
                  className={`px-4 py-2 rounded-md ${
                    isDark 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  } flex items-center`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={16} className="mr-1" /> Create Module
                    </>
                  )}
                </button>
                <button 
                  onClick={() => setShowAddModule(false)}
                  className={`px-4 py-2 rounded-md ${
                    isDark 
                      ? 'bg-gray-700 hover:bg-gray-600' 
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          {/* Module List */}
          {selectedCourse ? (
            <div className={`rounded-lg overflow-hidden border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              {modules.length === 0 ? (
                <div className={`p-4 text-center ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  No modules found. Create one to get started.
                </div>
              ) : (
                <ul>
                  {modules.map((module) => (
                    <li 
                      key={module._id} 
                      className={`border-b last:border-b-0 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
                    >
                      <button
                        onClick={() => setSelectedModule(module)}
                        className={`w-full text-left p-3 flex items-center ${
                          selectedModule?._id === module._id
                            ? isDark ? 'bg-blue-900/30' : 'bg-blue-50'
                            : isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                        }`}
                      >
                        <FileText size={18} className={`mr-2 ${module.published ? 'text-green-500' : 'text-gray-400'}`} />
                        <div className="flex-1">
                          <span className="block font-medium">{module.title}</span>
                          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Order: {module.order}
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'} text-center`}>
              Select a course to view its modules
            </div>
          )}
        </div>
        
        {/* Chapters */}
        <div className="md:w-1/3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">
              {selectedModule ? `Chapters: ${selectedModule.title}` : 'Chapters'}
            </h3>
            {selectedModule && (
              <button 
                onClick={() => setShowAddChapter(!showAddChapter)}
                disabled={!selectedModule}
                className={`flex items-center px-3 py-1 rounded-md ${
                  !selectedModule
                    ? 'bg-gray-400 cursor-not-allowed'
                    : isDark 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-blue-500 hover:bg-blue-600'
                } text-white`}
              >
                {showAddChapter ? <X size={16} /> : <Plus size={16} />}
                <span className="ml-1">{showAddChapter ? 'Cancel' : 'New Chapter'}</span>
              </button>
            )}
          </div>
          
          {/* Add Chapter Form */}
          {showAddChapter && selectedModule && (
            <div className={`p-4 mb-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <h4 className="text-lg font-medium mb-2">Add New Chapter</h4>
              
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Title</label>
                <input 
                  type="text" 
                  value={newChapter.title}
                  onChange={(e) => setNewChapter({...newChapter, title: e.target.value})}
                  className={`w-full px-3 py-2 rounded-md ${isDark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'} border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
                  placeholder="Chapter Title"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Order</label>
                  <input 
                    type="number" 
                    value={newChapter.order}
                    onChange={(e) => setNewChapter({...newChapter, order: parseInt(e.target.value)})}
                    className={`w-full px-3 py-2 rounded-md ${isDark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'} border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={newChapter.type}
                    onChange={(e) => setNewChapter({...newChapter, type: e.target.value as 'article' | 'video' | 'quiz'})}
                    className={`w-full px-3 py-2 rounded-md ${isDark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'} border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
                  >
                    <option value="article">Article</option>
                    <option value="video">Video</option>
                    <option value="quiz">Quiz</option>
                  </select>
                </div>
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">
                  {newChapter.type === 'video' ? 'Video URL' : 'Content'}
                </label>
                {newChapter.type === 'article' ? (
                  <textarea 
                    value={newChapter.content}
                    onChange={(e) => setNewChapter({...newChapter, content: e.target.value})}
                    className={`w-full px-3 py-2 rounded-md ${isDark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'} border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
                    placeholder="Article content in Markdown"
                    rows={10}
                  ></textarea>
                ) : (
                  <input 
                    type="text" 
                    value={newChapter.content}
                    onChange={(e) => setNewChapter({...newChapter, content: e.target.value})}
                    className={`w-full px-3 py-2 rounded-md ${isDark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'} border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
                    placeholder={newChapter.type === 'video' ? 'YouTube video URL' : 'Quiz content'}
                  />
                )}
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
                <input 
                  type="number" 
                  value={newChapter.duration}
                  onChange={(e) => setNewChapter({...newChapter, duration: parseInt(e.target.value)})}
                  className={`w-full px-3 py-2 rounded-md ${isDark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'} border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
                />
              </div>
              
              <div className="flex items-center mb-4">
                <input 
                  type="checkbox" 
                  id="chapter-published" 
                  checked={newChapter.published}
                  onChange={(e) => setNewChapter({...newChapter, published: e.target.checked})}
                  className="w-4 h-4"
                />
                <label htmlFor="chapter-published" className="ml-2 text-sm">Publish immediately</label>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={createChapter}
                  disabled={loading}
                  className={`px-4 py-2 rounded-md ${
                    isDark 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  } flex items-center`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={16} className="mr-1" /> Create Chapter
                    </>
                  )}
                </button>
                <button 
                  onClick={() => setShowAddChapter(false)}
                  className={`px-4 py-2 rounded-md ${
                    isDark 
                      ? 'bg-gray-700 hover:bg-gray-600' 
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          {/* Chapter List */}
          {selectedModule ? (
            <div className={`rounded-lg overflow-hidden border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              {chapters.length === 0 ? (
                <div className={`p-4 text-center ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  No chapters found. Create one to get started.
                </div>
              ) : (
                <ul>
                  {chapters.map((chapter) => (
                    <li 
                      key={chapter._id} 
                      className={`border-b last:border-b-0 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
                    >
                      <div
                        className={`w-full text-left p-3 flex items-center ${
                          isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className={`mr-2 ${
                          chapter.type === 'article' ? 'text-blue-500' : 
                          chapter.type === 'video' ? 'text-red-500' : 'text-green-500'
                        }`}>
                          {chapter.type === 'article' && <FileText size={18} />}
                          {chapter.type === 'video' && <FilePlus size={18} />}
                          {chapter.type === 'quiz' && <Book size={18} />}
                        </div>
                        <div className="flex-1">
                          <span className="block font-medium">{chapter.title}</span>
                          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Order: {chapter.order} • {chapter.duration} min • {chapter.type}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => updateChapter(chapter._id, { published: !chapter.published })}
                            className={`p-1 rounded ${
                              chapter.published 
                                ? isDark ? 'text-green-400 hover:bg-green-900/30' : 'text-green-600 hover:bg-green-100' 
                                : isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'
                            }`}
                            title={chapter.published ? 'Unpublish' : 'Publish'}
                          >
                            <Check size={16} />
                          </button>
                          <button 
                            onClick={() => deleteChapter(chapter._id)}
                            className={`p-1 rounded ${
                              isDark ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-100'
                            }`}
                            title="Delete Chapter"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'} text-center`}>
              Select a module to view its chapters
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseManager;
