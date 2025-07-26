import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { ThumbsUp, ThumbsDown, MessageSquare, Send, Pin, Lock } from 'lucide-react';
import { API_URL, SOCKET_URL } from "../config/api";

interface Comment {
  _id: string;
  content: string;
  author: {
    username: string;
  };
  upvotes: string[];
  downvotes: string[];
  createdAt: string;
}

interface Discussion {
  _id: string;
  title: string;
  content: string;
  author: {
    username: string;
  };
  tags: string[];
  upvotes: string[];
  downvotes: string[];
  comments: Comment[];
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
}

const DiscussionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, token } = useAuth(); // ✅ Get token from auth context
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchDiscussion();
    }
  }, [id]);

  const fetchDiscussion = async () => {
    try {
      const response = await axios.get(`${API_URL}/discussion/${id}`);
      setDiscussion(response.data);
    } catch (error) {
      console.error('Error fetching discussion:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (voteType: 'up' | 'down') => {
    if (!user || !discussion || !token) return;

    try {
      await axios.post(`${API_URL}/discussion/${discussion._id}/vote`, {
        type: voteType
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Refresh the discussion data
      fetchDiscussion();
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const handleCommentVote = async (commentId: string, voteType: 'up' | 'down') => {
    if (!user || !discussion || !token) return;

    try {
      await axios.post(`${API_URL}/discussion/${discussion._id}/comments/${commentId}/vote`, {
        type: voteType
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Refresh the discussion data
      fetchDiscussion();
    } catch (error) {
      console.error('Error voting on comment:', error);
    }
  };

  const hasUserVoted = (votes: string[], userId: string) => {
    return votes.some(voteId => voteId.toString() === userId);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !discussion || !newComment.trim() || !token) return;

    try {
      const response = await axios.post(`${API_URL}/discussion/${discussion._id}/comments`, {
        content: newComment
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setDiscussion({
        ...discussion,
        comments: [...discussion.comments, response.data]
      });
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!discussion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Discussion not found</h2>
          <p className="text-gray-600">The discussion you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Discussion Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-4">
                {discussion.isPinned && (
                  <Pin className="h-5 w-5 text-blue-600 mr-2" />
                )}
                {discussion.isLocked && (
                  <Lock className="h-5 w-5 text-red-600 mr-2" />
                )}
                <h1 className="text-2xl font-bold text-gray-900">{discussion.title}</h1>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {discussion.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              
              <div className="prose max-w-none mb-6">
                <p className="text-gray-700 whitespace-pre-wrap">{discussion.content}</p>
              </div>
              
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center space-x-4">
                  <span>By {discussion.author.username}</span>
                  <span>{new Date(discussion.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>{discussion.comments.length} comments</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-center ml-6">
              <button
                onClick={() => handleVote('up')}
                className={`p-2 rounded-full transition-all duration-200 ${
                  !user 
                    ? 'bg-gray-100 cursor-not-allowed' 
                    : user && hasUserVoted(discussion.upvotes, user.id)
                    ? 'bg-green-500 hover:bg-green-600 shadow-md transform hover:scale-105'
                    : 'bg-gray-100 hover:bg-green-100 border border-green-200'
                }`}
                disabled={!user}
              >
                <ThumbsUp
                  className={`h-5 w-5 ${
                    user && hasUserVoted(discussion.upvotes, user.id) ? 'text-white' : 'text-green-600'
                  }`}
                />
              </button>
              <span className="text-lg font-bold text-gray-700 my-2 px-2 py-1 bg-gray-100 rounded-md">
                {discussion.upvotes.length - discussion.downvotes.length}
              </span>
              <button
                onClick={() => handleVote('down')}
                className={`p-2 rounded-full transition-all duration-200 ${
                  !user 
                    ? 'bg-gray-100 cursor-not-allowed' 
                    : user && hasUserVoted(discussion.downvotes, user.id)
                    ? 'bg-red-500 hover:bg-red-600 shadow-md transform hover:scale-105'
                    : 'bg-gray-100 hover:bg-red-100 border border-red-200'
                }`}
                disabled={!user}
              >
                <ThumbsDown
                  className={`h-5 w-5 ${
                    user && hasUserVoted(discussion.downvotes, user.id) ? 'text-white' : 'text-red-600'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Add Comment Form */}
        {user && !discussion.isLocked && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Add a Comment</h3>
            <form onSubmit={handleAddComment}>
              <div className="mb-4">
                <textarea
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Share your thoughts..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Send className="h-4 w-4 mr-2" />
                Post Comment
              </button>
            </form>
          </div>
        )}

        {/* Comments */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Comments ({discussion.comments.length})
          </h3>
          
          {discussion.comments.map((comment) => (
            <div key={comment._id} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span className="font-medium text-gray-900">{comment.author.username}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleCommentVote(comment._id, 'up')}
                    className={`p-1 rounded-full transition-all duration-200 ${
                      !user 
                        ? 'bg-gray-50 cursor-not-allowed' 
                        : user && hasUserVoted(comment.upvotes, user.id)
                        ? 'bg-green-500 hover:bg-green-600 shadow-sm transform hover:scale-110'
                        : 'bg-gray-50 hover:bg-green-50 border border-green-200'
                    }`}
                    disabled={!user}
                  >
                    <ThumbsUp
                      className={`h-4 w-4 ${
                        user && hasUserVoted(comment.upvotes, user.id) ? 'text-white' : 'text-green-600'
                      }`}
                    />
                  </button>
                  <span className="text-sm font-medium text-gray-700 px-2 py-1 bg-gray-100 rounded-md min-w-[24px] text-center">
                    {comment.upvotes.length - comment.downvotes.length}
                  </span>
                  <button
                    onClick={() => handleCommentVote(comment._id, 'down')}
                    className={`p-1 rounded-full transition-all duration-200 ${
                      !user 
                        ? 'bg-gray-50 cursor-not-allowed' 
                        : user && hasUserVoted(comment.downvotes, user.id)
                        ? 'bg-red-500 hover:bg-red-600 shadow-sm transform hover:scale-110'
                        : 'bg-gray-50 hover:bg-red-50 border border-red-200'
                    }`}
                    disabled={!user}
                  >
                    <ThumbsDown
                      className={`h-4 w-4 ${
                        user && hasUserVoted(comment.downvotes, user.id) ? 'text-white' : 'text-red-600'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {discussion.comments.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No comments yet. Be the first to share your thoughts!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiscussionDetail;