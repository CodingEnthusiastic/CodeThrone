import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { ThumbsUp, ThumbsDown, MessageSquare, Send, Pin, Lock } from 'lucide-react';
import { API_URL, SOCKET_URL } from "../config/api";
import { useTheme } from '../contexts/ThemeContext';

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
  const { isDark } = useTheme();
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [commentVoteLoading, setCommentVoteLoading] = useState<string | null>(null); // commentId being voted
  const [discussionVoteLoading, setDiscussionVoteLoading] = useState<boolean>(false); // loader for main discussion vote

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
    setDiscussionVoteLoading(true);
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
      await fetchDiscussion();
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setDiscussionVoteLoading(false);
    }
  };

  const handleCommentVote = async (commentId: string, voteType: 'up' | 'down') => {
    if (!user || !discussion || !token) return;
    setCommentVoteLoading(commentId);
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
      await fetchDiscussion();
    } catch (error) {
      console.error('Error voting on comment:', error);
    } finally {
      setCommentVoteLoading(null);
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
      <div className={`min-h-screen flex items-center justify-center ${
        isDark
          ? "bg-gradient-to-br from-[#181824] via-[#23243a] to-[#181824]"
          : "bg-gradient-to-br from-[#f0f4ff] via-[#eaf0fa] to-[#f7faff]"
      }`}>
        <div className={`animate-spin rounded-full h-32 w-32 border-b-4 ${
          isDark ? "border-blue-400" : "border-blue-600"
        }`}></div>
      </div>
    );
  }

  if (!discussion) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark
          ? "bg-gradient-to-br from-[#181824] via-[#23243a] to-[#181824]"
          : "bg-gradient-to-br from-[#f0f4ff] via-[#eaf0fa] to-[#f7faff]"
      }`}>
        <div className="text-center">
          <h2 className={`text-2xl font-bold mb-4 ${
            isDark ? "text-[#e0e7ff]" : "text-[#1e293b]"
          }`}>Discussion not found</h2>
          <p className={`${isDark ? "text-[#a5b4fc]" : "text-[#64748b]"}`}>The discussion you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark
        ? "bg-gradient-to-br from-[#181824] via-[#23243a] to-[#181824]"
        : "bg-gradient-to-br from-[#f0f4ff] via-[#eaf0fa] to-[#f7faff]"
    }`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Discussion Header */}
        <div className={`rounded-lg shadow-lg p-6 mb-6 ${
          isDark
            ? "bg-gradient-to-br from-[#23243a] to-[#181824] border border-[#6366f1]/30"
            : "bg-gradient-to-br from-[#eaf0fa] to-[#f7faff] border border-[#38bdf8]/20"
        }`}>
          {/* Loader overlay for discussion vote */}
          {discussionVoteLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 dark:bg-black/40 z-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
          <div className="flex items-start justify-between relative">
            <div className="flex-1">
              <div className="flex items-center mb-4">
                {discussion.isPinned && (
                  <Pin className="h-5 w-5 text-[#6366f1] mr-2" />
                )}
                {discussion.isLocked && (
                  <Lock className="h-5 w-5 text-[#ef4444] mr-2" />
                )}
                <h1 className={`text-2xl font-bold ${
                  isDark ? "text-[#e0e7ff]" : "text-[#1e293b]"
                }`}>{discussion.title}</h1>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {discussion.tags.map((tag, index) => (
                  <span
                    key={index}
                    className={`px-2 py-1 text-xs rounded-full font-semibold shadow ${
                      isDark
                        ? "bg-gradient-to-r from-[#6366f1]/30 to-[#38bdf8]/30 text-[#e0e7ff]"
                        : "bg-gradient-to-r from-[#38bdf8]/20 to-[#6366f1]/20 text-[#1e293b]"
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="prose max-w-none mb-6">
                <p className={`${isDark ? "text-[#60a5fa]" : "text-[#64748b]"} whitespace-pre-wrap`}>{discussion.content}</p>
              </div>
              <div className={`flex items-center justify-between text-sm ${
                isDark ? "text-[#a5b4fc]" : "text-[#64748b]"
              }`}>
                <div className="flex items-center space-x-4">
                  <span>By {discussion.author.username}</span>
                  <span>{new Date(discussion.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MessageSquare className={`h-4 w-4 ${
                    isDark ? "text-[#38bdf8]" : "text-[#6366f1]"
                  }`} />
                  <span>{discussion.comments.length} comments</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center ml-6">
              <button
                onClick={() => handleVote('up')}
                className={`p-2 rounded-full transition-all duration-200 shadow ${
                  !user 
                    ? isDark
                      ? 'bg-[#23243a] border border-[#6366f1]/10 cursor-not-allowed'
                      : 'bg-gray-100 border border-[#38bdf8]/10 cursor-not-allowed'
                    : user && hasUserVoted(discussion.upvotes, user.id)
                    ? 'bg-gradient-to-r from-[#22c55e] to-[#38bdf8] hover:from-[#38bdf8] hover:to-[#22c55e] shadow-lg transform hover:scale-105'
                    : isDark
                      ? 'bg-[#23243a] border border-[#22c55e]/30 hover:bg-[#181824]'
                      : 'bg-gray-100 border border-[#22c55e]/20 hover:bg-[#eaf0fa]'
                }`}
                disabled={!user || discussionVoteLoading}
              >
                <ThumbsUp
                  className={`h-5 w-5 ${
                    user && hasUserVoted(discussion.upvotes, user.id)
                      ? 'text-white'
                      : isDark ? 'text-[#22c55e]' : 'text-[#22c55e]'
                  }`}
                />
              </button>
              <span className={`text-lg font-bold my-2 px-2 py-1 rounded-md shadow text-center ${
                isDark
                  ? "bg-[#23243a] text-[#e0e7ff] border border-[#6366f1]/20"
                  : "bg-[#eaf0fa] text-[#1e293b] border border-[#38bdf8]/10"
              }`}>
                {discussion.upvotes.length - discussion.downvotes.length}
              </span>
              <button
                onClick={() => handleVote('down')}
                className={`p-2 rounded-full transition-all duration-200 shadow ${
                  !user 
                    ? isDark
                      ? 'bg-[#23243a] border border-[#6366f1]/10 cursor-not-allowed'
                      : 'bg-gray-100 border border-[#38bdf8]/10 cursor-not-allowed'
                    : user && hasUserVoted(discussion.downvotes, user.id)
                    ? 'bg-gradient-to-r from-[#ef4444] to-[#f87171] hover:from-[#f87171] hover:to-[#ef4444] shadow-lg transform hover:scale-105'
                    : isDark
                      ? 'bg-[#23243a] border border-[#ef4444]/30 hover:bg-[#181824]'
                      : 'bg-gray-100 border border-[#ef4444]/20 hover:bg-[#eaf0fa]'
                }`}
                disabled={!user || discussionVoteLoading}
              >
                <ThumbsDown
                  className={`h-5 w-5 ${
                    user && hasUserVoted(discussion.downvotes, user.id)
                      ? 'text-white'
                      : isDark ? 'text-[#ef4444]' : 'text-[#ef4444]'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Add Comment Form */}
        {user && !discussion.isLocked && (
          <div className={`rounded-lg shadow-lg p-6 mb-6 ${
            isDark
              ? "bg-gradient-to-br from-[#23243a] to-[#181824] border border-[#6366f1]/30"
              : "bg-gradient-to-br from-[#eaf0fa] to-[#f7faff] border border-[#38bdf8]/20"
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${
              isDark ? "text-[#e0e7ff]" : "text-[#1e293b]"
            }`}>Add a Comment</h3>
            <form onSubmit={handleAddComment}>
              <div className="mb-4">
                <textarea
                  rows={4}
                  className={`w-full px-3 py-2 rounded-md border focus:ring-2 focus:border-transparent ${
                    isDark
                      ? "bg-[#23243a] text-[#e0e7ff] border-[#6366f1]/30 focus:ring-[#6366f1]"
                      : "bg-white text-[#1e293b] border-[#38bdf8]/20 focus:ring-[#38bdf8]"
                  }`}
                  placeholder="Share your thoughts..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className={`flex items-center px-4 py-2 rounded-md font-semibold shadow transition-all duration-200 ${
                  isDark
                    ? "bg-gradient-to-r from-[#6366f1] to-[#38bdf8] text-white hover:from-[#38bdf8] hover:to-[#6366f1]"
                    : "bg-gradient-to-r from-[#38bdf8] to-[#6366f1] text-white hover:from-[#6366f1] hover:to-[#38bdf8]"
                }`}
              >
                <Send className="h-4 w-4 mr-2" />
                Post Comment
              </button>
            </form>
          </div>
        )}

        {/* Comments */}
        <div className="space-y-4">
          <h3 className={`text-lg font-semibold ${
            isDark ? "text-[#e0e7ff]" : "text-[#1e293b]"
          }`}>
            Comments ({discussion.comments.length})
          </h3>
          {discussion.comments.map((comment) => (
            <div key={comment._id} className={`rounded-lg shadow-md p-6 ${
              isDark
                ? "bg-gradient-to-br from-[#23243a] to-[#181824] border border-[#6366f1]/20"
                : "bg-gradient-to-br from-[#eaf0fa] to-[#f7faff] border border-[#38bdf8]/10"
            }`}>
              {/* Loader overlay for comment vote */}
              {commentVoteLoading === comment._id && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 dark:bg-black/40 z-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}
              <div className="flex items-start justify-between relative">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span className={`font-medium ${
                      isDark ? "text-[#e0e7ff]" : "text-[#1e293b]"
                    }`}>{comment.author.username}</span>
                    <span className={`text-sm ml-2 ${
                      isDark ? "text-[#a5b4fc]" : "text-[#64748b]"
                    }`}>
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className={`${isDark ? "text-[#60a5fa]" : "text-[#64748b]"} whitespace-pre-wrap`}>{comment.content}</p>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleCommentVote(comment._id, 'up')}
                    className={`p-1 rounded-full transition-all duration-200 shadow ${
                      !user 
                        ? isDark
                          ? 'bg-[#23243a] border border-[#6366f1]/10 cursor-not-allowed'
                          : 'bg-gray-50 border border-[#38bdf8]/10 cursor-not-allowed'
                        : user && hasUserVoted(comment.upvotes, user.id)
                        ? 'bg-gradient-to-r from-[#22c55e] to-[#38bdf8] hover:from-[#38bdf8] hover:to-[#22c55e] shadow-lg transform hover:scale-110'
                        : isDark
                          ? 'bg-[#23243a] border border-[#22c55e]/30 hover:bg-[#181824]'
                          : 'bg-gray-50 border border-[#22c55e]/20 hover:bg-[#eaf0fa]'
                    }`}
                    disabled={!user || commentVoteLoading === comment._id}
                  >
                    <ThumbsUp
                      className={`h-4 w-4 ${
                        user && hasUserVoted(comment.upvotes, user.id)
                          ? 'text-white'
                          : isDark ? 'text-[#22c55e]' : 'text-[#22c55e]'
                      }`}
                    />
                  </button>
                  <span className={`text-sm font-medium px-2 py-1 rounded-md min-w-[24px] text-center shadow ${
                    isDark
                      ? "bg-[#23243a] text-[#e0e7ff] border border-[#6366f1]/20"
                      : "bg-[#eaf0fa] text-[#1e293b] border border-[#38bdf8]/10"
                  }`}>
                    {comment.upvotes.length - comment.downvotes.length}
                  </span>
                  <button
                    onClick={() => handleCommentVote(comment._id, 'down')}
                    className={`p-1 rounded-full transition-all duration-200 shadow ${
                      !user 
                        ? isDark
                          ? 'bg-[#23243a] border border-[#6366f1]/10 cursor-not-allowed'
                          : 'bg-gray-50 border border-[#38bdf8]/10 cursor-not-allowed'
                        : user && hasUserVoted(comment.downvotes, user.id)
                        ? 'bg-gradient-to-r from-[#ef4444] to-[#f87171] hover:from-[#f87171] hover:to-[#ef4444] shadow-lg transform hover:scale-110'
                        : isDark
                          ? 'bg-[#23243a] border border-[#ef4444]/30 hover:bg-[#181824]'
                          : 'bg-gray-50 border border-[#ef4444]/20 hover:bg-[#eaf0fa]'
                    }`}
                    disabled={!user || commentVoteLoading === comment._id}
                  >
                    <ThumbsDown
                      className={`h-4 w-4 ${
                        user && hasUserVoted(comment.downvotes, user.id)
                          ? 'text-white'
                          : isDark ? 'text-[#ef4444]' : 'text-[#ef4444]'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {discussion.comments.length === 0 && (
            <div className={`text-center py-8 ${
              isDark ? "text-[#60a5fa]" : "text-[#64748b]"
            }`}>
              <MessageSquare className={`h-12 w-12 mx-auto mb-4 opacity-50 ${
                isDark ? "text-[#38bdf8]" : "text-[#6366f1]"
              }`} />
              <p>No comments yet. Be the first to share your thoughts!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiscussionDetail;
