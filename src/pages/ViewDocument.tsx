import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import axios from 'axios';
import { API_URL } from '../config/api';
import { ArrowLeft, Loader, AlertCircle } from 'lucide-react';
import { showError } from '../utils/toast';
import { blocksToHtml } from '../components/TiptapEditor';

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
  blocks: any[];
  featured_image?: string;
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

const ViewDocument: React.FC = () => {
  const { docId } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDocument = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/documents/${docId}`);
        if (res.data.success) {
          setDocument(res.data.document);
        } else {
          setError('Document not found');
        }
      } catch (err) {
        console.error('Error loading document:', err);
        setError('Failed to load document');
        showError('Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    if (docId) {
      loadDocument();
    }
  }, [docId]);

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="flex flex-col items-center gap-4">
          <Loader className="animate-spin text-orange-600" size={48} />
          <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center px-4`}>
        <div className={`text-center max-w-md ${isDark ? 'bg-gray-800' : 'bg-white'} p-8 rounded-lg`}>
          <AlertCircle className="mx-auto mb-4 text-red-600" size={48} />
          <p className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {error || 'Document not found'}
          </p>
          <button
            onClick={() => navigate('/admin/documents')}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
      {/* Header */}
      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-40`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/admin/documents')}
            className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium mb-4"
          >
            <ArrowLeft size={20} />
            Back to Documents
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Featured Image */}
        {document.featured_image && (
          <div className="mb-8 rounded-xl overflow-hidden shadow-lg">
            <img
              src={document.featured_image}
              alt={document.title}
              className="w-full h-96 object-cover"
            />
          </div>
        )}

        {/* Title and Meta */}
        <div className="mb-8">
          <h1 className={`text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {document.title}
          </h1>
          {document.description && (
            <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
              {document.description}
            </p>
          )}
          <div className={`flex gap-4 text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
            {document.subject && (
              <span className="flex items-center gap-1">
                <span>{document.subject.icon}</span>
                {document.subject.name}
              </span>
            )}
            {document.createdBy && (
              <span>By {document.createdBy.username}</span>
            )}
            <span>
              {document.createdAt ? 
                new Date(document.createdAt).toLocaleDateString() : 
                'Date not available'
              }
            </span>
          </div>
        </div>

        {/* Document Content */}
        <div className={`rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} p-8 border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          {document.blocks && document.blocks.length > 0 ? (
            <div className={`prose ${isDark ? 'dark' : ''} max-w-none`}>
              <div dangerouslySetInnerHTML={{ __html: blocksToHtml(document.blocks) }} />
            </div>
          ) : (
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>No content available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewDocument;
