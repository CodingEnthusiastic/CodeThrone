import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_URL, SOCKET_URL } from "../config/api";

const OAuthHandler = () => {
  const navigate = useNavigate();
  const { setUser, refreshUser } = useAuth();
  const handledRef = useRef(false);

  useEffect(() => {
    // Prevent double execution in React 18 StrictMode
    if (handledRef.current) return;
    handledRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      // Store token first
      localStorage.setItem('token', token);
      console.log('🔑 OAuth token stored:', token.substring(0, 20) + '...');

      // Use async IIFE to avoid race conditions
      (async () => {
        try {
          const res = await fetch(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!res.ok) throw new Error('Failed to fetch user');
          const user = await res.json();
          const normalizedUser = { ...user, id: user._id || user.id, _id: user._id || user.id };
          setUser && setUser(normalizedUser);
          console.log('✅ OAuth user set:', normalizedUser.username);
          
          // Clear URL params
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // Refresh user data to ensure consistent state
          if (refreshUser) {
            await refreshUser();
          }
          
          // Navigate using React Router instead of forcing page reload
          navigate('/', { replace: true });
        } catch (error) {
          console.error('❌ OAuth authentication failed:', error);
          localStorage.removeItem('token');
          navigate('/login', { replace: true });
        }
      })();
    } else {
      console.log('❌ No OAuth token found');
      navigate('/login', { replace: true });
    }
  }, [navigate, setUser, refreshUser]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 to-purple-600">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
        <div className="text-xl font-semibold">Signing you in...</div>
        <div className="text-sm opacity-75">Please wait while we authenticate you</div>
      </div>
    </div>
  );
};

export default OAuthHandler;
