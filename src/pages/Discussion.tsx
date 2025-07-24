import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import {
  Search,
  Plus,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Pin,
  Lock,
} from 'lucide-react';

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
  comments: any[];
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
}

const Discussion: React.FC = () => {
  const { user, token } = useAuth(); // ✅ Get token from auth context
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [allUsers, setAllUsers] = useState<string[]>([]);

  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newDiscussion, setNewDiscussion] = useState({
    title: '',
    content: '',
    tags: '',
  });

  useEffect(() => {
    fetchDiscussions();
  }, [selectedTag, sortBy]);

  const fetchDiscussions = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedTag) params.append('tag', selectedTag);
      if (sortBy) params.append('sortBy', sortBy);

      const response = await axios.get(
        `http://localhost:5000/api/discussion?${params}`
      );

      setDiscussions(response.data.discussions);

      // ✅ Extract all unique usernames from discussions
      const uniqueUsers = Array.from(
        new Set(
          (response.data.discussions as Discussion[]).map((d) => d.author.username)
        )
      );
      setAllUsers(uniqueUsers);
    } catch (error) {
      console.error('Error fetching discussions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDiscussion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token) return;

    try {
      const response = await axios.post('http://localhost:5000/api/discussion', {
        title: newDiscussion.title,
        content: newDiscussion.content,
        tags: newDiscussion.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag),
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setDiscussions([response.data, ...discussions]);
      setNewDiscussion({ title: '', content: '', tags: '' });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating discussion:', error);
    }
  };

  const handleVote = async (discussionId: string, voteType: 'up' | 'down') => {
    if (!user || !token) return;

    try {
      const response = await axios.post(
        `http://localhost:5000/api/discussion/${discussionId}/vote`,
        { type: voteType },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setDiscussions((prev) =>
        prev.map((discussion) =>
          discussion._id === discussionId
            ? {
                ...discussion,
                upvotes: Array(response.data.upvotes).fill(''),
                downvotes: Array(response.data.downvotes).fill(''),
              }
            : discussion
        )
      );
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const filteredDiscussions = discussions.filter(
    (discussion) =>
      (discussion.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
     discussion.content.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (selectedUser ? discussion.author.username === selectedUser : true)
  );

  const allTags = [...new Set(discussions.flatMap((d) => d.tags))];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Discussion Forum</h1>
            <p className="text-gray-600">Ask questions, share knowledge, and connect with the community</p>
          </div>
          {user && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Discussion
            </button>
          )}
        </div>

        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Create New Discussion</h3>
            <form onSubmit={handleCreateDiscussion}>
              <input
                type="text"
                required
                placeholder="Title"
                className="w-full mb-3 px-3 py-2 border rounded-md"
                value={newDiscussion.title}
                onChange={(e) => setNewDiscussion({ ...newDiscussion, title: e.target.value })}
              />
              <textarea
                rows={5}
                required
                placeholder="Content"
                className="w-full mb-3 px-3 py-2 border rounded-md"
                value={newDiscussion.content}
                onChange={(e) => setNewDiscussion({ ...newDiscussion, content: e.target.value })}
              />
              <input
                type="text"
                placeholder="Tags (comma separated)"
                className="w-full mb-3 px-3 py-2 border rounded-md"
                value={newDiscussion.tags}
                onChange={(e) => setNewDiscussion({ ...newDiscussion, tags: e.target.value })}
              />
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Submit
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 border rounded-md"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search discussions..."
              className="w-full pl-10 pr-4 py-2 border rounded-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="px-4 py-2 border rounded-md"
          >
            <option value="">All Tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'popular')}
            className="px-4 py-2 border rounded-md"
          >
            <option value="recent">Most Recent</option>
            <option value="popular">Most Popular</option>
          </select>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="px-4 py-2 border rounded-md"
          >
            <option value="">All Users</option>
            {allUsers.map((username) => (
              <option key={username} value={username}>
                {username}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setSelectedTag('');
              setSearchTerm('');
              setSortBy('recent');
              setSelectedUser('');
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Clear Filters
          </button>
        </div>

        {/* Discussions */}
        <div className="space-y-4">
          {filteredDiscussions.map((discussion) => (
            <div key={discussion._id} className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    {discussion.isPinned && <Pin className="h-4 w-4 text-blue-500 mr-1" />}
                    {discussion.isLocked && <Lock className="h-4 w-4 text-red-500 mr-1" />}
                    <Link
                      to={`/top/${discussion._id}`}
                      className="text-lg font-semibold text-gray-900 hover:text-blue-600"
                    >
                      {discussion.title}
                    </Link>
                  </div>
                  <p className="text-gray-700 line-clamp-3 mb-3">{discussion.content}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {discussion.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <div className="flex space-x-3">
                      <span>By {discussion.author.username}</span>
                      <span>{new Date(discussion.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MessageSquare className="h-4 w-4" />
                      <span>{discussion.comments.length}</span>
                    </div>
                  </div>
                </div>
                <div className="ml-4 flex flex-col items-center space-y-1">
                  <button
                    onClick={() => handleVote(discussion._id, 'up')}
                    disabled={!user}
                    className="p-1 hover:bg-gray-100 rounded-full"
                  >
                    <ThumbsUp
                      className={`h-4 w-4 ${
                        discussion.upvotes.includes(user?.id || '') ? 'text-green-600' : ''
                      }`}
                    />

                  </button>
                  <span className="text-sm text-gray-600">
                    {discussion.upvotes.length - discussion.downvotes.length}
                  </span>
                  <button
                    onClick={() => handleVote(discussion._id, 'down')}
                    disabled={!user}
                    className="p-1 hover:bg-gray-100 rounded-full"
                  >
                    <ThumbsDown
                      className={`h-4 w-4 ${
                        discussion.downvotes.includes(user?.id || '') ? 'text-red-600' : ''
                      }`}
                    />

                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredDiscussions.length === 0 && (
          <div className="text-center py-12 text-gray-600">
            <MessageSquare className="mx-auto h-10 w-10 mb-2" />
            <p>No discussions found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Discussion;
