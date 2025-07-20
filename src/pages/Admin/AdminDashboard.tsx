import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  FileText, 
  Trophy, 
  MessageSquare,
  Megaphone,
  Code,
  Calendar,
  Settings
} from 'lucide-react';

interface Problem {
  _id: string;
  title: string;
  difficulty: string;
  tags: string[];
  submissions: number;
  accepted: number;
  acceptanceRate: number;
}

interface Contest {
  _id: string;
  name: string;
  startTime: string;
  endTime: string;
  status: string;
  participants: any[];
}

interface Discussion {
  _id: string;
  title: string;
  author: { username: string };
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
}

interface Announcement {
  _id: string;
  title: string;
  content: string;
  type: string;
  priority: string;
  createdAt: string;
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateProblem, setShowCreateProblem] = useState(false);
  const [showCreateContest, setShowCreateContest] = useState(false);
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  const [newProblem, setNewProblem] = useState({
    title: '',
    description: '',
    difficulty: 'Easy',
    tags: '',
    constraints: '',
    examples: [{ input: '', output: '', explanation: '' }],
    testCases: [{ input: '', output: '', isPublic: true }]
  });
  
  const [newContest, setNewContest] = useState({
    name: '',
    description: '',
    startTime: '',
    endTime: '',
    duration: 60
  });
  
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    type: 'general',
    priority: 'medium'
  });

  // Redirect if not admin
  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    console.log('🔄 Admin dashboard mounted, fetching data...');
    fetchData();
  }, []);

  const fetchData = async () => {
    console.log('📊 Admin: Fetching dashboard data...');
    try {
      console.log('📡 Making API calls to fetch admin data...');
      const [problemsRes, contestsRes, discussionsRes, announcementsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/problems', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('http://localhost:5000/api/contests', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('http://localhost:5000/api/discussion', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('http://localhost:5000/api/announcements', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      console.log('✅ Admin: Data fetched successfully');
      console.log('📊 Problems count:', problemsRes.data.problems?.length || problemsRes.data.length);
      console.log('📊 Contests count:', contestsRes.data.length);
      console.log('📊 Discussions count:', discussionsRes.data.discussions?.length || discussionsRes.data.length);
      console.log('📊 Announcements count:', announcementsRes.data.length);
      
      setProblems(problemsRes.data.problems || []);
      setContests(contestsRes.data || []);
      setDiscussions(discussionsRes.data.discussions || []);
      setAnnouncements(announcementsRes.data || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      console.error('📊 Error details:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📝 Admin: Creating new problem...');
    console.log('👤 Current user role:', user?.role);
    console.log('🔑 Token exists:', !!localStorage.getItem('token'));
    
    try {
      const problemData = {
        ...newProblem,
        tags: newProblem.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        examples: newProblem.examples.filter(ex => ex.input && ex.output),
        testCases: newProblem.testCases.filter(tc => tc.input && tc.output)
      };
      
      console.log('📤 Sending problem data:', problemData);
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No authentication token');
        alert('Please login again.');
        return;
      }
      
      const response = await axios.post('http://localhost:5000/api/problems', problemData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Admin: Problem created successfully');
      
      setProblems([response.data, ...problems]);
      setShowCreateProblem(false);
      setNewProblem({
        title: '',
        description: '',
        difficulty: 'Easy',
        tags: '',
        constraints: '',
        examples: [{ input: '', output: '', explanation: '' }],
        testCases: [{ input: '', output: '', isPublic: true }]
      });
      alert('Problem created successfully!');
    } catch (error) {
      console.error('❌ Admin: Error creating problem:', error);
      console.error('📊 Error response:', error.response?.data);
      
      if (error.response?.status === 401) {
        alert('Authentication failed. Please logout and login again.');
      } else {
        alert(`Failed to create problem: ${error.response?.data?.message || error.message}`);
      }
    }
  };
  
  const handleCreateContest = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🏆 Admin: Creating new contest...');
    console.log('👤 Current user role:', user?.role);
    console.log('🔑 Token exists:', !!localStorage.getItem('token'));
    
    try {
      console.log('📤 Sending contest data:', newContest);
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No authentication token');
        alert('Please login again.');
        return;
      }
      
      const response = await axios.post('http://localhost:5000/api/contests', newContest, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Admin: Contest created successfully');
      
      setContests([response.data, ...contests]);
      setShowCreateContest(false);
      setNewContest({
        name: '',
        description: '',
        startTime: '',
        endTime: '',
        duration: 60
      });
      alert('Contest created successfully!');
    } catch (error) {
      console.error('❌ Admin: Error creating contest:', error);
      console.error('📊 Error response:', error.response?.data);
      
      if (error.response?.status === 401) {
        alert('Authentication failed. Please logout and login again.');
      } else {
        alert(`Failed to create contest: ${error.response?.data?.message || error.message}`);
      }
    }
  };
  
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📢 Admin: Creating new announcement...');
    console.log('👤 Current user in admin dashboard:', user);
    console.log('🔑 Token from localStorage:', localStorage.getItem('token'));
    console.log('🔍 User role check:', user?.role);
    
    try {
      console.log('📤 Sending announcement data:', newAnnouncement);
      
      // Double-check authentication
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No token found in localStorage');
        alert('Authentication required. Please login again.');
        return;
      }
      
      if (user?.role !== 'admin') {
        console.error('❌ User is not admin:', user?.role);
        alert('Admin access required.');
        return;
      }
      
      const response = await axios.post('http://localhost:5000/api/announcements', newAnnouncement, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Admin: Announcement created successfully');
      
      setAnnouncements([response.data, ...announcements]);
      setShowCreateAnnouncement(false);
      setNewAnnouncement({
        title: '',
        content: '',
        type: 'general',
        priority: 'medium'
      });
      alert('Announcement created successfully!');
    } catch (error) {
      console.error('❌ Admin: Error creating announcement:', error);
      console.error('📊 Error response:', error.response?.data);
      console.error('📊 Error status:', error.response?.status);
      console.error('📊 Error headers:', error.response?.headers);
      
      if (error.response?.status === 401) {
        console.error('🔒 Authentication failed - token may be invalid');
        alert('Authentication failed. Please logout and login again.');
      } else {
        alert(`Failed to create announcement: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  const handleDeleteProblem = async (problemId: string) => {
    console.log('🗑️ Admin: Deleting problem:', problemId);
    if (!confirm('Are you sure you want to delete this problem?')) return;
    
    try {
      await axios.delete(`http://localhost:5000/api/problems/${problemId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      console.log('✅ Problem deleted successfully');
      setProblems(problems.filter(p => p._id !== problemId));
      alert('Problem deleted successfully!');
    } catch (error) {
      console.error('❌ Error deleting problem:', error);
      alert('Failed to delete problem.');
    }
  };

  const handleDeleteContest = async (contestId: string) => {
    console.log('🗑️ Admin: Deleting contest:', contestId);
    if (!confirm('Are you sure you want to delete this contest?')) return;
    
    try {
      await axios.delete(`http://localhost:5000/api/contests/${contestId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      console.log('✅ Contest deleted successfully');
      setContests(contests.filter(c => c._id !== contestId));
      alert('Contest deleted successfully!');
    } catch (error) {
      console.error('❌ Error deleting contest:', error);
      alert('Failed to delete contest.');
    }
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    console.log('🗑️ Admin: Deleting announcement:', announcementId);
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    
    try {
      await axios.delete(`http://localhost:5000/api/announcements/${announcementId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      console.log('✅ Announcement deleted successfully');
      setAnnouncements(announcements.filter(a => a._id !== announcementId));
      alert('Announcement deleted successfully!');
    } catch (error) {
      console.error('❌ Error deleting announcement:', error);
      alert('Failed to delete announcement.');
    }
  };

  const handleDeleteDiscussion = async (discussionId: string) => {
  console.log('🗑️ Admin: Deleting discussion:', discussionId);
  if (!confirm('Are you sure you want to delete this discussion?')) return;

  try {
    await axios.delete(`http://localhost:5000/api/discussion/${discussionId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    console.log('✅ Discussion deleted successfully');
    setDiscussions(discussions.filter(d => d._id !== discussionId));
    alert('Discussion deleted successfully!');
  } catch (error) {
    console.error('❌ Error deleting discussion:', error);
    alert('Failed to delete discussion.');
  }
};

  const stats = [
    {
      title: 'Total Problems',
      value: problems.length,
      icon: <Code className="h-8 w-8 text-blue-600" />,
      color: 'bg-blue-50 border-blue-200'
    },
    {
      title: 'Active Contests',
      value: contests.filter(c => c.status === 'ongoing').length,
      icon: <Trophy className="h-8 w-8 text-yellow-600" />,
      color: 'bg-yellow-50 border-yellow-200'
    },
    {
      title: 'Discussions',
      value: discussions.length,
      icon: <MessageSquare className="h-8 w-8 text-green-600" />,
      color: 'bg-green-50 border-green-200'
    },
    {
      title: 'Announcements',
      value: announcements.length,
      icon: <Megaphone className="h-8 w-8 text-purple-600" />,
      color: 'bg-purple-50 border-purple-200'
    }
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Settings className="h-4 w-4" /> },
    { id: 'problems', label: 'Problems', icon: <Code className="h-4 w-4" /> },
    { id: 'contests', label: 'Contests', icon: <Trophy className="h-4 w-4" /> },
    { id: 'discussions', label: 'Discussions', icon: <MessageSquare className="h-4 w-4" /> },
    { id: 'announcements', label: 'Announcements', icon: <Megaphone className="h-4 w-4" /> }
  ];

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage your platform content and settings</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className={`p-6 rounded-lg border ${stat.color}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                {stat.icon}
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon}
                  <span className="ml-2">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Problems */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Recent Problems</h3>
                    <div className="space-y-3">
                      {problems.slice(0, 5).map((problem) => (
                        <div key={problem._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{problem.title}</p>
                            <p className="text-sm text-gray-600">{problem.difficulty} • {problem.acceptanceRate.toFixed(1)}% acceptance</p>
                          </div>
                          <span className="text-sm text-gray-500">{problem.submissions} submissions</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Contests */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Recent Contests</h3>
                    <div className="space-y-3">
                      {contests.slice(0, 5).map((contest) => (
                        <div key={contest._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{contest.name}</p>
                            <p className="text-sm text-gray-600">{contest.status} • {contest.participants.length} participants</p>
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(contest.startTime).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'problems' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Manage Problems</h3>
                  <button 
                    onClick={() => setShowCreateProblem(true)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Problem
                  </button>
                </div>
                
                {showCreateProblem && (
                  <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="text-lg font-semibold mb-4">Create New Problem</h4>
                    <form onSubmit={handleCreateProblem} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Title</label>
                          <input
                            type="text"
                            required
                            value={newProblem.title}
                            onChange={(e) => setNewProblem({...newProblem, title: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Difficulty</label>
                          <select
                            value={newProblem.difficulty}
                            onChange={(e) => setNewProblem({...newProblem, difficulty: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                          </select>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">Description</label>
                        <textarea
                          required
                          rows={4}
                          value={newProblem.description}
                          onChange={(e) => setNewProblem({...newProblem, description: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
                          <input
                            type="text"
                            value={newProblem.tags}
                            onChange={(e) => setNewProblem({...newProblem, tags: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            placeholder="Array, Hash Table, Two Pointers"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Constraints</label>
                          <textarea
                            required
                            rows={2}
                            value={newProblem.constraints}
                            onChange={(e) => setNewProblem({...newProblem, constraints: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      
                      <div className="flex space-x-4">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        >
                          Create Problem
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCreateProblem(false)}
                          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Difficulty</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acceptance</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submissions</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {problems.map((problem) => (
                        <tr key={problem._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <p className="font-medium">{problem.title}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {problem.tags.slice(0, 2).map((tag, index) => (
                                  <span key={index} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              problem.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                              problem.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {problem.difficulty}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {problem.acceptanceRate.toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {problem.submissions}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button className="text-blue-600 hover:text-blue-900">
                                <Edit className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteProblem(problem._id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'contests' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Manage Contests</h3>
                  <button 
                    onClick={() => setShowCreateContest(true)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Contest
                  </button>
                </div>
                
                {showCreateContest && (
                  <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="text-lg font-semibold mb-4">Create New Contest</h4>
                    <form onSubmit={handleCreateContest} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Contest Name</label>
                          <input
                            type="text"
                            required
                            value={newContest.name}
                            onChange={(e) => setNewContest({...newContest, name: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
                          <input
                            type="number"
                            required
                            value={newContest.duration}
                            onChange={(e) => setNewContest({...newContest, duration: parseInt(e.target.value)})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">Description</label>
                        <textarea
                          required
                          rows={3}
                          value={newContest.description}
                          onChange={(e) => setNewContest({...newContest, description: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Start Time</label>
                          <input
                            type="datetime-local"
                            required
                            value={newContest.startTime}
                            onChange={(e) => setNewContest({...newContest, startTime: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">End Time</label>
                          <input
                            type="datetime-local"
                            required
                            value={newContest.endTime}
                            onChange={(e) => setNewContest({...newContest, endTime: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      
                      <div className="flex space-x-4">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        >
                          Create Contest
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCreateContest(false)}
                          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
                
                <div className="space-y-4">
                  {contests.map((contest) => (
                    <div key={contest._id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{contest.name}</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(contest.startTime).toLocaleString()} - {new Date(contest.endTime).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500">{contest.participants.length} participants</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            contest.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                            contest.status === 'ongoing' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {contest.status}
                          </span>
                          <button className="text-blue-600 hover:text-blue-900">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteContest(contest._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'discussions' && (
              <div>
                <h3 className="text-lg font-semibold mb-6">Manage Discussions</h3>
                <div className="space-y-4">
                  {discussions.map((discussion) => (
                    <div key={discussion._id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{discussion.title}</h4>
                          <p className="text-sm text-gray-600">By {discussion.author.username}</p>
                          <p className="text-sm text-gray-500">{new Date(discussion.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {discussion.isPinned && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Pinned</span>
                          )}
                          {discussion.isLocked && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Locked</span>
                          )}
                          {/* <button className="text-blue-600 hover:text-blue-900">
                            <Edit className="h-4 w-4" />
                          </button> */}
                          <button
                            onClick={() => handleDeleteDiscussion(discussion._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'announcements' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Manage Announcements</h3>
                  <button 
                    onClick={() => setShowCreateAnnouncement(true)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Announcement
                  </button>
                </div>
                
                {showCreateAnnouncement && (
                  <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="text-lg font-semibold mb-4">Create New Announcement</h4>
                    <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Title</label>
                        <input
                          type="text"
                          required
                          value={newAnnouncement.title}
                          onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">Content</label>
                        <textarea
                          required
                          rows={4}
                          value={newAnnouncement.content}
                          onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Type</label>
                          <select
                            value={newAnnouncement.type}
                            onChange={(e) => setNewAnnouncement({...newAnnouncement, type: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="general">General</option>
                            <option value="contest">Contest</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="feature">Feature</option>
                            <option value="update">Update</option>
                            <option value="alert">Alert</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Priority</label>
                          <select
                            value={newAnnouncement.priority}
                            onChange={(e) => setNewAnnouncement({...newAnnouncement, priority: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="flex space-x-4">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        >
                          Create Announcement
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCreateAnnouncement(false)}
                          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
                
                <div className="space-y-4">
                  {announcements.map((announcement) => (
                    <div key={announcement._id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{announcement.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{announcement.content}</p>
                          <p className="text-sm text-gray-500 mt-2">{new Date(announcement.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            announcement.priority === 'high' ? 'bg-red-100 text-red-800' :
                            announcement.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {announcement.type}
                          </span>
                          <button className="text-blue-600 hover:text-blue-900">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteAnnouncement(announcement._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;