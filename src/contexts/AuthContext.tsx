import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';

interface User {
  id: string;
  _id?: string; // Add optional _id for MongoDB compatibility
  username: string;
  email: string;
  role: string;
  coins?: number; // Add coins field
  totalCoinsEarned?: number; // Add total coins earned field for future use
  profile?: {
    avatar?: string;
    firstName?: string;
    lastName?: string;
  }; 

  ratings?: {
    gameRating: number;
  };
  stats?: {
    problemsSolved?: {
      total: number;
      easy: number;
      medium: number;
      hard: number;
    };
    totalSubmissions?: number;
    accuracy?: number;
    currentStreak?: number;
    maxStreak?: number;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;  // ✅ Add token to the interface
  login: (username: string, password: string, role?: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateCoins: (newCoins: number) => void; // Add method to update coins directly
  setUser: (user: User | null) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  // Auto-login if token exists
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    console.log('🔄 Checking saved token:', savedToken ? `Present (${savedToken.length} chars)` : 'Not found');
    
    if (savedToken && savedToken.trim()) {
      setToken(savedToken);
      console.log('🔑 Setting token in state:', savedToken.substring(0, 20) + '...');
      
      axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${savedToken}` }
      })
      .then(res => {
        const user = res.data;
        const normalizedUser = {
          ...user,
          id: user.id || user._id,
          _id: user._id || user.id
        };
        setUser(normalizedUser);
        console.log('🔄 Auto-login successful with normalized user:', normalizedUser);
      })
      .catch((error) => {
        console.error('❌ Auto-login failed:', error.response?.data || error.message);
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
      })
      .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const res = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const user = res.data;
    // ✅ CRITICAL FIX: Normalize user object to have both id and _id consistently
    return { 
      ...user, 
      id: user.id || user._id,
      _id: user._id || user.id
    };
  };

  const refreshUser = async () => {
    try {
      const userData = await fetchUserProfile();
      if (userData) {
        setUser(userData);
      }
    } catch (error) {
      console.error('❌ Error refreshing user data:', error);
    }
  };

  const login = async (username: string, password: string, role: string = 'user') => {
    try {
      console.log('🔐 Login attempt:', { username, role });
      const response = await axios.post(`${API_URL}/auth/login`, {
        username,
        password,
        role
      });

      const { token: receivedToken, user } = response.data;
      console.log('✅ Login successful, user data:', user);
      console.log('🔑 Token received, length:', receivedToken?.length);
      console.log('🔑 Token preview:', receivedToken?.substring(0, 20) + '...');
      
      if (receivedToken && receivedToken.trim()) {
        localStorage.setItem('token', receivedToken);
        setToken(receivedToken);
        
        // Fetch complete user profile after login to ensure we have all data
        try {
          const profileResponse = await axios.get(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${receivedToken}` }
          });
          const completeUser = profileResponse.data;
          const normalizedUser = {
            ...completeUser,
            id: completeUser.id || completeUser._id,
            _id: completeUser._id || completeUser.id
          };
          setUser(normalizedUser);
          console.log('💾 Complete user profile set in context:', normalizedUser);
        } catch (profileError) {
          // Fallback to basic user data if profile fetch fails
          const normalizedUser = {
            ...user,
            id: user.id || user._id,
            _id: user._id || user.id
          };
          setUser(normalizedUser);
          console.log('💾 Basic user data set in context:', normalizedUser);
        }
      } else {
        throw new Error('Invalid token received from server');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'ERR_NETWORK') {
        throw new Error('Unable to connect to server. Please check if the backend is running.');
      }
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        username,
        email,
        password
      });

      const { token: receivedToken, user } = response.data;
      
      if (receivedToken && receivedToken.trim()) {
        localStorage.setItem('token', receivedToken);
        setToken(receivedToken);

        const normalizedUser = {
          ...user,
          id: user.id || user._id,
          _id: user._id || user.id
        };
        setUser(normalizedUser);
      } else {
        throw new Error('Invalid token received from server');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.code === 'ERR_NETWORK') {
        throw new Error('Unable to connect to server. Please check if the backend is running.');
      }
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const updateCoins = (newCoins: number) => {
    if (user) {
      setUser({ ...user, coins: newCoins });
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, refreshUser, updateCoins, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
