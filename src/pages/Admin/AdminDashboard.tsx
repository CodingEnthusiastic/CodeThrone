import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import axios, { AxiosError } from 'axios';
import { API_URL, SOCKET_URL } from "../../config/api";
import { useTheme } from '../../contexts/ThemeContext'
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

interface UserProfile {
  firstName?: string;
  lastName?: string;
  linkedIn?: string;
  github?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  college?: string;
  branch?: string;
  graduationYear?: number;
}

interface User {
  _id: string;
  username?: string;
  email?: string;
  role?: string;
  createdAt?: string;
  profile?: UserProfile;
}
  

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateProblem, setShowCreateProblem] = useState(false);
  const [showCreateContest, setShowCreateContest] = useState(false);
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserData, setEditUserData] = useState<any>(null);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user'
  });

  const [newProblem, setNewProblem] = useState({
    title: '',
    description: '',
    difficulty: 'Easy',
    tags: '',
    companies: '',
    constraints: '',
    examples: [{ input: '', output: '', explanation: '' }],
    testCases: [{ input: '', output: '', isPublic: true }],
    codeTemplates: {
      cpp: '',
      java: '',
      python: '',
      c: ''
    },
    functionSignature: {
      cpp: '',
      java: '',
      python: '',
      c: ''
    },
    timeLimit: 2000,
    memoryLimit: 256,
    isPublished: false,
    isFeatured: false,
    editorial: {
      written: '',
      videoUrl: '',
      thumbnailUrl: '',
      duration: 0
    }
  });

  const [newContest, setNewContest] = useState({
    name: '',
    description: '',
    bannerImage: '',
    startTime: '',
    endTime: '',
    duration: 60,
    isPublic: true,
    password: '',
    leaderboardVisible: true,
    freezeTime: 0,
    rules: '',
    allowedLanguages: ['cpp', 'python', 'java', 'c']
  });

  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    type: 'general',
    priority: 'medium',
    tags: '',
    imageUrl: '',
    link: '',
    expiresAt: '',
    visibleToRoles: ['user'],
    pinned: false
  });

  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [editAnnouncementData, setEditAnnouncementData] = useState<any>(null);

  // Redirect if not admin
  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // Helper function to show notifications
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // User CRUD handlers
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/users`, newUser, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setUsers([response.data, ...users]);
      setShowCreateUser(false);
      setNewUser({ username: '', email: '', password: '', role: 'user' });
      showNotification('success', 'User created successfully!');
    } catch (error: any) {
      showNotification('error', `Failed to create user: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUserId(user._id);
    setEditUserData({ ...user });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_URL}/users/${editingUserId}`, editUserData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setUsers(users.map(u => u._id === editingUserId ? response.data : u));
      setEditingUserId(null);
      setEditUserData(null);
      showNotification('success', 'User updated!');
    } catch (error: any) {
      showNotification('error', 'Failed to update user.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(users.filter(u => u._id !== userId));
      showNotification('success', 'User deleted successfully!');
    } catch (error) {
      showNotification('error', 'Failed to delete user.');
    }
  };

  const fetchData = async () => {
    try {
      const [problemsRes, contestsRes, discussionsRes, announcementsRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/problems`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get(`${API_URL}/contests`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get(`${API_URL}/discussion`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get(`${API_URL}/announcements`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get(`${API_URL}/users`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      setProblems(problemsRes.data.problems || []);
      setContests(contestsRes.data || []);
      setDiscussions(discussionsRes.data.discussions || []);
      setAnnouncements(announcementsRes.data || []);
      setUsers(usersRes.data || []);
    } catch (error: any) {
      console.error('❌ [AdminDashboard] Error fetching admin data:', error);
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
        title: newProblem.title,
        description: newProblem.description,
        difficulty: newProblem.difficulty,
        tags: newProblem.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        companies: newProblem.companies.split(',').map(company => company.trim()).filter(company => company),
        constraints: newProblem.constraints,
        examples: newProblem.examples.filter(ex => ex.input && ex.output),
        testCases: newProblem.testCases.filter(tc => tc.input && tc.output),
        codeTemplates: newProblem.codeTemplates,
        functionSignature: newProblem.functionSignature,
        timeLimit: newProblem.timeLimit,
        memoryLimit: newProblem.memoryLimit,
        isPublished: newProblem.isPublished,
        isFeatured: newProblem.isFeatured,
        editorial: newProblem.editorial.written ? newProblem.editorial : undefined
      };

      console.log('📤 Sending problem data:', problemData);

      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No authentication token');
        alert('Please login again.');
        return;
      }

      const response = await axios.post(`${API_URL}/problems`, problemData, {
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
        companies: '',
        constraints: '',
        examples: [{ input: '', output: '', explanation: '' }],
        testCases: [{ input: '', output: '', isPublic: true }],
        codeTemplates: {
          cpp: '',
          java: '',
          python: '',
          c: ''
        },
        functionSignature: {
          cpp: '',
          java: '',
          python: '',
          c: ''
        },
        timeLimit: 2000,
        memoryLimit: 256,
        isPublished: false,
        isFeatured: false,
        editorial: {
          written: '',
          videoUrl: '',
          thumbnailUrl: '',
          duration: 0
        }
      });
      showNotification('success', 'Problem created successfully!');
    } catch (error: any) {
      console.error('❌ Admin: Error creating problem:', error);
      console.error('📊 Error response:', error.response?.data);

      if (error.response?.status === 401) {
        showNotification('error', 'Authentication failed. Please logout and login again.');
      } else {
        showNotification('error', `Failed to create problem: ${error.response?.data?.message || error.message}`);
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

      const response = await axios.post(`${API_URL}/contests`, newContest, {
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
        bannerImage: '',
        startTime: '',
        endTime: '',
        duration: 60,
        isPublic: true,
        password: '',
        leaderboardVisible: true,
        freezeTime: 0,
        rules: '',
        allowedLanguages: ['cpp', 'python', 'java', 'c']
      });
      showNotification('success', 'Contest created successfully!');
    } catch (error: any) {
      console.error('❌ Admin: Error creating contest:', error);
      console.error('📊 Error response:', error.response?.data);

      if (error.response?.status === 401) {
        showNotification('error', 'Authentication failed. Please logout and login again.');
      } else {
        showNotification('error', `Failed to create contest: ${error.response?.data?.message || error.message}`);
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
      const announcementData = {
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        type: newAnnouncement.type,
        priority: newAnnouncement.priority,
        tags: newAnnouncement.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        imageUrl: newAnnouncement.imageUrl,
        link: newAnnouncement.link,
        expiresAt: newAnnouncement.expiresAt ? new Date(newAnnouncement.expiresAt) : null,
        visibleToRoles: newAnnouncement.visibleToRoles,
        pinned: newAnnouncement.pinned
      };

      console.log('📤 Sending announcement data:', announcementData);

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

      const response = await axios.post(`${API_URL}/announcements`, announcementData, {
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
        priority: 'medium',
        tags: '',
        imageUrl: '',
        link: '',
        expiresAt: '',
        visibleToRoles: ['user'],
        pinned: false
      });
      showNotification('success', 'Announcement created successfully!');
    } catch (error: any) {
      console.error('❌ Admin: Error creating announcement:', error);
      console.error('📊 Error response:', error.response?.data);
      console.error('📊 Error status:', error.response?.status);
      console.error('📊 Error headers:', error.response?.headers);

      if (error.response?.status === 401) {
        console.error('🔒 Authentication failed - token may be invalid');
        showNotification('error', 'Authentication failed. Please logout and login again.');
      } else {
        showNotification('error', `Failed to create announcement: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncementId(announcement._id);
    setEditAnnouncementData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      priority: announcement.priority,
      // Add other fields as needed
    });
  };

  const handleUpdateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnnouncementId) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_URL}/announcements/${editingAnnouncementId}`,
        editAnnouncementData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      setAnnouncements(
        announcements.map(a =>
          a._id === editingAnnouncementId ? response.data : a
        )
      );
      setEditingAnnouncementId(null);
      setEditAnnouncementData(null);
      showNotification('success', 'Announcement updated!');
    } catch (error: any) {
      showNotification('error', 'Failed to update announcement.');
    }
  };

  const handleDeleteProblem = async (problemId: string) => {
    console.log('🗑️ Admin: Deleting problem:', problemId);
    if (!confirm('Are you sure you want to delete this problem?')) return;

    try {
      await axios.delete(`${API_URL}/problems/${problemId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      console.log('✅ Problem deleted successfully');
      setProblems(problems.filter(p => p._id !== problemId));
      showNotification('success', 'Problem deleted successfully!');
    } catch (error) {
      console.error('❌ Error deleting problem:', error);
      showNotification('error', 'Failed to delete problem.');
    }
  };

  const handleDeleteContest = async (contestId: string) => {
    console.log('🗑️ Admin: Deleting contest:', contestId);
    if (!confirm('Are you sure you want to delete this contest?')) return;

    try {
      await axios.delete(`${API_URL}/contests/${contestId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      console.log('✅ Contest deleted successfully');
      setContests(contests.filter(c => c._id !== contestId));
      showNotification('success', 'Contest deleted successfully!');
    } catch (error) {
      console.error('❌ Error deleting contest:', error);
      showNotification('error', 'Failed to delete contest.');
    }
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    console.log('🗑️ Admin: Deleting announcement:', announcementId);
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      await axios.delete(`${API_URL}/announcements/${announcementId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      console.log('✅ Announcement deleted successfully');
      setAnnouncements(announcements.filter(a => a._id !== announcementId));
      showNotification('success', 'Announcement deleted successfully!');
    } catch (error) {
      console.error('❌ Error deleting announcement:', error);
      showNotification('error', 'Failed to delete announcement.');
    }
  };

  const handleDeleteDiscussion = async (discussionId: string) => {
  console.log('🗑️ Admin: Deleting discussion:', discussionId);
  if (!confirm('Are you sure you want to delete this discussion?')) return;

  try {
    await axios.delete(`${API_URL}/discussion/${discussionId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    console.log('✅ Discussion deleted successfully');
    setDiscussions(discussions.filter(d => d._id !== discussionId));
    showNotification('success', 'Discussion deleted successfully!');
  } catch (error) {
    console.error('❌ Error deleting discussion:', error);
    showNotification('error', 'Failed to delete discussion.');
  }
};

  const stats = [
    {
      title: 'Total Problems',
      value: problems.length,
      icon: <Code className="h-8 w-8 text-blue-600" />,
      color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
    },
    {
      title: 'Active Contests',
      value: contests.filter(c => c.status === 'ongoing').length,
      icon: <Trophy className="h-8 w-8 text-yellow-600" />,
      color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
    },
    {
      title: 'Discussions',
      value: discussions.length,
      icon: <MessageSquare className="h-8 w-8 text-green-600" />,
      color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    },
    {
      title: 'Announcements',
      value: announcements.length,
      icon: <Megaphone className="h-8 w-8 text-purple-600" />,
      color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
    }
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Settings className="h-4 w-4" /> },
    { id: 'users', label: 'Users', icon: <Users className="h-4 w-4" /> },
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
    <div className={`min-h-screen transition-colors duration-300 relative ${
      isDark
        ? "bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900"
        : "bg-gradient-to-br from-gray-50 via-white to-gray-100"
    }`}>
      {/* Animated Background - same as Game.tsx */}
      {isDark && (
        <>
          <style>{`
            @keyframes gaming-pulse {
              0%, 100% {
                transform: translateX(0px) translateY(0px) scale(1) rotate(0deg);
                opacity: 0.7;
              }
              25% {
                transform: translateX(25px) translateY(-15px) scale(1.1) rotate(90deg);
                opacity: 1;
              }
              50% {
                transform: translateX(-10px) translateY(20px) scale(0.9) rotate(180deg);
                opacity: 0.8;
              }
              75% {
                transform: translateX(35px) translateY(5px) scale(1.05) rotate(270deg);
                opacity: 0.9;
              }
            }
            @keyframes neon-glow {
              0%, 100% { 
                box-shadow: 0 0 5px rgba(34, 197, 94, 0.5), 0 0 10px rgba(34, 197, 94, 0.3), 0 0 15px rgba(34, 197, 94, 0.1);
                opacity: 0.6; 
              }
              50% { 
                box-shadow: 0 0 10px rgba(34, 197, 94, 0.8), 0 0 20px rgba(34, 197, 94, 0.6), 0 0 30px rgba(34, 197, 94, 0.4);
                opacity: 1; 
              }
            }
            @keyframes digital-rain {
              0% { transform: translateY(-100px) translateX(0px) rotate(0deg); opacity: 0; }
              10% { opacity: 0.8; }
              90% { opacity: 0.8; }
              100% { transform: translateY(100vh) translateX(20px) rotate(360deg); opacity: 0; }
            }
            @keyframes cyber-orbit {
              0% { transform: rotate(0deg) translateX(100px) rotate(0deg); }
              100% { transform: rotate(360deg) translateX(100px) rotate(-360deg); }
            }
            @keyframes gaming-nebula {
              0%, 100% { 
                transform: scale(1) rotate(0deg);
                background: linear-gradient(45deg, rgba(34, 197, 94, 0.1), rgba(59, 130, 246, 0.1));
              }
              33% { 
                transform: scale(1.1) rotate(120deg);
                background: linear-gradient(45deg, rgba(147, 51, 234, 0.1), rgba(34, 197, 94, 0.1));
              }
              66% { 
                transform: scale(0.9) rotate(240deg);
                background: linear-gradient(45deg, rgba(239, 68, 68, 0.1), rgba(147, 51, 234, 0.1));
              }
            }
            .gaming-pulse {
              animation: gaming-pulse 6s ease-in-out infinite;
            }
            .neon-glow {
              animation: neon-glow 2s ease-in-out infinite;
            }
            .digital-rain {
              animation: digital-rain 8s linear infinite;
            }
            .cyber-orbit {
              animation: cyber-orbit 20s linear infinite;
            }
            .gaming-nebula {
              animation: gaming-nebula 12s ease-in-out infinite;
            }
          `}</style>
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute top-1/4 left-1/5 w-96 h-96 gaming-nebula rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/3 right-1/4 w-80 h-80 gaming-nebula rounded-full blur-3xl" style={{ animationDelay: '4s' }}></div>
            <div className="absolute top-2/3 left-1/3 w-64 h-64 gaming-nebula rounded-full blur-2xl" style={{ animationDelay: '8s' }}></div>
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={`neon-particle-admin-${i}`}
                className={`neon-glow absolute ${
                  i % 6 === 0 ? 'w-2 h-2 bg-green-400 rounded-full' :
                  i % 6 === 1 ? 'w-1.5 h-1.5 bg-blue-400 rounded-full' :
                  i % 6 === 2 ? 'w-2 h-2 bg-purple-400 rounded-full' :
                  i % 6 === 3 ? 'w-1 h-1 bg-cyan-400 rounded-full' :
                  i % 6 === 4 ? 'w-1.5 h-1.5 bg-pink-400 rounded-full' :
                  'w-2 h-2 bg-red-400 rounded-full'
                }`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 1}s`,
                }}
              />
            ))}
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={`digital-rain-admin-${i}`}
                className={`digital-rain absolute w-1 h-8 ${
                  i % 4 === 0 ? 'bg-gradient-to-b from-green-400 to-transparent' :
                  i % 4 === 1 ? 'bg-gradient-to-b from-blue-400 to-transparent' :
                  i % 4 === 2 ? 'bg-gradient-to-b from-purple-400 to-transparent' :
                  'bg-gradient-to-b from-cyan-400 to-transparent'
                }`}
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 8}s`,
                  animationDuration: `${8 + Math.random() * 4}s`,
                }}
              />
            ))}
            <div className="absolute top-1/4 left-1/4 w-4 h-4">
              <div className="cyber-orbit w-2 h-2 bg-green-400 rounded-full neon-glow"></div>
            </div>
            <div className="absolute top-3/4 right-1/3 w-4 h-4">
              <div className="cyber-orbit w-2 h-2 bg-blue-400 rounded-full neon-glow" style={{ animationDelay: '5s' }}></div>
            </div>
            <div className="absolute top-1/2 left-2/3 w-4 h-4">
              <div className="cyber-orbit w-2 h-2 bg-purple-400 rounded-full neon-glow" style={{ animationDelay: '10s' }}></div>
            </div>
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={`gaming-pulse-admin-${i}`}
                className={`gaming-pulse absolute ${
                  i % 4 === 0 ? 'w-4 h-4 bg-gradient-to-br from-green-500/40 to-blue-500/40' :
                  i % 4 === 1 ? 'w-3 h-3 bg-gradient-to-br from-purple-500/40 to-pink-500/40' :
                  i % 4 === 2 ? 'w-3.5 h-3.5 bg-gradient-to-br from-cyan-500/40 to-green-500/40' :
                  'w-4 h-4 bg-gradient-to-br from-red-500/40 to-orange-500/40'
                } rounded-full blur-sm`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDuration: `${6 + Math.random() * 3}s`,
                  animationDelay: `${Math.random() * 6}s`,
                }}
              />
            ))}
          </div>
        </>
      )}
      {!isDark && (
        <>
          <style>{`
            @keyframes light-gaming-float {
              0%, 100% {
                transform: translateY(0px) translateX(0px) rotate(0deg);
                opacity: 0.5;
              }
              25% {
                transform: translateY(-12px) translateX(18px) rotate(90deg);
                opacity: 0.8;
              }
              50% {
                transform: translateY(8px) translateX(-10px) rotate(180deg);
                opacity: 1;
              }
              75% {
                transform: translateY(-18px) translateX(25px) rotate(270deg);
                opacity: 0.6;
              }
            }
            @keyframes pastel-glow {
              0%, 100% { 
                box-shadow: 0 0 8px rgba(59, 130, 246, 0.3), 0 0 16px rgba(147, 51, 234, 0.2);
                opacity: 0.6; 
              }
              50% { 
                box-shadow: 0 0 16px rgba(59, 130, 246, 0.5), 0 0 32px rgba(147, 51, 234, 0.4);
                opacity: 1; 
              }
            }
            @keyframes light-pixel-fall {
              0% { transform: translateY(-50px) translateX(0px) rotate(0deg); opacity: 0; }
              10% { opacity: 0.7; }
              90% { opacity: 0.7; }
              100% { transform: translateY(100vh) translateX(30px) rotate(360deg); opacity: 0; }
            }
            @keyframes gaming-aurora {
              0%, 100% { 
                background: linear-gradient(45deg, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.15));
                transform: scale(1) rotate(0deg);
              }
              33% { 
                background: linear-gradient(45deg, rgba(34, 197, 94, 0.15), rgba(59, 130, 246, 0.15));
                transform: scale(1.05) rotate(120deg);
              }
              66% { 
                background: linear-gradient(45deg, rgba(251, 191, 36, 0.15), rgba(34, 197, 94, 0.15));
                transform: scale(0.95) rotate(240deg);
              }
            }
            .light-gaming-float {
              animation: light-gaming-float 5s ease-in-out infinite;
            }
            .pastel-glow {
              animation: pastel-glow 2.5s ease-in-out infinite;
            }
            .light-pixel-fall {
              animation: light-pixel-fall 7s linear infinite;
            }
            .gaming-aurora {
              animation: gaming-aurora 10s ease-in-out infinite;
            }
          `}</style>
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute top-1/5 left-1/3 w-96 h-96 gaming-aurora rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 right-1/5 w-80 h-80 gaming-aurora rounded-full blur-3xl" style={{ animationDelay: '3s' }}></div>
            <div className="absolute top-2/3 left-1/6 w-64 h-64 gaming-aurora rounded-full blur-2xl" style={{ animationDelay: '7s' }}></div>
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={`pastel-particle-admin-${i}`}
                className={`pastel-glow absolute ${
                  i % 6 === 0 ? 'w-2 h-2 bg-blue-400/70 rounded-full' :
                  i % 6 === 1 ? 'w-1.5 h-1.5 bg-purple-400/70 rounded-full' :
                  i % 6 === 2 ? 'w-2 h-2 bg-green-400/70 rounded-full' :
                  i % 6 === 3 ? 'w-1 h-1 bg-pink-400/70 rounded-full' :
                  i % 6 === 4 ? 'w-1.5 h-1.5 bg-cyan-400/70 rounded-full' :
                  'w-2 h-2 bg-yellow-400/70 rounded-full'
                }`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2.5}s`,
                  animationDuration: `${2.5 + Math.random() * 1}s`,
                }}
              />
            ))}
            {Array.from({ length: 18 }).map((_, i) => (
              <div
                key={`pixel-fall-admin-${i}`}
                className={`light-pixel-fall absolute w-1 h-1 ${
                  i % 5 === 0 ? 'bg-blue-300/60' :
                  i % 5 === 1 ? 'bg-purple-300/60' :
                  i % 5 === 2 ? 'bg-green-300/60' :
                  i % 5 === 3 ? 'bg-pink-300/60' : 'bg-cyan-300/60'
                } rounded-full`}
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 7}s`,
                  animationDuration: `${7 + Math.random() * 3}s`,
                }}
              />
            ))}
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={`light-gaming-admin-${i}`}
                className={`light-gaming-float absolute ${
                  i % 4 === 0 ? 'w-3 h-3 bg-gradient-to-br from-blue-200/50 to-purple-200/50' :
                  i % 4 === 1 ? 'w-2.5 h-2.5 bg-gradient-to-br from-green-200/50 to-cyan-200/50' :
                  i % 4 === 2 ? 'w-3 h-3 bg-gradient-to-br from-pink-200/50 to-red-200/50' :
                  'w-2.5 h-2.5 bg-gradient-to-br from-yellow-200/50 to-orange-200/50'
                } rounded-full blur-sm`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDuration: `${5 + Math.random() * 2}s`,
                  animationDelay: `${Math.random() * 5}s`,
                }}
              />
            ))}
          </div>
        </>
      )}
      <div className="relative z-10">
        {/* Notification */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
            notification.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
            'bg-blue-100 text-blue-800 border border-blue-200'
          }`}>
            <p className="font-medium">{notification.message}</p>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
            <p className="text-gray-600">Manage your platform content and settings</p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className={`p-6 rounded-lg border ${stat.color} transition-transform duration-200 hover:scale-105 hover:shadow-lg`}
                // ↑ Added scaling and shadow on hover
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
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

              {activeTab === 'users' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold">Manage Users</h3>
                    <button 
                      onClick={() => setShowCreateUser(true)}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add User
                    </button>
                  </div>

                  {showCreateUser && (
                    <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg max-w-lg">
                      <h4 className="text-lg font-semibold mb-4">Create New User</h4>
                      <form onSubmit={handleCreateUser} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Username *</label>
                          <input
                            type="text"
                            required
                            value={newUser.username}
                            onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Email *</label>
                          <input
                            type="email"
                            required
                            value={newUser.email}
                            onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Password *</label>
                          <input
                            type="password"
                            required
                            value={newUser.password}
                            onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Role</label>
                          <select
                            value={newUser.role}
                            onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        <div className="flex space-x-4">
                          <button
                            type="submit"
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                          >
                            Create User
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCreateUser(false)}
                            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {editingUserId && (
                    <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg max-w-lg">
                      <h4 className="text-lg font-semibold mb-4">Edit User</h4>
                      <form onSubmit={handleUpdateUser} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Username *</label>
                          <input
                            type="text"
                            required
                            value={editUserData?.username || ''}
                            onChange={e => setEditUserData({ ...editUserData, username: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Email *</label>
                          <input
                            type="email"
                            required
                            value={editUserData?.email || ''}
                            onChange={e => setEditUserData({ ...editUserData, email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Role</label>
                          <select
                            value={editUserData?.role || 'user'}
                            onChange={e => setEditUserData({ ...editUserData, role: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        <div className="flex space-x-4">
                          <button
                            type="submit"
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                          >
                            Update User
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditingUserId(null); setEditUserData(null); }}
                            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] border border-gray-300 bg-white dark:bg-gray-900">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {users.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-gray-400">No users found.</td>
                          </tr>
                        ) : (
                          users.map((user) => {
                            // Safe display helpers
                            const displayName =
                              (typeof user.username === 'string' && user.username.trim()) ? user.username :
                              (user.profile && typeof user.profile.firstName === 'string' && user.profile.firstName.trim() ? user.profile.firstName : '') +
                              (user.profile && typeof user.profile.lastName === 'string' && user.profile.lastName.trim() ? ` ${user.profile.lastName}` : '') || 'N/A';
                            const displayEmail = (typeof user.email === 'string' && user.email.trim()) ? user.email : 'N/A';
                            const displayRole = (typeof user.role === 'string' && user.role.trim()) ? user.role : 'user';
                            let displayCreated = 'N/A';
                            if (user.createdAt) {
                              try {
                                displayCreated = new Date(user.createdAt).toLocaleDateString();
                              } catch {
                                displayCreated = 'N/A';
                              }
                            }
                            return (
                              <tr key={user._id}>
                                <td className="px-6 py-4 whitespace-nowrap font-medium">{displayName}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{displayEmail}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{displayRole}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{displayCreated}</td>
                                <td className="px-6 py-4 whitespace-nowrap flex space-x-2">
                                  <button
                                    onClick={() => handleEditUser(user)}
                                    className="p-2 rounded-md bg-yellow-100 hover:bg-yellow-200 text-yellow-700"
                                    title="Edit"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(user._id)}
                                    className="p-2 rounded-md bg-red-100 hover:bg-red-200 text-red-700"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
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
                    <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg max-h-96 overflow-y-auto">
                      <h4 className="text-lg font-semibold mb-4">Create New Problem</h4>
                      <form onSubmit={handleCreateProblem} className="space-y-4">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Title *</label>
                            <input
                              type="text"
                              required
                              value={newProblem.title}
                              onChange={(e) => setNewProblem({...newProblem, title: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Difficulty *</label>
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
                          <label className="block text-sm font-medium mb-2">Description *</label>
                          <textarea
                            required
                            rows={4}
                            value={newProblem.description}
                            onChange={(e) => setNewProblem({...newProblem, description: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            placeholder="Describe the problem..."
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
                            <label className="block text-sm font-medium mb-2">Companies (comma-separated)</label>
                            <input
                              type="text"
                              value={newProblem.companies}
                              onChange={(e) => setNewProblem({...newProblem, companies: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                              placeholder="Google, Microsoft, Amazon"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Constraints *</label>
                          <textarea
                            required
                            rows={2}
                            value={newProblem.constraints}
                            onChange={(e) => setNewProblem({...newProblem, constraints: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            placeholder="1 <= n <= 10^4"
                          />
                        </div>

                        {/* Limits and Settings */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Time Limit (ms)</label>
                            <input
                              type="number"
                              value={newProblem.timeLimit}
                              onChange={(e) => setNewProblem({...newProblem, timeLimit: parseInt(e.target.value) || 2000})}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Memory Limit (MB)</label>
                            <input
                              type="number"
                              value={newProblem.memoryLimit}
                              onChange={(e) => setNewProblem({...newProblem, memoryLimit: parseInt(e.target.value) || 256})}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex items-center space-x-4 pt-6">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={newProblem.isPublished}
                                onChange={(e) => setNewProblem({...newProblem, isPublished: e.target.checked})}
                                className="mr-2"
                              />
                              Published
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={newProblem.isFeatured}
                                onChange={(e) => setNewProblem({...newProblem, isFeatured: e.target.checked})}
                                className="mr-2"
                              />
                              Featured
                            </label>
                          </div>
                        </div>

                        {/* Example */}
                        <div>
                          <label className="block text-sm font-medium mb-2">Example (first one)</label>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <input
                              type="text"
                              placeholder="Input"
                              value={newProblem.examples[0]?.input || ''}
                              onChange={(e) => {
                                const examples = [...newProblem.examples];
                                examples[0] = { ...examples[0], input: e.target.value };
                                setNewProblem({...newProblem, examples});
                              }}
                              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                              type="text"
                              placeholder="Output"
                              value={newProblem.examples[0]?.output || ''}
                              onChange={(e) => {
                                const examples = [...newProblem.examples];
                                examples[0] = { ...examples[0], output: e.target.value };
                                setNewProblem({...newProblem, examples});
                              }}
                              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                              type="text"
                              placeholder="Explanation"
                              value={newProblem.examples[0]?.explanation || ''}
                              onChange={(e) => {
                                const examples = [...newProblem.examples];
                                examples[0] = { ...examples[0], explanation: e.target.value };
                                setNewProblem({...newProblem, examples});
                              }}
                              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        {/* Test Case */}
                        <div>
                          <label className="block text-sm font-medium mb-2">Test Case (first one)</label>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <input
                              type="text"
                              placeholder="Input"
                              value={newProblem.testCases[0]?.input || ''}
                              onChange={(e) => {
                                const testCases = [...newProblem.testCases];
                                testCases[0] = { ...testCases[0], input: e.target.value };
                                setNewProblem({...newProblem, testCases});
                              }}
                              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                              type="text"
                              placeholder="Output"
                              value={newProblem.testCases[0]?.output || ''}
                              onChange={(e) => {
                                const testCases = [...newProblem.testCases];
                                testCases[0] = { ...testCases[0], output: e.target.value };
                                setNewProblem({...newProblem, testCases});
                              }}
                              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={newProblem.testCases[0]?.isPublic || false}
                                onChange={(e) => {
                                  const testCases = [...newProblem.testCases];
                                  testCases[0] = { ...testCases[0], isPublic: e.target.checked };
                                  setNewProblem({...newProblem, testCases});
                                }}
                                className="mr-2"
                              />
                              Public
                            </label>
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
                                {/* <button className="text-blue-600 hover:text-blue-900">
                                  <Edit className="h-4 w-4" />
                                </button> */}
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
                            <label className="block text-sm font-medium mb-2">Contest Name *</label>
                            <input
                              type="text"
                              required
                              value={newContest.name}
                              onChange={(e) => setNewContest({...newContest, name: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Duration (minutes) *</label>
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
                          <label className="block text-sm font-medium mb-2">Description *</label>
                          <textarea
                            required
                            rows={3}
                            value={newContest.description}
                            onChange={(e) => setNewContest({...newContest, description: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            placeholder="Contest description..."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Banner Image URL</label>
                          <input
                            type="url"
                            value={newContest.bannerImage}
                            onChange={(e) => setNewContest({...newContest, bannerImage: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            placeholder="https://example.com/banner.jpg"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Start Time *</label>
                            <input
                              type="datetime-local"
                              required
                              value={newContest.startTime}
                              onChange={(e) => setNewContest({...newContest, startTime: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">End Time *</label>
                            <input
                              type="datetime-local"
                              required
                              value={newContest.endTime}
                              onChange={(e) => setNewContest({...newContest, endTime: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Freeze Time (minutes before end)</label>
                            <input
                              type="number"
                              value={newContest.freezeTime}
                              onChange={(e) => setNewContest({...newContest, freezeTime: parseInt(e.target.value) || 0})}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Password (for private contest)</label>
                            <input
                              type="text"
                              value={newContest.password}
                              onChange={(e) => setNewContest({...newContest, password: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                              placeholder="Leave empty for public contest"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Rules (Markdown supported)</label>
                          <textarea
                            rows={3}
                            value={newContest.rules}
                            onChange={(e) => setNewContest({...newContest, rules: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            placeholder="Contest rules and guidelines..."
                          />
                        </div>

                        <div className="flex items-center space-x-4">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={newContest.isPublic}
                              onChange={(e) => setNewContest({...newContest, isPublic: e.target.checked})}
                              className="mr-2"
                            />
                            Public Contest
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={newContest.leaderboardVisible}
                              onChange={(e) => setNewContest({...newContest, leaderboardVisible: e.target.checked})}
                              className="mr-2"
                            />
                            Show Leaderboard
                          </label>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Allowed Languages</label>
                          <div className="flex flex-wrap gap-3">
                            {['cpp', 'java', 'python', 'c'].map((lang) => (
                              <label key={lang} className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={newContest.allowedLanguages.includes(lang)}
                                  onChange={(e) => {
                                    const languages = e.target.checked 
                                      ? [...newContest.allowedLanguages, lang]
                                      : newContest.allowedLanguages.filter(l => l !== lang);
                                    setNewContest({...newContest, allowedLanguages: languages});
                                  }}
                                  className="mr-1"
                                />
                                {lang.toUpperCase()}
                              </label>
                            ))}
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
                            {/* <button className="text-blue-600 hover:text-blue-900">
                              <Edit className="h-4 w-4" />
                            </button> */}
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
                          <label className="block text-sm font-medium mb-2">Title *</label>
                          <input
                            type="text"
                            required
                            value={newAnnouncement.title}
                            onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Content *</label>
                          <textarea
                            required
                            rows={4}
                            value={newAnnouncement.content}
                            onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            placeholder="Announcement content (supports Markdown)"
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
                            <input
                              type="text"
                              value={newAnnouncement.tags}
                              onChange={(e) => setNewAnnouncement({...newAnnouncement, tags: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                              placeholder="urgent, feature, contest"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Image URL</label>
                            <input
                              type="url"
                              value={newAnnouncement.imageUrl}
                              onChange={(e) => setNewAnnouncement({...newAnnouncement, imageUrl: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                              placeholder="https://example.com/image.jpg"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Link URL</label>
                            <input
                              type="url"
                              value={newAnnouncement.link}
                              onChange={(e) => setNewAnnouncement({...newAnnouncement, link: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                              placeholder="https://example.com/more-info"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Expires At</label>
                            <input
                              type="datetime-local"
                              value={newAnnouncement.expiresAt}
                              onChange={(e) => setNewAnnouncement({...newAnnouncement, expiresAt: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={newAnnouncement.pinned}
                              onChange={(e) => setNewAnnouncement({...newAnnouncement, pinned: e.target.checked})}
                              className="mr-2"
                            />
                            Pin to top
                          </label>
                          <div>
                            <label className="block text-sm font-medium mb-2">Visible to roles</label>
                            <div className="flex space-x-4">
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={newAnnouncement.visibleToRoles.includes('user')}
                                  onChange={(e) => {
                                    const roles = e.target.checked 
                                      ? [...newAnnouncement.visibleToRoles, 'user'].filter((v, i, a) => a.indexOf(v) === i)
                                      : newAnnouncement.visibleToRoles.filter(r => r !== 'user');
                                    setNewAnnouncement({...newAnnouncement, visibleToRoles: roles});
                                  }}
                                  className="mr-1"
                                />
                                Users
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={newAnnouncement.visibleToRoles.includes('admin')}
                                  onChange={(e) => {
                                    const roles = e.target.checked 
                                      ? [...newAnnouncement.visibleToRoles, 'admin'].filter((v, i, a) => a.indexOf(v) === i)
                                      : newAnnouncement.visibleToRoles.filter(r => r !== 'admin');
                                    setNewAnnouncement({...newAnnouncement, visibleToRoles: roles});
                                  }}
                                  className="mr-1"
                                />
                                Admins
                              </label>
                            </div>
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

                  {/* Edit Announcement Form */}
                  {editingAnnouncementId && editAnnouncementData && (
                    <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="text-lg font-semibold mb-4">Edit Announcement</h4>
                      <form onSubmit={handleUpdateAnnouncement} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Title *</label>
                          <input
                            type="text"
                            required
                            value={editAnnouncementData.title}
                            onChange={e => setEditAnnouncementData({ ...editAnnouncementData, title: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Content *</label>
                          <textarea
                            required
                            rows={4}
                            value={editAnnouncementData.content}
                            onChange={e => setEditAnnouncementData({ ...editAnnouncementData, content: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            placeholder="Announcement content (supports Markdown)"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Type</label>
                            <select
                              value={editAnnouncementData.type}
                              onChange={e => setEditAnnouncementData({ ...editAnnouncementData, type: e.target.value })}
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
                              value={editAnnouncementData.priority}
                              onChange={e => setEditAnnouncementData({ ...editAnnouncementData, priority: e.target.value })}
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
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                          >
                            Update Announcement
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditingAnnouncementId(null); setEditAnnouncementData(null); }}
                            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {announcements.map((announcement) => (
                      <div
                        key={announcement._id}
                        className="group relative p-4 border border-gray-200 rounded-lg bg-white shadow-sm transition-all duration-200
                          hover:shadow-lg hover:scale-[1.03] hover:border-blue-400"
                        style={{ minHeight: 140, maxHeight: 180, overflow: "hidden" }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-base truncate">{announcement.title}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            announcement.priority === 'high' ? 'bg-red-100 text-red-800' :
                            announcement.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {announcement.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-3">
                          {announcement.content.length > 120
                            ? `${announcement.content.substring(0, 120)}...`
                            : announcement.content}
                        </p>
                        <p className="text-xs text-gray-500 mb-2">{new Date(announcement.createdAt).toLocaleDateString()}</p>
                        <div className="absolute top-2 right-2 flex space-x-2 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            className="text-blue-600 hover:text-blue-800 bg-white rounded-full p-1 shadow-sm border border-blue-100 hover:border-blue-400 transition-colors"
                            title="Edit"
                            onClick={() => handleEditAnnouncement(announcement)}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteAnnouncement(announcement._id)}
                            className="text-red-600 hover:text-red-800 bg-white rounded-full p-1 shadow-sm border border-red-100 hover:border-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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
    </div>
  );
};

export default AdminDashboard
