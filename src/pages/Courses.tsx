// import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, Book, Clock, BarChart } from 'lucide-react';
// import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// import { Search, Book, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
// import { useTheme } from '../contexts/ThemeContext';

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

const Courses: React.FC = () => {
  const { isDark } = useTheme();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  
  useEffect(() => {
    fetchCourses();
  }, []);
  
  useEffect(() => {
    filterCourses();
  }, [searchTerm, selectedLevel, selectedTag, courses]);
  
  const fetchCourses = async () => {
    try {
      setLoading(true);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API_URL}/api/courses`, { headers });
      setCourses(response.data);
      setFilteredCourses(response.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };
  
  const filterCourses = () => {
    let filtered = [...courses];
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(course => 
        course.title.toLowerCase().includes(term) || 
        course.description.toLowerCase().includes(term) ||
        course.instructor.toLowerCase().includes(term) ||
        course.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }
    
    // Filter by level
    if (selectedLevel) {
      filtered = filtered.filter(course => course.level === selectedLevel);
    }
    
    // Filter by tag
    if (selectedTag) {
      filtered = filtered.filter(course => course.tags.includes(selectedTag));
    }
    
    setFilteredCourses(filtered);
  };
  
  const getAllTags = () => {
    const allTags = courses.flatMap(course => course.tags);
    return [...new Set(allTags)]; // Remove duplicates
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
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-lg text-gray-600 dark:text-gray-400">Loading courses...</span>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-lg text-red-600 dark:text-red-400 mb-4">{error}</p>
              <button 
                onClick={fetchCourses}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Courses
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
            Expand your skills with our comprehensive programming courses
          </p>
        </div>
        
        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              {/* Level filter */}
              <select
                value={selectedLevel || ''}
                onChange={(e) => setSelectedLevel(e.target.value || null)}
                className="px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              >
                <option value="">All Levels</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
              
              {/* Tags filter */}
              <select
                value={selectedTag || ''}
                onChange={(e) => setSelectedTag(e.target.value || null)}
                className="px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              >
                <option value="">All Tags</option>
                {getAllTags().map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
              
              {/* Clear filters */}
              {(searchTerm || selectedLevel || selectedTag) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedLevel(null);
                    setSelectedTag(null);
                  }}
                  className="px-4 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Course Grid */}
        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map(course => (
              <div 
                key={course._id}
                onClick={() => navigate(`/courses/${course._id}`)}
                className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
              >
                {/* Course Image */}
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={course.thumbnail} 
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://via.placeholder.com/400x225?text=Course+Image';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-70"></div>
                  <div className="absolute bottom-0 left-0 p-4">
                    <span className="inline-block bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded-md">
                      {course.level}
                    </span>
                  </div>
                </div>
                
                {/* Course Info */}
                <div className="p-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {course.title}
                  </h3>
                  
                  <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-3 mb-3">
                    {course.description}
                  </p>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      {renderStars(course.rating)}
                      <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">
                        ({course.ratingCount})
                      </span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <Clock className="h-4 w-4 mr-1" />
                      {course.duration}
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      By {course.instructor}
                    </div>
                    <div className="text-blue-600 dark:text-blue-400 font-medium text-sm">
                      View Course →
                    </div>
                  </div>
                </div>
                
                {/* Course Tags */}
                <div className="px-4 pb-4">
                  <div className="flex flex-wrap gap-2 mt-2">
                    {course.tags.slice(0, 3).map(tag => (
                      <span 
                        key={tag} 
                        className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-md"
                      >
                        {tag}
                      </span>
                    ))}
                    {course.tags.length > 3 && (
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-md">
                        +{course.tags.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 text-center">
            <Book className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No courses found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              We couldn't find any courses matching your criteria.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedLevel(null);
                setSelectedTag(null);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Courses;
