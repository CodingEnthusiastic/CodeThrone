import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Search, Filter, CheckCircle, Star, Trophy } from 'lucide-react';
import { API_URL } from '../config/api';

interface Problem {
  _id: string;
  title: string;
  difficulty: string;
  acceptanceRate: number;
  userRating: number;
  tags: string[];
  submissions: number;
  companies: string[];
}

interface POTD {
  problem: Problem;
  date: string;
  solvedCount: number;
}

const Problems: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [solvedProblems, setSolvedProblems] = useState<Set<string>>(new Set());
  const [potd, setPotd] = useState<POTD | null>(null);
  const [hasSolvedPOTD, setHasSolvedPOTD] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState(searchParams.get('difficulty') || '');
  const [selectedTag, setSelectedTag] = useState(searchParams.get('tags') || '');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    // Set initial filters from URL params
    const difficulty = searchParams.get('difficulty');
    const tags = searchParams.get('tags');
    
    if (difficulty) setSelectedDifficulty(difficulty);
    if (tags) setSelectedTag(tags);
    
    fetchProblems();
    fetchPOTD();
    if (user) {
      fetchSolvedProblems();
      fetchPOTDStatus();
    }
  }, [currentPage, selectedDifficulty, selectedTag, user, searchParams]);

  const fetchProblems = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10' // Changed from '20' to '10'

        
      });

      if (selectedDifficulty) params.append('difficulty', selectedDifficulty);
      if (selectedTag) params.append('tags', selectedTag);

      const response = await axios.get(`${API_URL}/problems?${params}`);
      setProblems(response.data.problems);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Error fetching problems:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSolvedProblems = async () => {
    if (!user) return;
    
    try {
      const response = await axios.get(`${API_URL}/profile/${user.username}/solved`);
      const solved = new Set<string>(response.data.solvedProblems.map((p: any) => p._id as string));
      setSolvedProblems(solved);
    } catch (error) {
      console.error('Error fetching solved problems:', error);
    }
  };

  const fetchPOTD = async () => {
    try {
      const response = await axios.get(`${API_URL}/potd/today`);
      setPotd(response.data);
    } catch (error) {
      console.error('Error fetching POTD:', error);
    }
  };

  const fetchPOTDStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/potd/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setHasSolvedPOTD(response.data.hasSolvedToday);
    } catch (error) {
      console.error('Error fetching POTD status:', error);
    }
  };

  // Function to refresh POTD status and user data after solving
  const refreshAfterSolve = async () => {
    if (user) {
      await fetchPOTDStatus();
      await refreshUser(); // Refresh user data to get updated coins
      await fetchSolvedProblems(); // Refresh solved problems
    }
  };

  // Add event listener for problem solve events
  useEffect(() => {
    const handleProblemSolved = () => {
      refreshAfterSolve();
    };

    window.addEventListener('problemSolved', handleProblemSolved);
    return () => window.removeEventListener('problemSolved', handleProblemSolved);
  }, [user]);

  const filteredProblems = problems.filter(problem =>
    problem.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const allTags = [...new Set(problems.flatMap(p => p.tags))];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900 relative overflow-hidden">
        {/* Animated Background for Loading */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Light mode blinking shapes */}
          <div className="dark:hidden">
            {[...Array(20)].map((_, i) => (
              <div
                key={`light-${i}`}
                className="absolute animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${2 + Math.random() * 2}s`
                }}
              >
                <div className={`w-2 h-2 rounded-full ${
                  i % 4 === 0 ? 'bg-blue-200' :
                  i % 4 === 1 ? 'bg-green-200' :
                  i % 4 === 2 ? 'bg-purple-200' : 'bg-pink-200'
                } opacity-60`}></div>
              </div>
            ))}
          </div>
          
          {/* Dark mode moving stars */}
          <div className="hidden dark:block">
            {[...Array(50)].map((_, i) => (
              <div
                key={`dark-${i}`}
                className="absolute w-1 h-1 bg-white rounded-full opacity-70 animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random()}s`
                }}
              >
                <div className="w-full h-full bg-white rounded-full animate-ping"></div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 dark:border-blue-400 relative z-10"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Light mode blinking shapes */}
        <div className="dark:hidden">
          <style jsx>{`
            @keyframes float-blink {
              0%, 100% { opacity: 0.3; transform: translateY(0px) scale(1); }
              25% { opacity: 0.8; transform: translateY(-10px) scale(1.1); }
              50% { opacity: 0.6; transform: translateY(-20px) scale(0.9); }
              75% { opacity: 0.9; transform: translateY(-5px) scale(1.05); }
            }
            .float-blink { animation: float-blink 4s ease-in-out infinite; }
          `}</style>
          
          {[...Array(25)].map((_, i) => (
            <div
              key={`light-shape-${i}`}
              className="absolute float-blink"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 4}s`,
                animationDuration: `${3 + Math.random() * 3}s`
              }}
            >
              {i % 5 === 0 ? (
                <div className="w-3 h-3 bg-gradient-to-br from-blue-200 to-blue-300 rounded-full opacity-40"></div>
              ) : i % 5 === 1 ? (
                <div className="w-2 h-2 bg-gradient-to-br from-green-200 to-green-300 rotate-45 opacity-40"></div>
              ) : i % 5 === 2 ? (
                <div className="w-4 h-1 bg-gradient-to-r from-purple-200 to-purple-300 rounded-full opacity-40"></div>
              ) : i % 5 === 3 ? (
                <div className="w-2 h-4 bg-gradient-to-b from-pink-200 to-pink-300 rounded-full opacity-40"></div>
              ) : (
                <div className="w-2 h-2 bg-gradient-to-br from-yellow-200 to-yellow-300 rounded-sm opacity-40"></div>
              )}
            </div>
          ))}
        </div>
        
        {/* Dark mode moving stars */}
        <div className="hidden dark:block">
          <style jsx>{`
            @keyframes shooting-star {
              0% { transform: translateX(0) translateY(0) scale(0); opacity: 1; }
              10% { transform: translateX(10px) translateY(-10px) scale(1); opacity: 1; }
              100% { transform: translateX(300px) translateY(-300px) scale(0); opacity: 0; }
            }
            .shooting-star { animation: shooting-star 3s linear infinite; }
            
            @keyframes twinkle {
              0%, 100% { opacity: 0.3; transform: scale(1); }
              50% { opacity: 1; transform: scale(1.2); }
            }
            .twinkle { animation: twinkle 2s ease-in-out infinite; }
          `}</style>
          
          {/* Regular twinkling stars */}
          {[...Array(60)].map((_, i) => (
            <div
              key={`star-${i}`}
              className="absolute w-1 h-1 bg-white rounded-full twinkle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1.5 + Math.random() * 2}s`
              }}
            ></div>
          ))}
          
          {/* Shooting stars */}
          {[...Array(5)].map((_, i) => (
            <div
              key={`shooting-${i}`}
              className="absolute shooting-star"
              style={{
                left: `${Math.random() * 50}%`,
                top: `${50 + Math.random() * 50}%`,
                animationDelay: `${Math.random() * 8}s`,
                animationDuration: `${2 + Math.random() * 3}s`
              }}
            >
              <div className="w-2 h-2 bg-gradient-to-r from-white to-blue-200 rounded-full"></div>
              <div className="absolute top-0 left-0 w-8 h-0.5 bg-gradient-to-r from-white to-transparent opacity-60 -rotate-45"></div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-6 md:py-8 relative z-10">
        <div className="mb-6 md:mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Problems</h1>
          <p className="text-gray-600 dark:text-gray-300">Practice coding problems and improve your skills</p>
        </div>

        {/* Problem of the Day */}
        {potd && (
          <div className="relative w-full max-w-2xl mx-auto md:max-w-none md:mx-0 md:w-full rounded-3xl shadow-2xl border-4 border-yellow-400 dark:border-yellow-700 bg-gradient-to-br from-yellow-50 via-amber-100 to-orange-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 p-0 mb-8 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 dark:from-yellow-700 dark:via-yellow-800 dark:to-orange-800"></div>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 md:p-8">
              <div className="flex flex-col items-center md:items-start flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-16 h-16 bg-yellow-100 dark:bg-yellow-800/50 rounded-full shadow-lg">
                    <Star className="h-10 w-10 text-yellow-500 dark:text-yellow-300" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-yellow-900 dark:text-yellow-100 tracking-tight">Problem of the Day</h2>
                    <p className="text-base md:text-lg text-yellow-700 dark:text-yellow-300 font-medium">Solve today's challenge and earn coins!</p>
                  </div>
                </div>
                <span className="px-4 py-2 bg-yellow-200 dark:bg-yellow-700 text-yellow-800 dark:text-yellow-200 text-base font-bold rounded-full shadow-md mb-4">+10 Coins</span>
                <div className="w-full bg-white/80 dark:bg-gray-800/60 rounded-2xl p-4 mb-4 border border-yellow-200/40 dark:border-yellow-700/30 shadow-sm">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center md:text-left">
                    {potd.problem.title}
                  </h3>
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-2">
                    <span className={`px-4 py-1 rounded-full text-base font-semibold shadow ${
                      potd.problem.difficulty === 'Easy'
                        ? 'bg-green-100 text-green-800 dark:bg-green-800/50 dark:text-green-200 border border-green-200 dark:border-green-600/30'
                        : potd.problem.difficulty === 'Medium'
                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-800/50 dark:text-orange-200 border border-orange-200 dark:border-orange-600/30'
                        : 'bg-red-100 text-red-800 dark:bg-red-800/50 dark:text-red-200 border border-red-200 dark:border-red-600/30'
                    }`}>
                      {potd.problem.difficulty}
                    </span>
                    {potd.problem.tags && potd.problem.tags.slice(0, 3).map((tag: string) => (
                      <span key={tag} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-base rounded-full border border-blue-200/50 dark:border-blue-600/30">
                        {tag}
                      </span>
                    ))}
                    {potd.problem.tags && potd.problem.tags.length > 3 && (
                      <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 text-base rounded-full border border-gray-200 dark:border-gray-600/30">
                        +{potd.problem.tags.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center md:items-end gap-3">
                {hasSolvedPOTD ? (
                  <div className="flex items-center px-6 py-4 bg-green-100 dark:bg-green-800/50 text-green-800 dark:text-green-200 rounded-2xl font-bold shadow-lg border border-green-200 dark:border-green-600/30 text-lg">
                    <CheckCircle className="h-6 w-6 mr-2" />
                    Completed Today
                  </div>
                ) : (
                  <button
                    onClick={() => window.location.href = `/problems/${potd.problem._id}`}
                    className="flex items-center px-8 py-4 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 dark:from-yellow-600 dark:to-amber-600 dark:hover:from-yellow-700 dark:hover:to-amber-700 text-white rounded-2xl font-extrabold text-lg transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:scale-105"
                  >
                    <Trophy className="h-6 w-6 mr-2" />
                    Solve Now
                  </button>
                )}
                <div className="mt-2 text-center">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400 font-semibold">
                    {potd.solvedCount || 0} solved today
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6 mb-4 md:mb-6 backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-300" />
              <input
                type="text"
                placeholder="Search problems..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-gray-100"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <select
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-gray-100 flex items-center justify-start text-left"
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
              >
                <option value="">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
            <div>
              <select
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-gray-100 flex items-center justify-start text-left"
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
              >
                <option value="">All Tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
            <div>
              <button
                onClick={() => {
                  setSelectedDifficulty('');
                  setSelectedTag('');
                  setSearchTerm('');
                  setSearchParams({});
                }}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-gray-100"
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Problems List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-x-auto backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95">
          <div className="w-full md:min-w-[600px]">
            <table className="w-full text-xs md:text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                <tr>
                  <th className="px-2 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-2 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Problem
                  </th>
                  <th className="px-2 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Difficulty
                  </th>
                  <th className="px-2 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Acceptance Rate
                  </th>
                  <th className="px-2 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tags
                  </th>
                  <th className="px-2 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Companies
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredProblems.map((problem) => (
                  <tr
                    key={problem._id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    onClick={() => window.location.href = `/problems/${problem._id}`}
                  >
                    <td className="px-2 md:px-6 py-2 md:py-4 whitespace-nowrap">
                      {solvedProblems.has(problem._id) ? (
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <div className="h-5 w-5"></div>
                      )}
                    </td>
                    <td className="px-2 md:px-6 py-2 md:py-4 whitespace-nowrap">
                      <span className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium flex items-center">
                        {problem.title}
                        {solvedProblems.has(problem._id) && (
                          <span className="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 text-xs rounded-full">
                            Solved
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-2 md:px-6 py-2 md:py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        problem.difficulty === 'Easy'
                          ? 'text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-900'
                          : problem.difficulty === 'Medium'
                          ? 'text-yellow-600 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900'
                          : problem.difficulty === 'Hard'
                          ? 'text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900'
                          : 'text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-700'
                      }`}>
                        {problem.difficulty}
                      </span>
                    </td>
                    <td className="px-2 md:px-6 py-2 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-900 dark:text-gray-100">
                      {problem.acceptanceRate.toFixed(1)}%
                    </td>
                    <td className="px-2 md:px-6 py-2 md:py-4">
                      <div className="flex flex-wrap gap-1">
                        {problem.tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                        {problem.tags.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
                            +{problem.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 md:px-6 py-2 md:py-4">
                      <div className="flex flex-wrap gap-1">
                        {problem.companies.slice(0, 2).map((company, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 text-xs rounded-full"
                          >
                            {company}
                          </span>
                        ))}
                        {problem.companies.length > 2 && (
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
                            +{problem.companies.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="mt-4 md:mt-6 flex flex-col md:flex-row items-center justify-between gap-2 md:gap-0">
          <div className="text-xs md:text-sm text-gray-700 dark:text-gray-300">
            Showing page {currentPage} of {totalPages}
          </div>
          <div className="flex flex-wrap gap-2 md:space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-2 md:px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-100 text-xs md:text-sm"
            >
              Previous
            </button>
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-2 md:px-3 py-1 border rounded-md text-xs md:text-sm ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:text-white dark:border-blue-400'
                      : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-100'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-2 md:px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-100 text-xs md:text-sm"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Problems;
