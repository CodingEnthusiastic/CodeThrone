import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Search, Filter, Code, CheckCircle, Clock, Building, ArrowLeft } from 'lucide-react';

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

interface CompanyStats {
  totalProblems: number;
  solvedByUser: number;
  easyProblems: number;
  mediumProblems: number;
  hardProblems: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
}

const CompanyProblems: React.FC = () => {
  const { company } = useParams<{ company: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [solvedProblems, setSolvedProblems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [companyStats, setCompanyStats] = useState<CompanyStats>({
    totalProblems: 0,
    solvedByUser: 0,
    easyProblems: 0,
    mediumProblems: 0,
    hardProblems: 0,
    easySolved: 0,
    mediumSolved: 0,
    hardSolved: 0
  });

  const companyName = company || searchParams.get('company') || '';

  useEffect(() => {
  if (companyName) {
    fetchCompanyProblems();
  }
}, [companyName, currentPage, selectedDifficulty]);

  useEffect(() => {
  if (user && problems.length > 0) {
    fetchSolvedProblems();
  }
}, [user, problems]);

  const fetchCompanyProblems = async () => {
  console.log('📡 Fetching company problems...');
  try {
    setLoading(true);
    
    const response = await axios.get(
      `http://localhost:5000/api/problems/company/${encodeURIComponent(companyName)}`, {
        params: {
          page: currentPage,
          limit: 20,
          difficulty: selectedDifficulty || undefined
        }
      }
    );

    if (!response.data) throw new Error('No data received');

    setProblems(response.data.problems);
    setTotalPages(response.data.totalPages);
    setCompanyStats({
      totalProblems: response.data.stats.totalProblems,
      solvedByUser: 0, // Will be updated when solved problems are fetched
      easyProblems: response.data.stats.easyProblems,
      mediumProblems: response.data.stats.mediumProblems,
      hardProblems: response.data.stats.hardProblems,
      easySolved: 0,
      mediumSolved: 0,
      hardSolved: 0
    });

    console.log('✅ Data fetched successfully:', {
      problemsCount: response.data.problems.length,
      stats: response.data.stats
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    setLoading(false);
  }
};

//   const fetchSolvedProblems = async () => {
//     if (!user) return;
    
//     console.log('🔍 Fetching solved problems for user:', user.username);
//     try {
//       const response = await axios.get(`http://localhost:5000/api/profile/${user.username}/solved`);
//       const solved = new Set(response.data.solvedProblems.map((p: any) => p._id));
//       setSolvedProblems(solved);
//       console.log('✅ Solved problems fetched:', solved.size);
//     } catch (error) {
//       console.error('❌ Error fetching solved problems:', error);
//     }
  

  const updateSolvedStats = (solvedIds: string[]) => {
  const solved = new Set(solvedIds);
  setSolvedProblems(solved);

  // Update stats with solved information
  setCompanyStats(prev => ({
    ...prev,
    solvedByUser: solvedIds.length,
    easySolved: problems.filter(p => p.difficulty === 'Easy' && solved.has(p._id)).length,
    mediumSolved: problems.filter(p => p.difficulty === 'Medium' && solved.has(p._id)).length,
    hardSolved: problems.filter(p => p.difficulty === 'Hard' && solved.has(p._id)).length
  }));
};

const fetchSolvedProblems = async () => {
  if (!user) return;
  
  try {
    const response = await axios.get(`http://localhost:5000/api/profile/${user.username}/solved`);
    const solvedIds = response.data.solvedProblems.map((p: any) => p._id);
    updateSolvedStats(solvedIds);
    console.log('✅ Solved problems fetched:', solvedIds.length);
  } catch (error) {
    console.error('❌ Error fetching solved problems:', error);
  }
};
  const calculateCompanyStats = (allProblems: Problem[]): CompanyStats => {
    const stats = {
      totalProblems: allProblems.length,
      solvedByUser: 0,
      easyProblems: 0,
      mediumProblems: 0,
      hardProblems: 0,
      easySolved: 0,
      mediumSolved: 0,
      hardSolved: 0
    };

    allProblems.forEach(problem => {
      // Count by difficulty
      if (problem.difficulty === 'Easy') stats.easyProblems++;
      else if (problem.difficulty === 'Medium') stats.mediumProblems++;
      else if (problem.difficulty === 'Hard') stats.hardProblems++;

      // Count solved by user
      if (solvedProblems.has(problem._id)) {
        stats.solvedByUser++;
        if (problem.difficulty === 'Easy') stats.easySolved++;
        else if (problem.difficulty === 'Medium') stats.mediumSolved++;
        else if (problem.difficulty === 'Hard') stats.hardSolved++;
      }
    });

    return stats;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'Hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getProgressPercentage = (solved: number, total: number) => {
    return total > 0 ? (solved / total) * 100 : 0;
  };

  const filteredProblems = problems.filter(problem =>
    problem.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const allTags = [...new Set(problems.flatMap(p => p.tags))];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Link
              to="/"
              className="flex items-center text-blue-600 hover:text-blue-800 mr-4"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              Back to Home
            </Link>
          </div>
          <div className="flex items-center mb-4">
            <Building className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">{companyName} Problems</h1>
          </div>
          <p className="text-gray-600">Practice problems frequently asked in {companyName} interviews</p>
        </div>

        {/* Progress Tracker */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Progress</h3>
          
          {/* Overall Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm text-gray-500">
                {companyStats.easySolved+companyStats.mediumSolved+companyStats.hardSolved} / {companyStats.totalProblems} solved
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage(companyStats.easySolved+companyStats.mediumSolved+companyStats.hardSolved, companyStats.totalProblems)}%` }}
              ></div>
            </div>
            <div className="text-right mt-1">
              <span className="text-sm font-medium text-blue-600">
                {getProgressPercentage(companyStats.easySolved+companyStats.mediumSolved+companyStats.hardSolved, companyStats.totalProblems).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Difficulty Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-800">Easy</span>
                <span className="text-sm text-green-600">
                  {companyStats.easySolved} / {companyStats.easyProblems}
                </span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getProgressPercentage(companyStats.easySolved, companyStats.easyProblems)}%` }}
                ></div>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-yellow-800">Medium</span>
                <span className="text-sm text-yellow-600">
                  {companyStats.mediumSolved} / {companyStats.mediumProblems}
                </span>
              </div>
              <div className="w-full bg-yellow-200 rounded-full h-2">
                <div 
                  className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getProgressPercentage(companyStats.mediumSolved, companyStats.mediumProblems)}%` }}
                ></div>
              </div>
            </div>

            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-red-800">Hard</span>
                <span className="text-sm text-red-600">
                  {companyStats.hardSolved} / {companyStats.hardProblems}
                </span>
              </div>
              <div className="w-full bg-red-200 rounded-full h-2">
                <div 
                  className="bg-red-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getProgressPercentage(companyStats.hardSolved, companyStats.hardProblems)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search problems..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
            >
              <option value="">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
            <select
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              }}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </button>
          </div>
        </div>

        {/* Problems List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Problem
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Difficulty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acceptance Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tags
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProblems.map((problem) => (
                  <tr key={problem._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {solvedProblems.has(problem._id) ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <div className="h-5 w-5"></div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/problems/${problem._id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium flex items-center"
                      >
                        {problem.title}
                        {solvedProblems.has(problem._id) && (
                          <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                            Solved
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(problem.difficulty)}`}>
                        {problem.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {problem.acceptanceRate.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {problem.tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                        {problem.tags.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            +{problem.tags.length - 3}
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
          <div className="text-sm text-gray-700">
            Showing page {currentPage} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>

        {filteredProblems.length === 0 && (
          <div className="text-center py-12 text-gray-600">
            <Building className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No problems found for {companyName}.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyProblems;