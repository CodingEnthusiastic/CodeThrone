import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import axios from 'axios';
import { API_URL, SOCKET_URL } from "../config/api";
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
  const { isDark } = useTheme();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [discussionVoteLoading, setDiscussionVoteLoading] = useState<string | null>(null); // discussionId being voted
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
        `${API_URL}/discussion?${params}`
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
      const response = await axios.post(`${API_URL}/discussion`, {
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
    setDiscussionVoteLoading(discussionId);
    try {
      await axios.post(
        `${API_URL}/discussion/${discussionId}/vote`,
        { type: voteType },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      // Refresh discussions after voting
      await fetchDiscussions();
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setDiscussionVoteLoading(null);
    }
  };

  const filteredDiscussions = discussions.filter(
    (discussion) =>
      (discussion.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
     discussion.content.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (selectedUser ? discussion.author.username === selectedUser : true)
  );

  const hasUserVoted = (votes: string[], userId: string) => {
    return votes.some(voteId => voteId.toString() === userId);
  };

  const allTags = [...new Set(discussions.flatMap((d) => d.tags))];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 relative ${
      isDark
        ? "bg-gradient-to-br from-[#181824] via-[#23243a] to-[#181824]"
        : "bg-gradient-to-br from-[#f0f4ff] via-[#eaf0fa] to-[#f7faff]"
    }`}>
      {/* Galaxy Stars Animation for Dark Mode */}
      {isDark && (
        <>
          <style>{`
            @keyframes galaxy-drift {
              0%, 100% {
                transform: translateX(0px) translateY(0px) rotate(0deg);
                opacity: 0.8;
              }
              25% {
                transform: translateX(30px) translateY(-20px) rotate(90deg);
                opacity: 1;
              }
              50% {
                transform: translateX(-15px) translateY(25px) rotate(180deg);
                opacity: 0.6;
              }
              75% {
                transform: translateX(40px) translateY(10px) rotate(270deg);
                opacity: 0.9;
              }
            }
            @keyframes stellar-twinkle {
              0%, 100% { opacity: 0.3; transform: scale(0.8) rotate(0deg); }
              25% { opacity: 0.8; transform: scale(1.2) rotate(90deg); }
              50% { opacity: 1; transform: scale(1) rotate(180deg); }
              75% { opacity: 0.5; transform: scale(1.1) rotate(270deg); }
            }
            @keyframes cosmic-float {
              0% { transform: translateY(100vh) translateX(0px) rotate(0deg); opacity: 0; }
              10% { opacity: 0.6; }
              90% { opacity: 0.6; }
              100% { transform: translateY(-100px) translateX(50px) rotate(360deg); opacity: 0; }
            }
            @keyframes nebula-pulse {
              0%, 100% { 
                transform: scale(1) rotate(0deg);
                opacity: 0.1;
              }
              50% { 
                transform: scale(1.1) rotate(180deg);
                opacity: 0.3;
              }
            }
            .galaxy-drift {
              animation: galaxy-drift 8s ease-in-out infinite;
            }
            .stellar-twinkle {
              animation: stellar-twinkle 3s ease-in-out infinite;
            }
            .cosmic-float {
              animation: cosmic-float 12s linear infinite;
            }
            .nebula-pulse {
              animation: nebula-pulse 15s ease-in-out infinite;
            }
          `}</style>
          
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {/* Nebula backgrounds */}
            <div className="absolute top-1/4 left-1/6 w-96 h-96 bg-gradient-to-br from-purple-900/20 to-blue-900/20 nebula-pulse rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 right-1/6 w-80 h-80 bg-gradient-to-br from-indigo-900/20 to-violet-900/20 nebula-pulse rounded-full blur-3xl" style={{ animationDelay: '7s' }}></div>
            <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-br from-cyan-900/15 to-teal-900/15 nebula-pulse rounded-full blur-2xl" style={{ animationDelay: '3s' }}></div>
            
            {/* Galaxy stars */}
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={`galaxy-star-${i}`}
                className={`stellar-twinkle absolute ${
                  i % 8 === 0 ? 'w-1 h-1 bg-blue-300' :
                  i % 8 === 1 ? 'w-0.5 h-0.5 bg-purple-300' :
                  i % 8 === 2 ? 'w-1.5 h-1.5 bg-cyan-300' :
                  i % 8 === 3 ? 'w-0.5 h-0.5 bg-white' :
                  i % 8 === 4 ? 'w-1 h-1 bg-indigo-300' :
                  i % 8 === 5 ? 'w-0.5 h-0.5 bg-violet-300' :
                  i % 8 === 6 ? 'w-1 h-1 bg-teal-300' : 'w-0.5 h-0.5 bg-pink-300'
                } rounded-full`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${3 + Math.random() * 2}s`,
                }}
              />
            ))}
            
            {/* Cosmic shooting stars */}
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={`cosmic-star-${i}`}
                className={`cosmic-float absolute w-2 h-2 ${
                  i % 4 === 0 ? 'bg-gradient-to-r from-blue-400 to-cyan-400' :
                  i % 4 === 1 ? 'bg-gradient-to-r from-purple-400 to-pink-400' :
                  i % 4 === 2 ? 'bg-gradient-to-r from-indigo-400 to-blue-400' :
                  'bg-gradient-to-r from-violet-400 to-purple-400'
                } rounded-full blur-sm`}
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 12}s`,
                  animationDuration: `${12 + Math.random() * 8}s`,
                }}
              />
            ))}

            {/* Floating galaxy particles */}
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={`galaxy-particle-${i}`}
                className={`galaxy-drift absolute ${
                  i % 5 === 0 ? 'w-3 h-3 bg-blue-500/30' :
                  i % 5 === 1 ? 'w-2 h-2 bg-purple-500/30' :
                  i % 5 === 2 ? 'w-2.5 h-2.5 bg-cyan-500/30' :
                  i % 5 === 3 ? 'w-2 h-2 bg-indigo-500/30' :
                  'w-3 h-3 bg-violet-500/30'
                } rounded-full blur-sm`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDuration: `${8 + Math.random() * 4}s`,
                  animationDelay: `${Math.random() * 8}s`,
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* Light Mode Celestial Animation */}
      {!isDark && (
        <>
          <style>{`
            @keyframes light-constellation {
              0%, 100% {
                transform: translateY(0px) translateX(0px) rotate(0deg);
                opacity: 0.4;
              }
              25% {
                transform: translateY(-10px) translateX(15px) rotate(90deg);
                opacity: 0.7;
              }
              50% {
                transform: translateY(5px) translateX(-8px) rotate(180deg);
                opacity: 0.9;
              }
              75% {
                transform: translateY(-20px) translateX(20px) rotate(270deg);
                opacity: 0.5;
              }
            }
            @keyframes light-sparkle-dance {
              0%, 100% { opacity: 0.2; transform: scale(0.8) rotate(0deg); }
              50% { opacity: 0.8; transform: scale(1.3) rotate(180deg); }
            }
            @keyframes light-stardust {
              0% { transform: translateY(100px) translateX(0px) rotate(0deg); opacity: 0; }
              10% { opacity: 0.5; }
              90% { opacity: 0.5; }
              100% { transform: translateY(-100px) translateX(40px) rotate(360deg); opacity: 0; }
            }
            @keyframes aurora-glow {
              0%, 100% { 
                background: linear-gradient(45deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1));
                transform: scale(1) rotate(0deg);
              }
              33% { 
                background: linear-gradient(45deg, rgba(236, 72, 153, 0.1), rgba(59, 130, 246, 0.1));
                transform: scale(1.1) rotate(120deg);
              }
              66% { 
                background: linear-gradient(45deg, rgba(34, 197, 94, 0.1), rgba(236, 72, 153, 0.1));
                transform: scale(0.9) rotate(240deg);
              }
            }
            .light-constellation {
              animation: light-constellation 7s ease-in-out infinite;
            }
            .light-sparkle-dance {
              animation: light-sparkle-dance 2.8s ease-in-out infinite;
            }
            .light-stardust {
              animation: light-stardust 9s linear infinite;
            }
            .aurora-glow {
              animation: aurora-glow 12s ease-in-out infinite;
            }
          `}</style>
          
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {/* Aurora backgrounds */}
            <div className="absolute top-1/5 left-1/4 w-80 h-80 aurora-glow rounded-full blur-3xl opacity-40"></div>
            <div className="absolute bottom-1/4 right-1/3 w-96 h-96 aurora-glow rounded-full blur-3xl opacity-30" style={{ animationDelay: '4s' }}></div>
            <div className="absolute top-2/3 left-1/6 w-64 h-64 aurora-glow rounded-full blur-2xl opacity-35" style={{ animationDelay: '8s' }}></div>
            
            {/* Constellation stars */}
            {Array.from({ length: 35 }).map((_, i) => (
              <div
                key={`constellation-${i}`}
                className={`light-sparkle-dance absolute ${
                  i % 7 === 0 ? 'w-1.5 h-1.5 bg-blue-400/60' :
                  i % 7 === 1 ? 'w-1 h-1 bg-purple-400/60' :
                  i % 7 === 2 ? 'w-1.5 h-1.5 bg-pink-400/60' :
                  i % 7 === 3 ? 'w-1 h-1 bg-indigo-400/60' :
                  i % 7 === 4 ? 'w-1.5 h-1.5 bg-cyan-400/60' :
                  i % 7 === 5 ? 'w-1 h-1 bg-violet-400/60' : 'w-1.5 h-1.5 bg-teal-400/60'
                } rounded-full`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2.8}s`,
                  animationDuration: `${2.8 + Math.random() * 1.5}s`,
                }}
              />
            ))}
            
            {/* Stardust particles */}
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={`stardust-${i}`}
                className={`light-stardust absolute w-1 h-1 ${
                  i % 5 === 0 ? 'bg-blue-300/50' :
                  i % 5 === 1 ? 'bg-purple-300/50' :
                  i % 5 === 2 ? 'bg-pink-300/50' :
                  i % 5 === 3 ? 'bg-cyan-300/50' : 'bg-indigo-300/50'
                } rounded-full`}
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 9}s`,
                  animationDuration: `${9 + Math.random() * 4}s`,
                }}
              />
            ))}

            {/* Floating constellation elements */}
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={`light-float-${i}`}
                className={`light-constellation absolute ${
                  i % 4 === 0 ? 'w-3 h-3 bg-gradient-to-br from-blue-200/40 to-purple-200/40' :
                  i % 4 === 1 ? 'w-2.5 h-2.5 bg-gradient-to-br from-pink-200/40 to-cyan-200/40' :
                  i % 4 === 2 ? 'w-3 h-3 bg-gradient-to-br from-indigo-200/40 to-violet-200/40' :
                  'w-2.5 h-2.5 bg-gradient-to-br from-teal-200/40 to-blue-200/40'
                } rounded-full blur-sm`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDuration: `${7 + Math.random() * 3}s`,
                  animationDelay: `${Math.random() * 7}s`,
                }}
              />
            ))}
          </div>
        </>
      )}
      
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-3xl font-bold mb-1 ${
              isDark ? "text-[#e0e7ff] drop-shadow-lg" : "text-[#1e293b]"
            }`}>Discussion Forum</h1>
            <p className={`${isDark ? "text-[#a5b4fc]" : "text-[#64748b]"}`}>Ask questions, share knowledge, and connect with the community</p>
          </div>
          {user && (
            <button
              onClick={() => setShowCreateForm(true)}
              className={`flex items-center px-4 py-2 rounded-md font-semibold shadow-md transition-all duration-200 ${
                isDark
                  ? "bg-gradient-to-r from-[#6366f1] to-[#818cf8] text-white hover:from-[#818cf8] hover:to-[#6366f1]"
                  : "bg-gradient-to-r from-[#38bdf8] to-[#6366f1] text-white hover:from-[#6366f1] hover:to-[#38bdf8]"
              }`}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Discussion
            </button>
          )}
        </div>

        {showCreateForm && (
          <div className={`rounded-lg shadow-lg p-6 mb-6 ${
            isDark
              ? "bg-gradient-to-br from-[#23243a] to-[#181824] border border-[#6366f1]/30"
              : "bg-gradient-to-br from-[#eaf0fa] to-[#f7faff] border border-[#38bdf8]/20"
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${
              isDark ? "text-[#e0e7ff]" : "text-[#1e293b]"
            }`}>Create New Discussion</h3>
            <form onSubmit={handleCreateDiscussion}>
              <input
                type="text"
                required
                placeholder="Title"
                className={`w-full mb-3 px-3 py-2 rounded-md border ${
                  isDark
                    ? "bg-[#23243a] text-[#e0e7ff] border-[#6366f1]/30 placeholder-[#a5b4fc]"
                    : "bg-white text-[#1e293b] border-[#38bdf8]/20 placeholder-[#64748b]"
                }`}
                value={newDiscussion.title}
                onChange={(e) => setNewDiscussion({ ...newDiscussion, title: e.target.value })}
              />
              <textarea
                rows={5}
                required
                placeholder="Content"
                className={`w-full mb-3 px-3 py-2 rounded-md border ${
                  isDark
                    ? "bg-[#23243a] text-[#e0e7ff] border-[#6366f1]/30 placeholder-[#a5b4fc]"
                    : "bg-white text-[#1e293b] border-[#38bdf8]/20 placeholder-[#64748b]"
                }`}
                value={newDiscussion.content}
                onChange={(e) => setNewDiscussion({ ...newDiscussion, content: e.target.value })}
              />
              <input
                type="text"
                placeholder="Tags (comma separated)"
                className={`w-full mb-3 px-3 py-2 rounded-md border ${
                  isDark
                    ? "bg-[#23243a] text-[#e0e7ff] border-[#6366f1]/30 placeholder-[#a5b4fc]"
                    : "bg-white text-[#1e293b] border-[#38bdf8]/20 placeholder-[#64748b]"
                }`}
                value={newDiscussion.tags}
                onChange={(e) => setNewDiscussion({ ...newDiscussion, tags: e.target.value })}
              />
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-md font-semibold shadow transition-all duration-200 ${
                    isDark
                      ? "bg-gradient-to-r from-[#6366f1] to-[#818cf8] text-white hover:from-[#818cf8] hover:to-[#6366f1]"
                      : "bg-gradient-to-r from-[#38bdf8] to-[#6366f1] text-white hover:from-[#6366f1] hover:to-[#38bdf8]"
                  }`}
                >
                  Submit
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className={`px-4 py-2 rounded-md border font-semibold ${
                    isDark
                      ? "border-[#6366f1]/30 text-[#a5b4fc] bg-[#23243a] hover:bg-[#181824]"
                      : "border-[#38bdf8]/20 text-[#64748b] bg-white hover:bg-[#eaf0fa]"
                  }`}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className={`rounded-lg shadow-md p-6 mb-6 grid grid-cols-1 md:grid-cols-5 gap-4 ${
          isDark
            ? "bg-gradient-to-br from-[#23243a] to-[#181824] border border-[#6366f1]/20"
            : "bg-gradient-to-br from-[#eaf0fa] to-[#f7faff] border border-[#38bdf8]/10"
        }`}>
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
              isDark ? "text-[#a5b4fc]" : "text-[#38bdf8]"
            }`} />
            <input
              type="text"
              placeholder="Search discussions..."
              className={`w-full pl-10 pr-4 py-2 rounded-md border ${
                isDark
                  ? "bg-[#23243a] text-[#e0e7ff] border-[#6366f1]/20 placeholder-[#a5b4fc]"
                  : "bg-white text-[#1e293b] border-[#38bdf8]/10 placeholder-[#64748b]"
              }`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className={`px-4 py-2 rounded-md border ${
              isDark
                ? "bg-[#23243a] text-[#e0e7ff] border-[#6366f1]/20"
                : "bg-white text-[#1e293b] border-[#38bdf8]/10"
            }`}
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
            className={`px-4 py-2 rounded-md border ${
              isDark
                ? "bg-[#23243a] text-[#e0e7ff] border-[#6366f1]/20"
                : "bg-white text-[#1e293b] border-[#38bdf8]/10"
            }`}
          >
            <option value="recent">Most Recent</option>
            <option value="popular">Most Popular</option>
          </select>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className={`px-4 py-2 rounded-md border ${
              isDark
                ? "bg-[#23243a] text-[#e0e7ff] border-[#6366f1]/20"
                : "bg-white text-[#1e293b] border-[#38bdf8]/10"
            }`}
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
            className={`px-4 py-2 rounded-md font-semibold shadow transition-all duration-200 ${
              isDark
                ? "bg-gradient-to-r from-[#ef4444] to-[#f87171] text-white hover:from-[#f87171] hover:to-[#ef4444]"
                : "bg-gradient-to-r from-[#ef4444] to-[#f87171] text-white hover:from-[#f87171] hover:to-[#ef4444]"
            }`}
          >
            Clear Filters
          </button>
        </div>

        {/* Discussions */}
        <div className="space-y-4">
          {filteredDiscussions.map((discussion) => (
            <div key={discussion._id} className={`p-6 rounded-lg shadow-lg transition-all duration-200 ${
              isDark
                ? "bg-gradient-to-br from-[#23243a] to-[#181824] border border-[#6366f1]/20"
                : "bg-gradient-to-br from-[#eaf0fa] to-[#f7faff] border border-[#38bdf8]/10"
            }`}>
              {/* Loader overlay for discussion vote */}
              {discussionVoteLoading === discussion._id && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 dark:bg-black/40 z-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}
              <div className="flex justify-between items-start relative">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    {discussion.isPinned && <Pin className="h-4 w-4 text-[#6366f1] mr-1" />}
                    {discussion.isLocked && <Lock className="h-4 w-4 text-[#ef4444] mr-1" />}
                    <Link
                      to={`/top/${discussion._id}`}
                      className={`text-lg font-semibold hover:underline ${
                        isDark ? "text-[#e0e7ff] hover:text-[#38bdf8]" : "text-[#1e293b] hover:text-[#6366f1]"
                      }`}
                    >
                      {discussion.title}
                    </Link>
                  </div>
                  <p className={`mb-3 line-clamp-3 ${
                    isDark ? "text-[#a5b4fc]" : "text-[#64748b]"
                  }`}>{discussion.content}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {discussion.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`text-xs px-2 py-1 rounded-full font-semibold shadow ${
                          isDark
                            ? "bg-gradient-to-r from-[#6366f1]/30 to-[#38bdf8]/30 text-[#e0e7ff]"
                            : "bg-gradient-to-r from-[#38bdf8]/20 to-[#6366f1]/20 text-[#1e293b]"
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className={`flex justify-between text-sm ${
                    isDark ? "text-[#a5b4fc]" : "text-[#64748b]"
                  }`}>
                    <div className="flex space-x-3">
                      <span>By {discussion.author.username}</span>
                      <span>{new Date(discussion.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MessageSquare className={`h-4 w-4 ${
                        isDark ? "text-[#38bdf8]" : "text-[#6366f1]"
                      }`} />
                      <span>{discussion.comments.length}</span>
                    </div>
                  </div>
                </div>
                <div className="ml-4 flex flex-col items-center space-y-1">
                  <button
                    onClick={() => handleVote(discussion._id, 'up')}
                    disabled={!user || discussionVoteLoading === discussion._id}
                    className={`p-1 rounded-full transition-all duration-200 shadow ${
                      !user 
                        ? isDark
                          ? 'bg-[#23243a] border border-[#6366f1]/10 cursor-not-allowed'
                          : 'bg-gray-50 border border-[#38bdf8]/10 cursor-not-allowed'
                        : user && hasUserVoted(discussion.upvotes, user.id)
                        ? 'bg-gradient-to-r from-[#22c55e] to-[#38bdf8] hover:from-[#38bdf8] hover:to-[#22c55e] shadow-lg transform hover:scale-110'
                        : isDark
                          ? 'bg-[#23243a] border border-[#22c55e]/30 hover:bg-[#181824]'
                          : 'bg-gray-50 border border-[#22c55e]/20 hover:bg-[#eaf0fa]'
                    }`}
                  >
                    <ThumbsUp
                      className={`h-4 w-4 ${
                        user && hasUserVoted(discussion.upvotes, user.id)
                          ? 'text-white'
                          : isDark ? 'text-[#22c55e]' : 'text-[#22c55e]'
                      }`}
                    />
                  </button>
                  <span className={`text-sm font-medium px-2 py-1 rounded-md min-w-[32px] text-center shadow ${
                    isDark
                      ? "bg-[#23243a] text-[#e0e7ff] border border-[#6366f1]/20"
                      : "bg-[#eaf0fa] text-[#1e293b] border border-[#38bdf8]/10"
                  }`}>
                    {discussion.upvotes.length - discussion.downvotes.length}
                  </span>
                  <button
                    onClick={() => handleVote(discussion._id, 'down')}
                    disabled={!user || discussionVoteLoading === discussion._id}
                    className={`p-1 rounded-full transition-all duration-200 shadow ${
                      !user 
                        ? isDark
                          ? 'bg-[#23243a] border border-[#6366f1]/10 cursor-not-allowed'
                          : 'bg-gray-50 border border-[#38bdf8]/10 cursor-not-allowed'
                        : user && hasUserVoted(discussion.downvotes, user.id)
                        ? 'bg-gradient-to-r from-[#ef4444] to-[#f87171] hover:from-[#f87171] hover:to-[#ef4444] shadow-lg transform hover:scale-110'
                        : isDark
                          ? 'bg-[#23243a] border border-[#ef4444]/30 hover:bg-[#181824]'
                          : 'bg-gray-50 border border-[#ef4444]/20 hover:bg-[#eaf0fa]'
                    }`}
                  >
                    <ThumbsDown
                      className={`h-4 w-4 ${
                        user && hasUserVoted(discussion.downvotes, user.id)
                          ? 'text-white'
                          : isDark ? 'text-[#ef4444]' : 'text-[#ef4444]'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredDiscussions.length === 0 && (
          <div className={`text-center py-12 ${
            isDark ? "text-[#a5b4fc]" : "text-[#64748b]"
          }`}>
            <MessageSquare className={`mx-auto h-10 w-10 mb-2 ${
              isDark ? "text-[#38bdf8]" : "text-[#6366f1]"
            }`} />
            <p>No discussions found.</p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default Discussion;
