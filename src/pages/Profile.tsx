import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { User, Github, Linkedin, Trophy, Code, TrendingUp, Calendar, Award, Star, Target, Zap, BookOpen, Activity, Clock, CheckCircle } from 'lucide-react';

interface UserProfile {
  _id: string;
  username: string;
  email: string;
  role: string;
  profile: {
    firstName: string;
    lastName: string;
    linkedIn: string;
    github: string;
    avatar: string;
    bio: string;
    location: string;
    college: string;
    branch: string;
    graduationYear: number;
  };
  stats: {
    problemsSolved: {
      total: number;
      easy: number;
      medium: number;
      hard: number;
    };
    problemsAttempted: number;
    totalSubmissions: number;
    correctSubmissions: number;
    accuracy: number;
    currentStreak: number;
    maxStreak: number;
    lastSubmissionDate: string;
  };
  ratings: {
    gameRating: number;
    contestRating: number;
    globalRank: number;
    percentile: number;
  };
  topicProgress: {
    topic: string;
    solved: number;
    total: number;
  }[];
  solvedProblems: {
    _id: string;
    title: string;
    difficulty: string;
  }[];
  gameHistory: {
    opponent: {
      username: string;
    };
    result: string;
    ratingChange: number;
    problem: {
      title: string;
      difficulty: string;
    };
    date: string;
  }[];
  contestHistory: {
    contest: {
      name: string;
    };
    rank: number;
    score: number;
    ratingChange: number;
    date: string;
  }[];
  submissions: {
    problem: string;
    status: string;
    language: string;
    runtime: number;
    memory: number;
    date: string;
  }[];
  recentActivities: {
    type: string;
    date: string;
    message: string;
  }[];
}

const Profile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    linkedIn: '',
    github: '',
    bio: '',
    location: '',
    college: '',
    branch: '',
    graduationYear: ''
  });

  useEffect(() => {
    if (username) {
      console.log('🔍 Profile component: Fetching profile for username:', username);
      fetchProfile();
    }
  }, [username]);

  const fetchProfile = async () => {
    console.log('📡 Fetching profile for username:', username);
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`http://localhost:5000/api/profile/${username}`);
      console.log('✅ Profile data received:', response.data);
      
      const profileData = response.data;
      
      // Ensure all required fields exist with defaults
      const normalizedProfile: UserProfile = {
        _id: profileData._id || '',
        username: profileData.username || '',
        email: profileData.email || '',
        role: profileData.role || 'user',
        profile: {
          firstName: profileData.profile?.firstName || '',
          lastName: profileData.profile?.lastName || '',
          linkedIn: profileData.profile?.linkedIn || '',
          github: profileData.profile?.github || '',
          avatar: profileData.profile?.avatar || '',
          bio: profileData.profile?.bio || '',
          location: profileData.profile?.location || '',
          college: profileData.profile?.college || '',
          branch: profileData.profile?.branch || '',
          graduationYear: profileData.profile?.graduationYear || 0
        },
        stats: {
          problemsSolved: {
            total: profileData.stats?.problemsSolved?.total || 0,
            easy: profileData.stats?.problemsSolved?.easy || 0,
            medium: profileData.stats?.problemsSolved?.medium || 0,
            hard: profileData.stats?.problemsSolved?.hard || 0
          },
          problemsAttempted: profileData.stats?.problemsAttempted || 0,
          totalSubmissions: profileData.stats?.totalSubmissions || 0,
          correctSubmissions: profileData.stats?.correctSubmissions || 0,
          accuracy: profileData.stats?.accuracy || 0,
          currentStreak: profileData.stats?.currentStreak || 0,
          maxStreak: profileData.stats?.maxStreak || 0,
          lastSubmissionDate: profileData.stats?.lastSubmissionDate || ''
        },
        ratings: {
          gameRating: profileData.ratings?.gameRating || 1200,
          contestRating: profileData.ratings?.contestRating || 1200,
          globalRank: profileData.ratings?.globalRank || 0,
          percentile: profileData.ratings?.percentile || 0
        },
        topicProgress: profileData.topicProgress || [],
        solvedProblems: profileData.solvedProblems || [],
        gameHistory: profileData.gameHistory || [],
        contestHistory: profileData.contestHistory || [],
        submissions: profileData.submissions || [],
        recentActivities: profileData.recentActivities || []
      };
      
      setProfile(normalizedProfile);
      
      // Set edit form data
      setEditForm({
        firstName: normalizedProfile.profile.firstName,
        lastName: normalizedProfile.profile.lastName,
        linkedIn: normalizedProfile.profile.linkedIn,
        github: normalizedProfile.profile.github,
        bio: normalizedProfile.profile.bio,
        location: normalizedProfile.profile.location,
        college: normalizedProfile.profile.college,
        branch: normalizedProfile.profile.branch,
        graduationYear: normalizedProfile.profile.graduationYear.toString()
      });
      
      console.log('✅ Profile normalized and set successfully');
    } catch (error: any) {
      console.error('❌ Error fetching profile:', error);
      console.error('❌ Error response:', error.response?.data);
      setError(error.response?.data?.message || 'Failed to load profile');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.put('http://localhost:5000/api/profile/update', {
        profile: {
          ...editForm,
          graduationYear: editForm.graduationYear ? parseInt(editForm.graduationYear) : null
        }
      });
      setIsEditing(false);
      fetchProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'Hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'win': return 'text-green-600';
      case 'lose': return 'text-red-600';
      case 'draw': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'text-green-600 bg-green-100';
      case 'wrong': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Profile not found</h2>
          <p className="text-gray-600 mb-4">{error || 'The user you\'re looking for doesn\'t exist.'}</p>
          <button 
            onClick={fetchProfile}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const isOwnProfile = user?.username === profile.username;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="text-center mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="h-12 w-12 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{profile.username}</h1>
                {profile.profile.firstName && profile.profile.lastName && (
                  <p className="text-gray-600">{profile.profile.firstName} {profile.profile.lastName}</p>
                )}
                {profile.profile.bio && (
                  <p className="text-sm text-gray-500 mt-2">{profile.profile.bio}</p>
                )}
                {profile.profile.location && (
                  <p className="text-sm text-gray-500 mt-1">📍 {profile.profile.location}</p>
                )}
              </div>
              
              {isOwnProfile && (
                <div className="mb-6">
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    {isEditing ? 'Cancel' : 'Edit Profile'}
                  </button>
                </div>
              )}
              
              {isEditing ? (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={editForm.firstName}
                        onChange={(e) => setEditForm({...editForm, firstName: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={editForm.lastName}
                        onChange={(e) => setEditForm({...editForm, lastName: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bio
                    </label>
                    <textarea
                      value={editForm.bio}
                      onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      LinkedIn
                    </label>
                    <input
                      type="url"
                      value={editForm.linkedIn}
                      onChange={(e) => setEditForm({...editForm, linkedIn: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      GitHub
                    </label>
                    <input
                      type="url"
                      value={editForm.github}
                      onChange={(e) => setEditForm({...editForm, github: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition-colors"
                  >
                    Save Changes
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  {profile.profile.linkedIn && (
                    <a
                      href={profile.profile.linkedIn}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <Linkedin className="h-5 w-5 mr-2" />
                      LinkedIn Profile
                    </a>
                  )}
                  {profile.profile.github && (
                    <a
                      href={profile.profile.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-gray-800 hover:text-gray-600 transition-colors"
                    >
                      <Github className="h-5 w-5 mr-2" />
                      GitHub Profile
                    </a>
                  )}
                </div>
              )}
            </div>
            
            {/* Ratings */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ratings & Ranks</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Trophy className="h-5 w-5 text-yellow-600 mr-2" />
                    <span className="text-gray-700">Game Rating</span>
                  </div>
                  <span className="font-bold text-blue-600">{profile.ratings.gameRating}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Award className="h-5 w-5 text-purple-600 mr-2" />
                    <span className="text-gray-700">Contest Rating</span>
                  </div>
                  <span className="font-bold text-purple-600">{profile.ratings.contestRating}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-gray-700">Global Rank</span>
                  </div>
                  <span className="font-bold text-green-600">
                    {profile.ratings.globalRank || 'Unranked'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Star className="h-5 w-5 text-orange-600 mr-2" />
                    <span className="text-gray-700">Percentile</span>
                  </div>
                  <span className="font-bold text-orange-600">
                    {profile.ratings.percentile ? `${profile.ratings.percentile}%` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Statistics Overview */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Problem Solving Statistics</h3>
              
              {/* Main Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {profile.stats.problemsSolved.total}
                  </div>
                  <div className="text-sm text-gray-600">Total Solved</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {profile.stats.problemsSolved.easy}
                  </div>
                  <div className="text-sm text-gray-600">Easy</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600 mb-2">
                    {profile.stats.problemsSolved.medium}
                  </div>
                  <div className="text-sm text-gray-600">Medium</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    {profile.stats.problemsSolved.hard}
                  </div>
                  <div className="text-sm text-gray-600">Hard</div>
                </div>
              </div>
              
              {/* Additional Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-gray-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-2">
                    {profile.stats.totalSubmissions}
                  </div>
                  <div className="text-sm text-gray-600">Total Submissions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600 mb-2">
                    {profile.stats.correctSubmissions}
                  </div>
                  <div className="text-sm text-gray-600">Accepted</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-teal-600 mb-2">
                    {profile.stats.accuracy.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Accuracy</div>
                </div>
              </div>
              
              {/* Streak Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 mt-6 border-t border-gray-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 mb-2">
                    {profile.stats.currentStreak}
                  </div>
                  <div className="text-sm text-gray-600">Current Streak</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600 mb-2">
                    {profile.stats.maxStreak}
                  </div>
                  <div className="text-sm text-gray-600">Max Streak</div>
                </div>
              </div>
            </div>
            
            {/* Recent Activity */}
            {profile.recentActivities && profile.recentActivities.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {profile.recentActivities.slice(0, 5).map((activity, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div className="flex items-center">
                        <Activity className="h-4 w-4 text-blue-500 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                          <p className="text-xs text-gray-500">{activity.type}</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(activity.date).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Topic Progress */}
            {profile.topicProgress && profile.topicProgress.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Topic Progress</h3>
                <div className="space-y-4">
                  {profile.topicProgress.map((topic, index) => (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{topic.topic}</span>
                        <span className="text-gray-500">{topic.solved}/{topic.total}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(topic.solved / topic.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Recently Solved Problems */}
            {profile.solvedProblems && profile.solvedProblems.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recently Solved Problems</h3>
                <div className="space-y-2">
                  {profile.solvedProblems.slice(0, 10).map((problem, index) => (
                    <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-3" />
                        <span className="font-medium text-gray-900">{problem.title}</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(problem.difficulty)}`}>
                        {problem.difficulty}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Recent Submissions */}
            {profile.submissions && profile.submissions.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Submissions</h3>
                <div className="space-y-2">
                  {profile.submissions.slice(Math.max(0,profile.submissions.length-5),profile.submissions.length).reverse().map((submission, index) => (
                    <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <Code className="h-4 w-4 text-blue-500 mr-3" />
                        <div>
                          <span className="font-medium text-gray-900">{submission.language}</span>
                          <div className="text-xs text-gray-500">
                            {submission.runtime}ms • {submission.memory}MB
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(submission.status)}`}>
                          {submission.status}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(submission.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Game & Contest History */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Game History */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Games</h3>
                <div className="space-y-3">
                  {profile.gameHistory && profile.gameHistory.length > 0 ? (
                    profile.gameHistory.slice(0, 5).map((game, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
                        <div>
                          <div className="flex items-center">
                            <span className={`font-medium ${getResultColor(game.result)} mr-2`}>
                              {game.result.toUpperCase()}
                            </span>
                            <span className="text-sm text-gray-600">vs {game.opponent.username}</span>
                          </div>
                          <div className="text-xs text-gray-500">{game.problem.title}</div>
                        </div>
                        <div className="text-right">
                          <div className={`font-medium ${game.ratingChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {game.ratingChange >= 0 ? '+' : ''}{game.ratingChange}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(game.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No games played yet</p>
                  )}
                </div>
              </div>
              
              {/* Contest History */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contest History</h3>
                <div className="space-y-3">
                  {profile.contestHistory && profile.contestHistory.length > 0 ? (
                    profile.contestHistory.slice(0, 5).map((contest, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
                        <div>
                          <div className="font-medium text-gray-900">{contest.contest.name}</div>
                          <div className="text-sm text-gray-600">Rank #{contest.rank}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-blue-600">{contest.score} pts</div>
                          <div className="text-xs text-gray-500">
                            {new Date(contest.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No contests participated yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;