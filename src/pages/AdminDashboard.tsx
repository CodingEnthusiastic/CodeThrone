import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout, Home, Users, Trophy, MessageSquare, FileText, Activity, Target } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Stats {
  totalUsers: number;
  totalProblems: number;
  totalContests: number;
  totalDiscussions: number;
  totalAnnouncements: number;
  activeContests: number;
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalProblems: 0,
    totalContests: 0,
    totalDiscussions: 0,
    totalAnnouncements: 0,
    activeContests: 0
  });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchStats();
  }, [user, navigate]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      // For now, simulate API response with placeholder data
      // You can implement real API calls later
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate loading
      
      setStats({
        totalUsers: 156,
        totalProblems: 342,
        totalContests: 23,
        totalDiscussions: 89,
        totalAnnouncements: 12,
        activeContests: 3
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({
        totalUsers: 0,
        totalProblems: 0,
        totalContests: 0,
        totalDiscussions: 0,
        totalAnnouncements: 0,
        activeContests: 0
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Overview</h2>
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh Stats
        </button>
      </div>
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 animate-pulse">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
                <div className="ml-4 flex-1">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                  <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Users Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Total Users</h3>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          {/* Problems Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Total Problems</h3>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.totalProblems}</p>
              </div>
            </div>
          </div>

          {/* Contests Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Total Contests</h3>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.totalContests}</p>
              </div>
            </div>
          </div>

          {/* Active Contests Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Contests</h3>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.activeContests}</p>
              </div>
            </div>
          </div>

          {/* Discussions Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Discussions</h3>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.totalDiscussions}</p>
              </div>
            </div>
          </div>

          {/* Announcements Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-indigo-500" />
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Announcements</h3>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.totalAnnouncements}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/admin/users"
            className="flex items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <Users className="h-5 w-5 mr-2" />
            Manage Users
          </Link>
          
          <Link
            to="/admin/contests"
            className="flex items-center justify-center p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
          >
            <Trophy className="h-5 w-5 mr-2" />
            Manage Contests
          </Link>
          
          <Link
            to="/admin/problems"
            className="flex items-center justify-center p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
          >
            <Target className="h-5 w-5 mr-2" />
            Manage Problems
          </Link>
          
          <Link
            to="/admin/announcements"
            className="flex items-center justify-center p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
          >
            <FileText className="h-5 w-5 mr-2" />
            Manage Announcements
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <Link
            to="/"
            className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            <Home className="h-5 w-5 mr-2" />
            Back to Home
          </Link>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview' 
                  ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Layout className="h-5 w-5 inline mr-2" />
              Platform Overview
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && renderOverview()}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
