import React, { useState, useEffect } from 'react';
import { Trophy, Search, Medal, TrendingUp, Users, ArrowUpDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface ContestLeaderboardUser {
  _id: string;
  username: string;
  avatar?: string;
  ratings: {
    contestRating: number;
  };
  stats: {
    contestsWon: number;
    contestsLost: number;
    contestsTied: number;
    contestsPlayed: number;
  };
  latestForm: string[];
  position?: number;
}

interface LeaderboardResponse {
  users: ContestLeaderboardUser[];
  totalUsers: number;
  totalPages: number;
  currentPage: number;
  currentUserRank?: {
    rank: number;
    percentile: number;
  };
}

const ContestLeaderboard: React.FC = () => {
  const { isDark } = useTheme();
  const [users, setUsers] = useState<ContestLeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'contestRating' | 'contestsWon' | 'username'>('contestRating');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchContestLeaderboard();
  }, []);

  const fetchContestLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/users/contest-leaderboard`, {
        params: { all: 'true' } // Request all users instead of pagination
      });
      
      // Add position/rank to each user
      const usersWithPosition = response.data.users.map((user: ContestLeaderboardUser, index: number) => ({
        ...user,
        position: index + 1
      }));
      
      setUsers(usersWithPosition);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch contest leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'W': return <span className="text-green-600 dark:text-green-400 font-bold">W</span>;
      case 'L': return <span className="text-red-600 dark:text-red-400 font-bold">L</span>;
      case 'D': return <span className="text-gray-500 dark:text-gray-400 font-bold">D</span>;
      default: return <span className="text-gray-400 dark:text-gray-500">-</span>;
    }
  };

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1: return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2: return <Medal className="w-6 h-6 text-gray-400" />;
      case 3: return <Medal className="w-6 h-6 text-amber-600" />;
      default: return <span className={`font-bold text-lg ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>#{position}</span>;
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'contestRating':
        aValue = a.ratings?.contestRating || 0;
        bValue = b.ratings?.contestRating || 0;
        break;
      case 'contestsWon':
        aValue = a.stats?.contestsWon || 0;
        bValue = b.stats?.contestsWon || 0;
        break;
      case 'username':
        aValue = a.username.toLowerCase();
        bValue = b.username.toLowerCase();
        break;
      default:
        return 0;
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className={`${isDark ? 'text-red-400' : 'text-red-600'} text-xl`}>{error}</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} py-8`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Trophy className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Contest Leaderboard
            </h1>
          </div>
          <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Compete in contests and climb the rankings
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Contestants</p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{users.length}</p>
              </div>
            </div>
          </div>
          
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Avg Rating</p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {users.length > 0 ? Math.round(users.reduce((sum, user) => sum + user.ratings.contestRating, 0) / users.length) : 0}
                </p>
              </div>
            </div>
          </div>
          
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center">
              <Trophy className="w-8 h-8 text-yellow-600 mr-3" />
              <div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Top Rating</p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {users.length > 0 ? Math.max(...users.map(user => user.ratings.contestRating)) : 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} mb-8`}>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search contestants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => handleSort('contestRating')}
                className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${
                  sortBy === 'contestRating'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : `${isDark ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-white text-gray-700 border-gray-300'} hover:bg-blue-50 dark:hover:bg-gray-600`
                }`}
              >
                Rating <ArrowUpDown className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => handleSort('contestsWon')}
                className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${
                  sortBy === 'contestsWon'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : `${isDark ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-white text-gray-700 border-gray-300'} hover:bg-blue-50 dark:hover:bg-gray-600`
                }`}
              >
                Wins <ArrowUpDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <tr>
                  <th className={`px-6 py-4 text-left text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                    Rank
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                    Contestant
                  </th>
                  <th className={`px-4 py-4 text-center text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                    Rating
                  </th>
                  <th className={`px-4 py-4 text-center text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                    Wins
                  </th>
                  <th className={`px-4 py-4 text-center text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                    Losses
                  </th>
                  <th className={`px-4 py-4 text-center text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                    Draws
                  </th>
                  <th className={`px-4 py-4 text-center text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                    Recent Form
                  </th>
                </tr>
              </thead>
              <tbody className={`${isDark ? 'bg-gray-800' : 'bg-white'} divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {sortedUsers.map((user: ContestLeaderboardUser) => (
                  <tr 
                    key={user._id} 
                    className={`${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors duration-200`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getRankIcon(user.position || 0)}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-full ${isDark ? 'bg-blue-600' : 'bg-blue-500'} flex items-center justify-center text-white font-bold mr-3`}>
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {user.username}
                          </div>
                          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {user.stats.contestsPlayed || 0} contests played
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        user.ratings.contestRating >= 1500 
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : user.ratings.contestRating >= 1200
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}>
                        {user.ratings.contestRating}
                      </span>
                    </td>
                    
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        {user.stats.contestsWon}
                      </span>
                    </td>
                    
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        {user.stats.contestsLost}
                      </span>
                    </td>
                    
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className={`${isDark ? 'text-gray-400' : 'text-gray-600'} font-medium`}>
                        {user.stats.contestsTied}
                      </span>
                    </td>
                    
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1">
                        {user.latestForm.map((result: string, index: number) => (
                          <div
                            key={index}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              result === 'W' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : result === 'L'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : result === 'D'
                                ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                : 'bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                            }`}
                          >
                            {getResultIcon(result)}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Show total users count */}
          <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} px-6 py-4 border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
            <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} text-center`}>
              Showing all {sortedUsers.length} users
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContestLeaderboard;
