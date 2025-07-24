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
  token: string | null;  // ✅ Add token to the interface
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
  const [token, setToken] = useState<string | null>(null);

  // Auto-login if token exists
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    console.log('🔄 Checking saved token:', savedToken ? `Present (${savedToken.length} chars)` : 'Not found');
    
    if (savedToken && savedToken.trim()) {
      setToken(savedToken);
      console.log('🔑 Setting token in state:', savedToken.substring(0, 20) + '...');
      
      axios.get('http://localhost:5000/api/auth/me', {
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

      const { token: receivedToken, user } = response.data;
      console.log('✅ Login successful, user data:', user);
      console.log('🔑 Token received, length:', receivedToken?.length);
      console.log('🔑 Token preview:', receivedToken?.substring(0, 20) + '...');
      
      if (receivedToken && receivedToken.trim()) {
        localStorage.setItem('token', receivedToken);
        setToken(receivedToken);
        
        const normalizedUser = {
          ...user,
          id: user.id || user._id,
          _id: user._id || user.id
        };
        setUser(normalizedUser);
        console.log('💾 User set in context with normalized IDs:', normalizedUser);
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
      const response = await axios.post('http://localhost:5000/api/auth/register', {
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

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};