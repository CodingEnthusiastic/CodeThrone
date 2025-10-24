import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Medal, Award, Users, ArrowLeft, ChevronLeft, ChevronRight, Search, ChevronsLeft, ChevronsRight } from 'lucide-react';
import axios from 'axios';
import { useTheme } from '../contexts/ThemeContext';
import { showError } from '../utils/toast';

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
    gamesLost: number;
    gamesTied: number;
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
  const [userRank, setUserRank] = useState<{rank: number, percentile: number, _id?: string, rating?: number, gamesPlayed?: number} | null>(null);
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
      
      const response = await axios.get(`${API_URL}/users/game/leaderboard`, {
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
      showError('Failed to fetch game leaderboard');
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/users/game/leaderboard`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params: {
          page: 1,
          limit: 1000
        }
      });
      
      // Process users to ensure latestForm is properly formatted
      const processedUsers = response.data.users.map((user: any) => ({
        ...user,
        latestForm: user.latestForm || Array(5).fill('-') // Ensure latestForm exists
      }));
      
      setAllUsers(processedUsers);
    } catch (error) {
      showError('Failed to fetch all users');
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

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-100'} p-4 sm:p-6 lg:p-8`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-lg text-gray-600 dark:text-gray-400">Loading leaderboard...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-100'} p-4 sm:p-6 lg:p-8`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-lg text-red-600 dark:text-red-400 mb-4">{error}</p>
              <button 
                onClick={fetchLeaderboard}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div className="mb-4 md:mb-0">
            <div className="flex items-center mb-2">
              <button
                onClick={() => navigate('/game')}
                className={`mr-3 p-2 rounded-md ${isDark ? 'bg-gray-800 text-gray-400 hover:text-white' : 'bg-white text-gray-600 hover:text-gray-900'} shadow-sm`}
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className={`text-2xl md:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Game Leaderboard
              </h1>
            </div>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Top performers in coding battles
            </p>
          </div>
          
          <div className="flex items-center">
            <div className={`rounded-md px-3 py-2 ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-700'} shadow-sm mr-2`}>
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-2" />
                <span className="text-sm">Page {currentPage} of {displayTotalPages}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="max-w-md w-full relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className={`h-5 w-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            </div>
            <input
              type="text"
              placeholder="Search by username..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full pl-10 pr-10 py-2 rounded-lg border ${
                isDark 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
              } shadow-sm`}
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className={`absolute inset-y-0 right-0 flex items-center pr-3 ${
                  isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                }`}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
          {searchTerm && (
            <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Found {filteredUsers.length} users matching "{searchTerm}"
            </p>
          )}
        </div>

        {/* Current User Rank */}
        {userRank && (
          <div className={`mb-6 rounded-lg overflow-hidden border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-md`}>
            <div className={`px-4 py-3 ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
              <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Your Ranking</h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Rank</div>
                  <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>#{userRank.rank}</div>
                </div>
                <div>
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Percentile</div>
                  <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{userRank.percentile.toFixed(1)}%</div>
                </div>
                <div>
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Rating</div>
                  <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{userRank.rating || 1200}</div>
                </div>
                <div>
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Games</div>
                  <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{userRank.gamesPlayed || 0}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className={`rounded-lg overflow-hidden border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-md`}>
          <div className={`px-6 py-3 ${isDark ? 'bg-gradient-to-r from-blue-900 to-indigo-900 text-white' : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'}`}>
            <h2 className="text-lg font-semibold flex items-center">
              <Trophy className="h-5 w-5 mr-2" />
              Rankings
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`uppercase text-xs ${isDark ? 'bg-gray-900 text-gray-400' : 'bg-gray-50 text-gray-700'}`}>
                <tr>
                  <th className="px-4 py-3 text-left">Rank</th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-center">Games</th>
                  <th className="px-4 py-3 text-center">W</th>
                  {/* <th className="px-4 py-3 text-center">L</th> */}
                  <th className="px-4 py-3 text-center">D</th>
                  {/* Removed Latest Form column */}
                  <th className="px-4 py-3 text-right">Rating</th>
                </tr>
              </thead>
              <tbody className={`${isDark ? 'divide-y divide-gray-700' : 'divide-y divide-gray-200'}`}>
                {displayUsers.map((user, index) => {
                  const globalRank = searchTerm 
                    ? allUsers.findIndex(u => u._id === user._id) + 1
                    : (currentPage - 1) * entriesPerPage + index + 1;
                  
                  return (
                    <tr 
                      key={user._id} 
                      className={`${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`font-semibold ${
                            globalRank === 1 ? 'text-yellow-500' :
                            globalRank === 2 ? 'text-gray-400' :
                            globalRank === 3 ? 'text-amber-700' :
                            isDark ? 'text-gray-300' : 'text-gray-700'
                          }`}>{globalRank}</span>
                          {globalRank <= 3 && 
                            <span className="ml-2">{getRankIcon(globalRank)}</span>
                          }
                        </div>
                      </td>
                      
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 mr-3">
                            {user.avatar ? (
                              <img
                                src={user.avatar}
                                alt={user.username}
                                className="h-10 w-10 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center border-2 border-gray-200 dark:border-gray-700">
                                <span className="font-bold text-white">
                                  {user.username.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div>
                            <div className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {user.username}
                            </div>
                            <div className="text-xs text-gray-500">
                              {userRank && user._id === userRank._id && (
                                <span className="text-blue-500 font-medium">You</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          {user.stats.gamesPlayed}
                        </span>
                      </td>
                      
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          {user.stats.gamesWon}
                        </span>
                      </td>
                      
                      {/* <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          {user.stats.gamesLost}
                        </span>
                      </td> */}
                      
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`${isDark ? 'text-gray-400' : 'text-gray-600'} font-medium`}>
                          {user.stats.gamesTied}
                        </span>
                      </td>
                      
                      {/* Removed Latest Form UI */}
                      
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className={`font-bold ${
                          isDark ? 'text-blue-400' : 'text-blue-600'
                        }`}>
                          {user.ratings.gameRating}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Pagination */}
        {displayTotalPages > 1 && (
          <div className="flex justify-between items-center mt-6">
            <div className="flex space-x-2">
              <button 
                onClick={() => setCurrentPage(1)} 
                disabled={currentPage === 1} 
                className={`p-2 rounded-md ${
                  currentPage === 1 
                    ? 'opacity-50 cursor-not-allowed' 
                    : isDark 
                      ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                      : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300'
                }`}
                aria-label="First page"
              >
                <ChevronsLeft size={16} />
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                disabled={currentPage === 1} 
                className={`p-2 rounded-md ${
                  currentPage === 1 
                    ? 'opacity-50 cursor-not-allowed' 
                    : isDark 
                      ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                      : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300'
                }`}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
            </div>
            
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Page {currentPage} of {displayTotalPages}
            </div>
            
            <div className="flex space-x-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, displayTotalPages))} 
                disabled={currentPage === displayTotalPages} 
                className={`p-2 rounded-md ${
                  currentPage === displayTotalPages 
                    ? 'opacity-50 cursor-not-allowed' 
                    : isDark 
                      ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                      : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300'
                }`}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
              <button 
                onClick={() => setCurrentPage(displayTotalPages)} 
                disabled={currentPage === displayTotalPages} 
                className={`p-2 rounded-md ${
                  currentPage === displayTotalPages 
                    ? 'opacity-50 cursor-not-allowed' 
                    : isDark 
                      ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                      : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300'
                }`}
                aria-label="Last page"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameLeaderboard;
