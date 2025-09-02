import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Medal, Award, Users, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface LeaderboardEntry {
  _id: string;
  username: string;
  avatar?: string;
  ratings: {
    contestRating: number;
  };
  stats: {
    contestsParticipated: number;
    contestsWon: number;
  };
  rank?: number;
  percentile?: number;
}

const ContestLeaderboard: React.FC = () => {
  // Log leaderboard data before rendering (after state declarations)
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [userRank, setUserRank] = useState<{rank: number, percentile: number} | null>(null);
  const [error, setError] = useState<string | null>(null);

  const entriesPerPage = 10;

  useEffect(() => {
    fetchLeaderboard();
  }, [currentPage]);

  const fetchLeaderboard = async () => {
    try {
      console.log('[Leaderboard] Fetching leaderboard...');
      setLoading(true);
      const token = localStorage.getItem('token');
      console.log('[Leaderboard] Token:', token);
      console.log('[Leaderboard] API URL:', `${API_URL}/users/contest-leaderboard`);
      console.log('[Leaderboard] Params:', { page: currentPage, limit: entriesPerPage });
      const response = await axios.get(`${API_URL}/users/contest-leaderboard`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params: {
          page: currentPage,
          limit: entriesPerPage
        }
      });
      console.log('[Leaderboard] Raw response:', response);
      console.log('[Leaderboard] Response data:', response.data);
      setLeaderboard(response.data.users);
      setTotalPages(Math.ceil(response.data.totalUsers / entriesPerPage));
      setUserRank(response.data.currentUserRank);
      console.log('[Leaderboard] Leaderboard set:', response.data.users);
      console.log('[Leaderboard] Total pages:', Math.ceil(response.data.totalUsers / entriesPerPage));
      console.log('[Leaderboard] User rank:', response.data.currentUserRank);
    } catch (error) {
      console.error('[Leaderboard] Failed to fetch contest leaderboard:', error);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
      console.log('[Leaderboard] Loading finished');
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
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
  <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
          <div className="flex items-center mb-4 sm:mb-0">
            <button
              onClick={() => navigate('/contest')}
              className="mr-4 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-all duration-200"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Contest Leaderboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Top performers in competitive programming
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <Users className="h-4 w-4" />
            <span>Page {currentPage} of {totalPages}</span>
          </div>
        </div>

        {/* Current User Rank */}
        {userRank && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Your Ranking</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <h2 className="text-xl font-bold">Rankings</h2>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {leaderboard.map((user, index) => {
              const globalRank = (currentPage - 1) * entriesPerPage + index + 1;
              return (
                <div key={user._id} className="p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getRankBadge(globalRank)}`}>
                        {globalRank <= 3 ? getRankIcon(globalRank) : <span className="font-bold">#{globalRank}</span>}
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {user.avatar ? (
                          <img 
                            src={user.avatar} 
                            alt={user.username}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {user.username}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {user.stats.contestsParticipated} contests • {user.stats.contestsWon} wins
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        {user.ratings.contestRating}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center space-x-2 mt-8">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(currentPage - 2 + i, totalPages - 4 + i));
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 shadow-md hover:shadow-lg'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContestLeaderboard;
