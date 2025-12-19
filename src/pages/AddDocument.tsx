import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config/api';
import {
  ArrowLeft,
  Plus,
  X,
  FileText,
  BookOpen,
  Loader,
  CheckCircle,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { showError, showSuccess } from '../utils/toast';
import TiptapEditor from '../components/TiptapEditor';

interface Subject {
  _id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
}

interface Document {
  _id: string;
  title: string;
  description: string;
  subject: string;
  content: any;
  order: number;
  featured_image?: string;
  createdAt: string;
}

const AddDocument: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const { docId } = useParams();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    order: 1,
    featured_image: ''
  });
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showNewSubject, setShowNewSubject] = useState(false);
  const [newSubject, setNewSubject] = useState({
    name: '',
    description: '',
    icon: '📚',
    color: '#3B82F6'
  });
  const [isEditing, setIsEditing] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/');
      showError('Access denied. Admin only.');
    }
  }, [user, navigate]);

  // Load subjects and document if editing
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        const res = await axios.get(`${API_URL}/documents/subjects`, { headers });
        setSubjects(res.data.subjects || res.data || []);

        // If editing, load document data
        if (docId) {
          const docRes = await axios.get(`${API_URL}/documents/${docId}`, { headers });
          const doc = docRes.data;
          setFormData({
            title: doc.title || '',
            description: doc.description || '',
            subject: doc.subject?._id || '',
            order: doc.order || 1,
            featured_image: doc.featured_image || ''
          });
          setContent(doc.content || []);
          setIsEditing(true);
        } else {
          setContent([]);
        }
      } catch (error: any) {
        console.error('Error loading data:', error?.response?.data || error.message);
        // Don't show error on initial load for new document
        if (docId) {
          showError('Failed to load document');
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [docId]);

  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'order' ? parseInt(value) : value
    }));
  };

  // Handle create new subject
  const handleCreateSubject = async () => {
    if (!newSubject.name.trim()) {
      showError('Please enter subject name');
      return;
    }

    try {
      setSubmitting(true);
      const res = await axios.post(`${API_URL}/documents/subjects`, newSubject, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const createdSubject = res.data;
      setSubjects([...subjects, createdSubject]);
      setFormData(prev => ({
        ...prev,
        subject: createdSubject._id
      }));
      setNewSubject({
        name: '',
        description: '',
        icon: '📚',
        color: '#3B82F6'
      });
      setShowNewSubject(false);
      showSuccess('Subject created successfully');
    } catch (error) {
      console.error('Error creating subject:', error);
      showError('Failed to create subject');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showError('Image must be less than 2MB');
      return;
    }

    try {
      setImageUploading(true);
      const formDataObj = new FormData();
      formDataObj.append('image', file);

      const res = await axios.post(`${API_URL}/documents/upload-image`, formDataObj, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setFormData(prev => ({
        ...prev,
        featured_image: res.data.url
      }));
      showSuccess('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      showError('Failed to upload image');
    } finally {
      setImageUploading(false);
    }
  };

  // Remove featured image
  const handleRemoveImage = async () => {
    if (formData.featured_image) {
      try {
        // Extract public ID from Cloudinary URL
        const urlParts = formData.featured_image.split('/');
        const publicId = urlParts[urlParts.length - 1].split('.')[0];
        
        await axios.delete(`${API_URL}/documents/delete-image/${publicId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });

        setFormData(prev => ({
          ...prev,
          featured_image: ''
        }));
        showSuccess('Image removed');
      } catch (error) {
        console.error('Error removing image:', error);
        showError('Failed to remove image');
      }
    }
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      showError('Please enter document title');
      return;
    }

    if (!formData.subject) {
      showError('Please select a subject');
      return;
    }

    if (!content) {
      showError('Please add document content');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        content: content,
        isPublished: true
      };

      if (isEditing && docId) {
        await axios.put(`${API_URL}/documents/${docId}`, payload, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        showSuccess('Document updated successfully');
      } else {
        await axios.post(`${API_URL}/documents`, payload, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        showSuccess('Document created successfully');
      }

      navigate('/admin/documents');
    } catch (error) {
      console.error('Error submitting:', error);
      showError('Failed to save document');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="flex flex-col items-center gap-4">
          <Loader className="animate-spin text-orange-600" size={48} />
          <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
      {/* Header */}
      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-40`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/documents')}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="text-orange-600" size={24} />
              </button>
              <div>
                <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {isEditing ? 'Edit Article' : 'Create New Article'}
                </h1>
                <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {isEditing ? 'Update article content and details' : 'Add new learning content'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className={`rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} p-8 border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <h2 className={`text-2xl font-bold mb-6 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <FileText className="text-orange-600" size={28} />
              Basic Information
            </h2>

            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className={`block text-sm font-semibold mb-3 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter article title"
                  className={`w-full px-4 py-3 rounded-lg border ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  } focus:outline-none focus:ring-2 focus:ring-orange-600 transition-all`}
                />
              </div>

              {/* Description */}
              <div>
                <label className={`block text-sm font-semibold mb-3 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter article description (optional)"
                  rows={3}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  } focus:outline-none focus:ring-2 focus:ring-orange-600 transition-all resize-none`}
                />
              </div>

              {/* Subject Selection */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className={`block text-sm font-semibold mb-3 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                    Subject *
                  </label>
                  <div className="flex gap-2">
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      className={`flex-1 px-4 py-3 rounded-lg border ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-orange-600 transition-all`}
                    >
                      <option value="">Select a subject</option>
                      {(subjects || []).map(subject => (
                        <option key={subject._id} value={subject._id}>
                          {subject.icon} {subject.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewSubject(!showNewSubject)}
                      className="px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
                    >
                      <Plus size={20} />
                      New
                    </button>
                  </div>
                </div>

                {/* Order */}
                <div>
                  <label className={`block text-sm font-semibold mb-3 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                    Order
                  </label>
                  <input
                    type="number"
                    name="order"
                    value={formData.order}
                    onChange={handleInputChange}
                    min="1"
                    className={`w-full px-4 py-3 rounded-lg border ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-orange-600 transition-all`}
                  />
                </div>
              </div>

              {/* Create New Subject Form */}
              {showNewSubject && (
                <div className={`p-6 rounded-lg border-2 border-orange-600 ${isDark ? 'bg-gray-700' : 'bg-orange-50'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Create New Subject
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowNewSubject(false)}
                      className={`p-1 rounded hover:${isDark ? 'bg-gray-600' : 'bg-orange-100'} transition-colors`}
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Subject name"
                      value={newSubject.name}
                      onChange={(e) => setNewSubject(prev => ({ ...prev, name: e.target.value }))}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        isDark
                          ? 'bg-gray-600 border-gray-600 text-white placeholder-gray-500'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                      } focus:outline-none focus:ring-2 focus:ring-orange-600 transition-all`}
                    />
                    <textarea
                      placeholder="Description (optional)"
                      value={newSubject.description}
                      onChange={(e) => setNewSubject(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        isDark
                          ? 'bg-gray-600 border-gray-600 text-white placeholder-gray-500'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                      } focus:outline-none focus:ring-2 focus:ring-orange-600 transition-all resize-none`}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Icon (emoji)"
                        value={newSubject.icon}
                        onChange={(e) => setNewSubject(prev => ({ ...prev, icon: e.target.value }))}
                        className={`px-4 py-2 rounded-lg border ${
                          isDark
                            ? 'bg-gray-600 border-gray-600 text-white placeholder-gray-500'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                        } focus:outline-none focus:ring-2 focus:ring-orange-600 transition-all`}
                      />
                      <input
                        type="color"
                        value={newSubject.color}
                        onChange={(e) => setNewSubject(prev => ({ ...prev, color: e.target.value }))}
                        className={`w-full px-4 py-2 rounded-lg border ${
                          isDark
                            ? 'bg-gray-600 border-gray-600'
                            : 'bg-white border-gray-300'
                        } focus:outline-none focus:ring-2 focus:ring-orange-600 transition-all cursor-pointer`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateSubject}
                      disabled={submitting}
                      className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader size={18} className="animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus size={18} />
                          Create Subject
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Featured Image */}
          <div className={`rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} p-8 border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <h2 className={`text-2xl font-bold mb-6 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <BookOpen className="text-orange-600" size={28} />
              Featured Image
            </h2>

            <div className="space-y-4">
              {formData.featured_image ? (
                <div className="relative">
                  <img
                    src={formData.featured_image}
                    alt="Featured"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ) : (
                <label className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDark
                    ? 'border-gray-700 hover:border-orange-600 hover:bg-gray-700'
                    : 'border-gray-300 hover:border-orange-600 hover:bg-orange-50'
                }`}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={imageUploading}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center gap-2">
                    {imageUploading ? (
                      <>
                        <Loader className="animate-spin text-orange-600" size={32} />
                        <p className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Uploading...</p>
                      </>
                    ) : (
                      <>
                        <FileText className="text-orange-600" size={32} />
                        <p className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          Click to upload image
                        </p>
                        <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                          PNG, JPG or GIF (max 2MB)
                        </p>
                      </>
                    )}
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Content Editor */}
          <div className={`rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} p-8 border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <h2 className={`text-2xl font-bold mb-6 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <FileText className="text-orange-600" size={28} />
              Content
            </h2>

            <TiptapEditor
              content={content || []}
              onChange={setContent}
              placeholder="Start writing your article content..."
              className="min-h-[500px]"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 sticky bottom-4">
            <button
              type="button"
              onClick={() => navigate('/admin/documents')}
              className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                isDark
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              {submitting ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  {isEditing ? 'Update Article' : 'Create Article'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDocument;
