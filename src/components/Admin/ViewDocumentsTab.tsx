import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Plus,
  BookOpen,
  Calendar,
  User,
  Tag,
  Star,
  Heart,
  SortAsc,
  SortDesc,
  Grid,
  List
} from 'lucide-react';

interface Subject {
  _id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  documentsCount: number;
  createdBy: {
    username: string;
  };
  createdAt: string;
}

interface Document {
  _id: string;
  title: string;
  slug: string;
  subject: Subject;
  description: string;
  tags: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  readTime: number;
  isPublished: boolean;
  isFeatured: boolean;
  views: number;
  likes: string[];
  metadata: {
    wordCount: number;
    imageCount: number;
  };
  createdBy: {
    username: string;
    profile?: {
      avatar?: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

interface ViewDocumentsTabProps {}

const ViewDocumentsTab: React.FC<ViewDocumentsTabProps> = () => {
  const { token } = useAuth();
  const { isDark } = useTheme();

  // State
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateSubject, setShowCreateSubject] = useState(false);
  const [newSubject, setNewSubject] = useState({
    name: '',
    description: '',
    icon: '📚',
    color: '#3B82F6'
  });

  // Fetch subjects
  const fetchSubjects = async () => {
    try {
      const response = await axios.get(`${API_URL}/documents/subjects`);
      if (response.data.success) {
        setSubjects(response.data.subjects);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  // Fetch documents
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        sortBy,
        sortOrder,
        published: 'true'
      });

      if (selectedSubject !== 'all') {
        params.append('subject', selectedSubject);
      }
      if (selectedDifficulty !== 'all') {
        params.append('difficulty', selectedDifficulty);
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const response = await axios.get(`${API_URL}/documents?${params}`);
      if (response.data.success) {
        setDocuments(response.data.documents);
        setTotalPages(response.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create subject
  const handleCreateSubject = async () => {
    try {
      const response = await axios.post(`${API_URL}/documents/subjects`, newSubject, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setSubjects([...subjects, response.data.subject]);
        setShowCreateSubject(false);
        setNewSubject({
          name: '',
          description: '',
          icon: '📚',
          color: '#3B82F6'
        });
        alert('Subject created successfully!');
      }
    } catch (error: any) {
      console.error('Error creating subject:', error);
      alert(error.response?.data?.message || 'Failed to create subject');
    }
  };

  // Delete document
  const handleDeleteDocument = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        const response = await axios.delete(`${API_URL}/documents/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
          setDocuments(documents.filter(doc => doc._id !== id));
          alert('Document deleted successfully!');
        }
      } catch (error: any) {
        console.error('Error deleting document:', error);
        alert(error.response?.data?.message || 'Failed to delete document');
      }
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [selectedSubject, selectedDifficulty, searchQuery, sortBy, sortOrder, currentPage]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Document Management</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage subjects and view all documents
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateSubject(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Subject
        </button>
      </div>

      {/* Subjects Overview */}
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Subjects</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {(subjects || []).map((subject) => (
            <div
              key={subject._id}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedSubject === subject._id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              onClick={() => setSelectedSubject(selectedSubject === subject._id ? 'all' : subject._id)}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{subject.icon}</span>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">{subject.name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {subject.documentsCount} documents
                  </p>
                </div>
              </div>
              {subject.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {subject.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Filters and Search */}
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-10 pr-4 py-2 w-full border rounded-lg ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              />
            </div>
          </div>

          {/* Difficulty Filter */}
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className={`px-4 py-2 border rounded-lg ${
              isDark
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
          >
            <option value="all">All Difficulties</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>

          {/* Sort Options */}
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={`px-4 py-2 border rounded-lg ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
            >
              <option value="createdAt">Created Date</option>
              <option value="updatedAt">Updated Date</option>
              <option value="title">Title</option>
              <option value="views">Views</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className={`px-3 py-2 border rounded-lg ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
                  : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
              } transition-colors`}
            >
              {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </button>

            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className={`px-3 py-2 border rounded-lg ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
                  : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
              } transition-colors`}
            >
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Documents Display */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading documents...</span>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((document) => (
                <div
                  key={document._id}
                  className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} 
                    rounded-lg border p-6 hover:shadow-lg transition-shadow`}
                >
                  {/* Document Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{document.subject.icon}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {document.subject.name}
                      </span>
                    </div>
                    {document.isFeatured && (
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    )}
                  </div>

                  {/* Document Title */}
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                    {document.title}
                  </h3>

                  {/* Description */}
                  {document.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-3">
                      {document.description}
                    </p>
                  )}

                  {/* Tags */}
                  {document.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {document.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 
                            text-xs rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                      {document.tags.length > 3 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          +{document.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-1 rounded-full ${getDifficultyColor(document.difficulty)}`}>
                        {document.difficulty}
                      </span>
                      <span>{document.readTime} min read</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {document.views}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {document.likes.length}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <User className="h-3 w-3" />
                      {document.createdBy.username}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => window.open(`/admin/document/${document._id}`, '_blank')}
                        className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded"
                        title="View Document"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => window.open(`/admin/edit-document/${document._id}`, '_blank')}
                        className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900 rounded"
                        title="Edit Document"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(document._id, document.title)}
                        className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                        title="Delete Document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List View */
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border overflow-hidden`}>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {documents.map((document) => (
                  <div key={document._id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-lg">{document.subject.icon}</span>
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {document.title}
                          </h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(document.difficulty)}`}>
                            {document.difficulty}
                          </span>
                          {document.isFeatured && (
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>{document.subject.name}</span>
                          <span>{document.readTime} min read</span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {document.views}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {document.likes.length}
                          </span>
                          <span>by {document.createdBy.username}</span>
                          <span>{formatDate(document.createdAt)}</span>
                        </div>
                        
                        {document.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">
                            {document.description}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => window.open(`/admin/document/${document._id}`, '_blank')}
                          className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded"
                          title="View Document"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => window.open(`/admin/edit-document/${document._id}`, '_blank')}
                          className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900 rounded"
                          title="Edit Document"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(document._id, document.title)}
                          className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                          title="Delete Document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-2 rounded-lg ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Previous
              </button>
              
              <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className={`px-3 py-2 rounded-lg ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Create Subject Modal */}
      {showCreateSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-md`}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create New Subject</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={newSubject.name}
                  onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="Enter subject name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newSubject.description}
                  onChange={(e) => setNewSubject({ ...newSubject, description: e.target.value })}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="Enter subject description"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Icon
                  </label>
                  <input
                    type="text"
                    value={newSubject.icon}
                    onChange={(e) => setNewSubject({ ...newSubject, icon: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    placeholder="📚"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Color
                  </label>
                  <input
                    type="color"
                    value={newSubject.color}
                    onChange={(e) => setNewSubject({ ...newSubject, color: e.target.value })}
                    className="w-full h-10 border rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateSubject(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSubject}
                disabled={!newSubject.name.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
              >
                Create Subject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewDocumentsTab;