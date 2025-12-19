import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import TiptapEditor from '../TiptapEditor';
import {
  Save,
  Eye,
  EyeOff,
  Tag,
  BookOpen,
  Star,
  AlertCircle,
  Check,
  X,
  Plus,
  Minus
} from 'lucide-react';

interface Subject {
  _id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

interface AddDocumentTabProps {}

const AddDocumentTab: React.FC<AddDocumentTabProps> = () => {
  const { token } = useAuth();
  const { isDark } = useTheme();

  // State
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    description: '',
    difficulty: 'Beginner' as 'Beginner' | 'Intermediate' | 'Advanced',
    tags: [] as string[],
    isPublished: false,
    isFeatured: false
  });
  
  const [blocks, setBlocks] = useState<any[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

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

  // Handle form input changes
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Add tag
  const addTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim().toLowerCase())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim().toLowerCase()]
      }));
      setCurrentTag('');
    }
  };

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Save document
  const handleSave = async (publish: boolean = false) => {
    try {
      setSaving(true);
      setMessage(null);

      // Validation
      if (!formData.title.trim()) {
        throw new Error('Document title is required');
      }
      if (!formData.subject) {
        throw new Error('Subject is required');
      }
      if (blocks.length === 0) {
        throw new Error('Document content cannot be empty');
      }

      const documentData = {
        ...formData,
        blocks,
        isPublished: publish || formData.isPublished
      };

      const response = await axios.post(`${API_URL}/documents`, documentData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setMessage({
          type: 'success',
          text: `Document ${publish ? 'published' : 'saved'} successfully!`
        });
        
        // Reset form after successful save
        if (publish) {
          setFormData({
            title: '',
            subject: '',
            description: '',
            difficulty: 'Beginner',
            tags: [],
            isPublished: false,
            isFeatured: false
          });
          setBlocks([]);
        }
      }
    } catch (error: any) {
      console.error('Error saving document:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || error.message || 'Failed to save document'
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  // Auto-hide messages after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-800';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800';
      case 'Advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-800';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Document</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Create rich documents with images, code blocks, and more
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              previewMode
                ? 'bg-blue-600 border-blue-600 text-white'
                : isDark
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            } flex items-center gap-2`}
          >
            {previewMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {previewMode ? 'Edit' : 'Preview'}
          </button>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`p-4 rounded-lg border flex items-center gap-3 ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
            : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
        }`}>
          {message.type === 'success' ? (
            <Check className="h-5 w-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
          )}
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="ml-auto p-1 hover:bg-black/10 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Document Title */}
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-6`}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Document Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter a compelling title for your document"
              className={`w-full px-4 py-3 text-lg border rounded-lg ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
            />
          </div>

          {/* Document Description */}
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-6`}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Provide a brief description of your document"
              rows={3}
              className={`w-full px-4 py-3 border rounded-lg ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
            />
          </div>

          {/* Document Content */}
          {previewMode ? (
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-6`}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Preview</h3>
              <div className={`prose max-w-none ${isDark ? 'prose-invert' : ''}`}>
                {blocks.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 italic">
                    No content to preview. Switch back to edit mode to add content.
                  </p>
                ) : (
                  <div>
                    {blocks.map((block, index) => {
                      switch (block.type) {
                        case 'heading':
                          const HeadingTag = `h${block.attrs?.level || 1}` as keyof JSX.IntrinsicElements;
                          return (
                            <HeadingTag key={index} className="font-bold">
                              {block.content}
                            </HeadingTag>
                          );
                        case 'paragraph':
                          return <p key={index}>{block.content}</p>;
                        case 'image':
                          return (
                            <img
                              key={index}
                              src={block.attrs?.src}
                              alt={block.attrs?.alt || ''}
                              className="max-w-full h-auto rounded-lg shadow-sm"
                            />
                          );
                        case 'codeBlock':
                          return (
                            <pre key={index} className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">
                              <code>{block.content}</code>
                            </pre>
                          );
                        default:
                          return (
                            <div key={index} className="text-gray-600 dark:text-gray-400">
                              {JSON.stringify(block)}
                            </div>
                          );
                      }
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-6`}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                Document Content *
              </label>
              <TiptapEditor
                content={blocks}
                onChange={setBlocks}
                placeholder="Start writing your document content..."
                className="min-h-[400px]"
              />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Document Settings */}
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-6`}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Document Settings
            </h3>
            
            <div className="space-y-4">
              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subject *
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                >
                  <option value="">Select a subject</option>
                  {(subjects || []).map((subject) => (
                    <option key={subject._id} value={subject._id}>
                      {subject.icon} {subject.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Difficulty Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Beginner', 'Intermediate', 'Advanced'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => handleInputChange('difficulty', level)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        formData.difficulty === level
                          ? getDifficultyColor(level)
                          : isDark
                            ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tags
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={currentTag}
                      onChange={(e) => setCurrentTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      placeholder="Add a tag"
                      className={`flex-1 px-3 py-2 text-sm border rounded-lg ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    />
                    <button
                      onClick={addTag}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-sm rounded-full"
                        >
                          <Tag className="h-3 w-3" />
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Publishing Options */}
              <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(e) => handleInputChange('isPublished', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Publish immediately
                  </span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => handleInputChange('isFeatured', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    Mark as featured
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-6`}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actions</h3>
            
            <div className="space-y-3">
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                className={`w-full px-4 py-2 border rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  isDark
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700 disabled:bg-gray-700 disabled:text-gray-500'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400'
                } ${saving ? 'cursor-not-allowed' : ''}`}
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? 'Saving...' : 'Save as Draft'}
              </button>

              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                className={`w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2`}
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                {saving ? 'Publishing...' : 'Publish Document'}
              </button>
            </div>
          </div>

          {/* Document Stats */}
          {blocks.length > 0 && (
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-6`}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Document Stats</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Blocks:</span>
                  <span className="text-gray-900 dark:text-white">{blocks.length}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Images:</span>
                  <span className="text-gray-900 dark:text-white">
                    {blocks.filter(block => block.type === 'image').length}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Code Blocks:</span>
                  <span className="text-gray-900 dark:text-white">
                    {blocks.filter(block => block.type === 'codeBlock').length}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddDocumentTab;