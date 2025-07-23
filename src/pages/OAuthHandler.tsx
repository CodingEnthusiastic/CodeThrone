import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const OAuthHandler = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const handledRef = useRef(false);

  useEffect(() => {
    // Prevent double execution in React 18 StrictMode
    if (handledRef.current) return;
    handledRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('token', token);

      // Use async IIFE to avoid race conditions
      (async () => {
        try {
          const res = await fetch('http://localhost:5000/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!res.ok) throw new Error('Failed to fetch user');
          const user = await res.json();
          setUser && setUser({ ...user, id: user._id });
          window.history.replaceState({}, document.title, window.location.pathname);
          // Force a reload to update all UI (including Navbar)
          window.location.replace('/');
        } catch {
          localStorage.removeItem('token');
          navigate('/login', { replace: true });
        }
      })();
    } else {
      navigate('/login', { replace: true });
    }
  }, [navigate, setUser]);

  return <div className="flex items-center justify-center min-h-screen">Signing you in...</div>;
};

export default OAuthHandler;
