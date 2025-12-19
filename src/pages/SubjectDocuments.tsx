import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config/api';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Eye,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  AlertCircle,
  FileText,
  Calendar,
  User,
  ArrowLeft,
  Loader
} from 'lucide-react';
import { showError, showSuccess } from '../utils/toast';

interface Document {
  _id: string;
  title: string;
  description: string;
  subject: {
    _id: string;
    name: string;
    icon: string;
    color: string;
  };
  order: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    username: string;
    profile?: {
      avatar: string;
    };
  };
  isPublished: boolean;
  tags: string[];
  difficulty: string;
}

interface Subject {
  _id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  isActive: boolean;
  documentsCount: number;
  createdAt: string;
}

interface ExpandedSubjects {
  [key: string]: boolean;
}

const SubjectDocuments: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubjects, setExpandedSubjects] = useState<ExpandedSubjects>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Check if user is admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/');
      showError('Access denied. Admin only.');
    }
  }, [user, navigate]);

  // Load subjects and documents
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        const [subjectsRes, docsRes] = await Promise.all([
          axios.get(`${API_URL}/documents/subjects`, { headers }),
          axios.get(`${API_URL}/documents?published=all`, { headers })
        ]);

        setSubjects(subjectsRes.data.subjects || subjectsRes.data || []);
        setDocuments(docsRes.data.documents || docsRes.data || []);

        // Auto-expand first subject
        const subjectsArray = subjectsRes.data.subjects || subjectsRes.data || [];
        if (subjectsArray && subjectsArray.length > 0) {
          setExpandedSubjects({ [subjectsArray[0]._id]: true });
        }
      } catch (error) {
        console.error('Error loading data:', error);
        showError('Failed to load subjects and documents');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Toggle subject expansion
  const toggleSubject = (subjectId: string) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [subjectId]: !prev[subjectId]
    }));
  };

  // Get documents for a subject
  const getSubjectDocuments = (subjectId: string): Document[] => {
    return documents.filter(doc => doc.subject._id === subjectId);
  };

  // Filter and search
  const getFilteredDocuments = (docs: Document[]): Document[] => {
    return docs.filter(doc => {
      const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           doc.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  };

  // Delete document
  const handleDeleteDocument = async (docId: string) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        setDeletingId(docId);
        await axios.delete(`${API_URL}/documents/${docId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        setDocuments(documents.filter(d => d._id !== docId));
        showSuccess('Document deleted successfully');
      } catch (error) {
        console.error('Error deleting document:', error);
        showError('Failed to delete document');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleAddDocument = () => {
    navigate('/admin/add-document');
  };

  const handleEditDocument = (docId: string) => {
    navigate(`/admin/edit-document/${docId}`);
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="flex flex-col items-center gap-4">
          <Loader className="animate-spin text-orange-600" size={48} />
          <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
      {/* Header */}
      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-40`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin')}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="text-orange-600" size={24} />
              </button>
              <div>
                <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Learning Resources
                </h1>
                <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Manage your course materials and articles
                </p>
              </div>
            </div>
            <button
              onClick={handleAddDocument}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg transition-colors font-medium shadow-lg hover:shadow-xl"
            >
              <Plus size={20} />
              Add Article
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className={`absolute left-4 top-3.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} size={20} />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-12 pr-4 py-3 rounded-lg border ${
                isDark
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              } focus:outline-none focus:ring-2 focus:ring-orange-600 transition-all`}
            />
          </div>
        </div>

        {subjects.length === 0 ? (
          <div className={`rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} p-12 text-center`}>
            <AlertCircle className="mx-auto mb-4 text-orange-600" size={48} />
            <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
              No subjects available yet
            </p>
            <button
              onClick={handleAddDocument}
              className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
            >
              <Plus size={20} />
              Create First Article
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {(subjects || []).map((subject) => {
              const subjectDocs = getFilteredDocuments(getSubjectDocuments(subject._id));
              const isExpanded = expandedSubjects[subject._id] || false;

              return (
                <div
                  key={subject._id}
                  className={`rounded-xl overflow-hidden border transition-all ${
                    isDark
                      ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Subject Header */}
                  <button
                    onClick={() => toggleSubject(subject._id)}
                    className={`w-full px-6 py-5 flex items-center justify-between ${
                      isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                    } transition-colors`}
                  >
                    <div className="flex items-center gap-4 text-left">
                      <div
                        className="w-14 h-14 rounded-lg flex items-center justify-center text-2xl shadow-md"
                        style={{ backgroundColor: subject.color + '20' }}
                      >
                        {subject.icon}
                      </div>
                      <div>
                        <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {subject.name}
                        </h3>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                          {subjectDocs.length} {subjectDocs.length === 1 ? 'article' : 'articles'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                        isDark
                          ? 'bg-gray-700 text-gray-300'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {subjectDocs.length}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="text-orange-600" size={24} />
                      ) : (
                        <ChevronDown className={isDark ? 'text-gray-500' : 'text-gray-400'} size={24} />
                      )}
                    </div>
                  </button>

                  {/* Documents List */}
                  {isExpanded && (
                    <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                      {subjectDocs.length === 0 ? (
                        <div className="px-6 py-8 text-center">
                          <FileText className={`mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} size={32} />
                          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            No articles in this subject yet
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y" style={{
                          divideColor: isDark ? '#4b5563' : '#e5e7eb'
                        }}>
                          {subjectDocs.map((doc, index) => (
                            <div
                              key={doc._id}
                              className={`px-6 py-5 hover:${isDark ? 'bg-gray-600' : 'bg-white'} transition-colors`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className={`inline-block w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                                      isDark
                                        ? 'bg-orange-600 text-white'
                                        : 'bg-orange-100 text-orange-700'
                                    }`}>
                                      {index + 1}
                                    </span>
                                    <h4 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                      {doc.title}
                                    </h4>
                                  </div>
                                  {doc.description && (
                                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} ml-11`}>
                                      {doc.description}
                                    </p>
                                  )}
                                  <div className={`flex items-center gap-4 mt-3 ml-11 text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                    {doc.createdBy && (
                                      <div className="flex items-center gap-1">
                                        <User size={14} />
                                        {doc.createdBy.username}
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1">
                                      <Calendar size={14} />
                                      {new Date(doc.createdAt).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <button
                                    onClick={() => navigate(`/admin/view-document/${doc._id}`)}
                                    className={`p-2 rounded-lg transition-colors ${
                                      isDark
                                        ? 'bg-gray-600 hover:bg-gray-500 text-blue-400'
                                        : 'bg-gray-100 hover:bg-gray-200 text-blue-600'
                                    }`}
                                    title="View"
                                  >
                                    <Eye size={18} />
                                  </button>
                                  <button
                                    onClick={() => handleEditDocument(doc._id)}
                                    className={`p-2 rounded-lg transition-colors ${
                                      isDark
                                        ? 'bg-gray-600 hover:bg-gray-500 text-green-400'
                                        : 'bg-gray-100 hover:bg-gray-200 text-green-600'
                                    }`}
                                    title="Edit"
                                  >
                                    <Edit size={18} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDocument(doc._id)}
                                    disabled={deletingId === doc._id}
                                    className={`p-2 rounded-lg transition-colors ${
                                      isDark
                                        ? 'bg-gray-600 hover:bg-gray-500 text-red-400'
                                        : 'bg-gray-100 hover:bg-gray-200 text-red-600'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    title="Delete"
                                  >
                                    {deletingId === doc._id ? (
                                      <Loader size={18} className="animate-spin" />
                                    ) : (
                                      <Trash2 size={18} />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubjectDocuments;
