import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Medal, Award, Users, ArrowLeft, ChevronLeft, ChevronRight, Gamepad2, Search, ChevronsLeft, ChevronsRight, Code } from 'lucide-react';
import axios from 'axios';
import { useTheme } from '../contexts/ThemeContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface LeaderboardEntry {
  _id: string;
  username: string;
  avatar?: string;
  ratings: {
    gameRating: number;
  };
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    gamesLost?: number;
    gamesTied?: number;
  };
  rank?: number;
  percentile?: number;
  latestForm?: Array<'W' | 'L' | 'D' | '-'>;
}

const GameLeaderboard: React.FC = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [userRank, setUserRank] = useState<{rank: number, percentile: number} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [allUsers, setAllUsers] = useState<LeaderboardEntry[]>([]);

  const entriesPerPage = 10;

  useEffect(() => {
    fetchLeaderboard();
  }, [currentPage]);

  useEffect(() => {
    if (searchTerm) {
      fetchAllUsers();
    }
  }, [searchTerm]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${API_URL}/users/game-leaderboard`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params: {
          page: currentPage,
          limit: entriesPerPage
        }
      });

      // Process users to ensure latestForm is properly formatted
      const processedUsers = response.data.users.map((user: any) => ({
        ...user,
        latestForm: user.latestForm || Array(5).fill('-') // Ensure latestForm exists
      }));

      setLeaderboard(processedUsers);
      setTotalPages(Math.ceil(response.data.totalUsers / entriesPerPage));
      setUserRank(response.data.currentUserRank);
    } catch (error) {
      console.error('Failed to fetch game leaderboard:', error);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/users/game-leaderboard`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params: {
          page: 1,
          limit: 1000 // Get all users for search
        }
      });
      
      // Process users to ensure latestForm is properly formatted
      const processedUsers = response.data.users.map((user: any) => ({
        ...user,
        latestForm: user.latestForm || Array(5).fill('-') // Ensure latestForm exists
      }));
      
      setAllUsers(processedUsers);
    } catch (error) {
      console.error('Failed to fetch all users:', error);
    }
  };

  // Filter users based on search term
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return leaderboard;
    return allUsers.filter(user => 
      user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, leaderboard, allUsers]);

  // Calculate pagination for filtered results
  const paginatedFilteredUsers = useMemo(() => {
    if (!searchTerm) return filteredUsers;
    const startIndex = (currentPage - 1) * entriesPerPage;
    return filteredUsers.slice(startIndex, startIndex + entriesPerPage);
  }, [filteredUsers, currentPage, searchTerm]);

  const displayUsers = searchTerm ? paginatedFilteredUsers : leaderboard;
  const displayTotalPages = searchTerm ? Math.ceil(filteredUsers.length / entriesPerPage) : totalPages;

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Award className="h-6 w-6 text-orange-600" />;
    return <span className="text-lg font-bold text-gray-600 dark:text-gray-400">#{rank}</span>;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white";
    if (rank === 2) return "bg-gradient-to-r from-gray-300 to-gray-500 text-white";
    if (rank === 3) return "bg-gradient-to-r from-orange-400 to-orange-600 text-white";
    return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300";
  };
  
  const getFormColors = (result: 'W' | 'L' | 'D' | '-') => {
    switch(result) {
      case 'W':
        return isDark ? 'bg-green-700 text-green-100' : 'bg-green-500 text-white';
      case 'L':
        return isDark ? 'bg-red-700 text-red-100' : 'bg-red-500 text-white';
      case 'D':
        return isDark ? 'bg-gray-600 text-gray-200' : 'bg-gray-400 text-white';
      case '-':
      default:
        return isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-500';
    }
  };

  const renderFormDisplay = (latestForm: Array<'W' | 'L' | 'D' | '-'> = []) => {
    // Ensure we always have 5 results to display
    const displayForm = [...(latestForm || [])];
    while (displayForm.length < 5) {
      displayForm.push('-');
    }
    
    return (
      <div className="flex space-x-1">
        {displayForm.slice(0, 5).map((result, idx) => (
          <div 
            key={idx} 
            className={`w-6 h-6 flex items-center justify-center rounded-sm ${getFormColors(result)}`}
            title={result === 'W' ? 'Win' : result === 'L' ? 'Loss' : result === 'D' ? 'Draw' : 'No match'}
          >
            {result}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            <span className="ml-4 text-lg text-gray-600 dark:text-gray-400">Loading leaderboard...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-lg text-red-600 dark:text-red-400 mb-4">{error}</p>
              <button 
                onClick={fetchLeaderboard}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
          <div className="flex items-center mb-4 sm:mb-0">
            <button
              onClick={() => navigate('/game')}
              className="mr-4 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-all duration-200"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Coding Battle Leaderboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Top performers in 1v1 coding battles
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <Users className="h-4 w-4" />
            <span>Page {currentPage} of {displayTotalPages}</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by username..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset to first page when searching
              }}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent shadow-sm"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            )}
          </div>
          {searchTerm && (
            <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">
              Found {filteredUsers.length} users matching "{searchTerm}"
            </p>
          )}
        </div>

        {/* Current User Rank */}
        {userRank && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Your Ranking</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  #{userRank.rank}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  You beat {userRank.percentile.toFixed(1)}% of all users!
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border-2 border-transparent bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 dark:from-yellow-500 dark:via-yellow-600 dark:to-yellow-700 p-[2px]">
          <div className="bg-white dark:bg-gray-800 rounded-[10px] overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white">
              <h2 className="text-xl font-bold flex items-center">
                <Code className="h-6 w-6 mr-2" />
                Rankings
              </h2>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {displayUsers.map((user, index) => {
                const globalRank = searchTerm 
                  ? allUsers.findIndex(u => u._id === user._id) + 1
                  : (currentPage - 1) * entriesPerPage + index + 1;
                return (
                  <div 
                    key={user._id} 
                    className="p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 border-l-4 border-transparent hover:border-l-green-500 dark:hover:border-l-green-400 relative overflow-hidden group"
                  >
                    {/* Card shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                    
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getRankBadge(globalRank)} shadow-lg`}>
                          {globalRank <= 3 ? getRankIcon(globalRank) : <span className="font-bold">#{globalRank}</span>}
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          {user.avatar ? (
                            <img 
                              src={user.avatar} 
                              alt={user.username}
                              className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-600"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center ring-2 ring-gray-200 dark:ring-gray-600">
                              <span className="text-sm font-bold text-white">
                                {user.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {user.username}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {user.stats.gamesPlayed} battles • {user.stats.gamesWon} wins
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-xl font-bold text-green-600 dark:text-green-400">
                          {user.ratings.gameRating}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Rating
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pagination */}
        {displayTotalPages > 1 && (
          <div className="flex items-center justify-center space-x-2 mt-8">
            {/* Go to first page */}
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
              title="Go to first page"
            >
              <ChevronsLeft className="h-5 w-5 text-gray-600 dark:text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400" />
            </button>

            {/* Previous page */}
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
              title="Previous page"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400" />
            </button>
            
            {/* Page numbers */}
            {(() => {
              const pages = [];
              const maxVisiblePages = 5;
              let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
              let endPage = Math.min(displayTotalPages, startPage + maxVisiblePages - 1);
              
              // Adjust start page if we're near the end
              if (endPage - startPage < maxVisiblePages - 1) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
              }
              
              // Add empty slots at the beginning if needed
              for (let i = 1; i < startPage; i++) {
                pages.push(
                  <div key={`empty-${i}`} className="px-4 py-2 w-12 h-10"></div>
                );
              }
              
              // Add actual page numbers
              for (let i = startPage; i <= endPage; i++) {
                pages.push(
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
                      currentPage === i
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg transform scale-105'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 shadow-md hover:shadow-lg hover:bg-green-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {i}
                  </button>
                );
              }
              
              // Add empty slots at the end if needed
              for (let i = endPage + 1; i <= Math.min(displayTotalPages, startPage + maxVisiblePages - 1); i++) {
                pages.push(
                  <div key={`empty-end-${i}`} className="px-4 py-2 w-12 h-10"></div>
                );
              }
              
              return pages;
            })()}

            {/* Next page */}
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, displayTotalPages))}
              disabled={currentPage === displayTotalPages}
              className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
              title="Next page"
            >
              <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400" />
            </button>

            {/* Go to last page */}
            <button
              onClick={() => setCurrentPage(displayTotalPages)}
              disabled={currentPage === displayTotalPages}
              className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
              title="Go to last page"
            >
              <ChevronsRight className="h-5 w-5 text-gray-600 dark:text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameLeaderboard;
