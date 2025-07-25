import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Search, Filter, CheckCircle, Star, Trophy } from 'lucide-react';

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

      const response = await axios.get(`http://localhost:5000/api/problems?${params}`);
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
      const response = await axios.get(`http://localhost:5000/api/profile/${user.username}/solved`);
      const solved = new Set<string>(response.data.solvedProblems.map((p: any) => p._id as string));
      setSolvedProblems(solved);
    } catch (error) {
      console.error('Error fetching solved problems:', error);
    }
  };

  const fetchPOTD = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/potd/today');
      setPotd(response.data);
    } catch (error) {
      console.error('Error fetching POTD:', error);
    }
  };

  const fetchPOTDStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/potd/status', {
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
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Problems</h1>
          <p className="text-gray-600 dark:text-gray-300">Practice coding problems and improve your skills</p>
        </div>

        {/* Problem of the Day */}
        {potd && (
          <div className="bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-900/20 dark:via-amber-900/20 dark:to-orange-900/20 rounded-2xl shadow-lg border border-yellow-200/50 dark:border-yellow-600/30 p-6 mb-6 backdrop-blur-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 dark:bg-yellow-800/50 rounded-full mr-3">
                    <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400 fill-current" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-yellow-900 dark:text-yellow-100">Problem of the Day</h2>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">Solve today's challenge and earn coins!</p>
                  </div>
                  <span className="ml-auto px-3 py-1.5 bg-yellow-200 dark:bg-yellow-700 text-yellow-800 dark:text-yellow-200 text-sm font-semibold rounded-full shadow-sm">
                    +10 Coins
                  </span>
                </div>
                
                <div className="bg-white/60 dark:bg-gray-800/40 rounded-xl p-4 mb-4 border border-yellow-200/30 dark:border-yellow-600/20">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    {potd.problem.title}
                  </h3>
                  <div className="flex items-center flex-wrap gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium shadow-sm ${
                      potd.problem.difficulty === 'Easy' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-800/50 dark:text-green-200 border border-green-200 dark:border-green-600/30' 
                        : potd.problem.difficulty === 'Medium' 
                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-800/50 dark:text-orange-200 border border-orange-200 dark:border-orange-600/30' 
                        : 'bg-red-100 text-red-800 dark:bg-red-800/50 dark:text-red-200 border border-red-200 dark:border-red-600/30'
                    }`}>
                      {potd.problem.difficulty}
                    </span>
                    {potd.problem.tags && potd.problem.tags.slice(0, 3).map((tag: string) => (
                      <span key={tag} className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded-full border border-blue-200/50 dark:border-blue-600/30">
                        {tag}
                      </span>
                    ))}
                    {potd.problem.tags && potd.problem.tags.length > 3 && (
                      <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 text-sm rounded-full border border-gray-200 dark:border-gray-600/30">
                        +{potd.problem.tags.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="ml-6 flex flex-col items-end">
                {hasSolvedPOTD ? (
                  <div className="flex items-center px-4 py-3 bg-green-100 dark:bg-green-800/50 text-green-800 dark:text-green-200 rounded-xl font-medium shadow-sm border border-green-200 dark:border-green-600/30">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Completed Today
                  </div>
                ) : (
                  <button
                    onClick={() => window.open(`/problems/${potd.problem._id}`, '_blank')}
                    className="flex items-center px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 dark:from-yellow-600 dark:to-amber-600 dark:hover:from-yellow-700 dark:hover:to-amber-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <Trophy className="h-5 w-5 mr-2" />
                    Solve Now
                  </button>
                )}
                <div className="mt-3 text-center">
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">
                    {potd.solvedCount || 0} solved today
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <select
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-gray-100"
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
            >
              <option value="">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
            <select
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-gray-100"
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
            >
              <option value="">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
            <button
              onClick={() => {
                setSelectedDifficulty('');
                setSelectedTag('');
                setSearchTerm('');
                setSearchParams({});
              }}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-gray-100"
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </button>
          </div>
        </div>

        {/* Problems List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Problem
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Difficulty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Acceptance Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tags
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Companies
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredProblems.map((problem) => (
                  <tr key={problem._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {solvedProblems.has(problem._id) ? (
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <div className="h-5 w-5"></div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/problems/${problem._id}`}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium flex items-center"
                      >
                        {problem.title}
                        {solvedProblems.has(problem._id) && (
                          <span className="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 text-xs rounded-full">
                            Solved
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {problem.acceptanceRate.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4">
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
                    <td className="px-6 py-4">
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
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing page {currentPage} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-100"
            >
              Previous
            </button>
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 border rounded-md ${
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
              className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-100"
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