import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  ratings?: {
    gameRating: number;
  };
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, role?: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
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

  // Auto-login if token exists
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get('http://localhost:5000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        // ✅ CRITICAL FIX: Normalize user ID format on auto-login
        const user = res.data;
        const normalizedUser = {
          ...user,
          id: user.id || user._id,
          _id: user._id || user.id
        };
        setUser(normalizedUser);
        console.log('🔄 Auto-login successful with normalized user:', normalizedUser);
      })
      .catch(() => {
        setUser(null);
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
    const res = await axios.get('http://localhost:5000/api/auth/me', {
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

  const login = async (username: string, password: string, role: string = 'user') => {
    try {
      console.log('🔐 Login attempt:', { username, role });
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        username,
        password,
        role
      });
      
      const { token, user } = response.data;
      console.log('✅ Login successful, user data:', user);
      console.log('🔑 Token received, length:', token.length);
      localStorage.setItem('token', token);
      
      // ✅ CRITICAL FIX: Ensure user object has consistent ID format
      const normalizedUser = {
        ...user,
        id: user.id || user._id,
        _id: user._id || user.id
      };
      setUser(normalizedUser);
      console.log('💾 User set in context with normalized IDs:', normalizedUser);
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
      const response = await axios.post('http://localhost:5000/api/auth/register', {
        username,
        email,
        password
      });
      
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      
      // ✅ CRITICAL FIX: Ensure user object has consistent ID format
      const normalizedUser = {
        ...user,
        id: user.id || user._id,
        _id: user._id || user.id
      };
      setUser(normalizedUser);
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.code === 'ERR_NETWORK') {
        throw new Error('Unable to connect to server. Please check if the backend is running.');
      }
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};