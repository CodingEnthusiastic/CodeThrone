import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Code, AlertCircle, Eye, EyeOff, Shield, User } from 'lucide-react';
import { API_URL } from "../config/api";
import Galaxy from './Galaxy';
// import LoginBackground from "./pages/LoginBackground"; 
// Animated Light Theme Background
const LightThemeBackground: React.FC = () => {
  // Generate 18 random stars for each render
  const stars = Array.from({ length: 18 }).map((_, i) => {
    const left = Math.random() * 98 + 1; // %
    const delay = Math.random() * 8; // seconds
    const duration = 4 + Math.random() * 4; // 4-8s
    const size = 10 + Math.random() * 10; // px
    return (
      <span
        key={i}
        className="light-falling-star"
        style={{
          left: `${left}%`,
          top: '-2%',
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`,
          fontSize: `${size}px`,
        }}
      >
        ★
      </span>
    );
  });

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden" style={{ pointerEvents: 'none' }}>
      {/* Falling black stars */}
      {stars}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="light-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="30%" stopColor="#fde68a" />
            <stop offset="60%" stopColor="#fed7aa" />
            <stop offset="100%" stopColor="#fecaca" />
          </linearGradient>
          <filter id="soft-glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect width="1920" height="1080" fill="url(#light-gradient)" />
        
        {/* Floating Geometric Shapes */}
        <g opacity="0.1">
          <circle cx="200" cy="200" r="40" fill="#f59e0b">
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0;50 -30;0 0"
              dur="6s"
              repeatCount="indefinite"
            />
          </circle>
          <rect x="1500" y="300" width="60" height="60" rx="10" fill="#ef4444">
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0 1530 330;360 1530 330"
              dur="8s"
              repeatCount="indefinite"
            />
          </rect>
          <polygon points="800,150 850,250 750,250" fill="#10b981">
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0;-20 40;0 0"
              dur="7s"
              repeatCount="indefinite"
            />
          </polygon>
        </g>
        
        {/* Floating Particles */}
        {Array.from({ length: 30 }, (_, i) => (
          <circle
            key={i}
            cx={Math.random() * 1920}
            cy={Math.random() * 1080}
            r={Math.random() * 8 + 2}
            fill={['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6'][Math.floor(Math.random() * 5)]}
            opacity="0.1"
          >
            <animateTransform
              attributeName="transform"
              type="translate"
              values={`0 0;${Math.random() * 100 - 50} ${Math.random() * 100 - 50};0 0`}
              dur={`${Math.random() * 10 + 5}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.05;0.2;0.05"
              dur={`${Math.random() * 4 + 3}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
        
        {/* Animated Waves */}
        <path
          d="M0 800 Q480 850 960 800 T1920 800 V1080 H0 Z"
          fill="#ffffff"
          opacity="0.1"
        >
          <animate
            attributeName="d"
            dur="8s"
            repeatCount="indefinite"
            values="
              M0 800 Q480 850 960 800 T1920 800 V1080 H0 Z;
              M0 820 Q480 780 960 820 T1920 820 V1080 H0 Z;
              M0 800 Q480 850 960 800 T1920 800 V1080 H0 Z
            "
          />
        </path>
      </svg>
    </div>
  );
};

// Robot Component with Magnet Hand
// Robot Animation using video
const RobotAnimation: React.FC = () => {
  const [showBubble, setShowBubble] = useState(false);

  const handleClick = () => {
    setShowBubble(true);
    setTimeout(() => setShowBubble(false), 3000);
  };

  const isDark = typeof document !== 'undefined'
    ? document.documentElement.classList.contains('dark')
    : false;

  return (
    <div
      className="fixed bottom-8 right-8 z-30 cursor-pointer"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      {/* Speech Bubble */}
      {showBubble && (
        <div className="absolute -top-14 -left-10 animate-bounce z-40">
          <div
            className="px-4 py-2 rounded-xl shadow-lg border text-sm font-semibold"
            style={{
              background: isDark ? '#1f2937' : '#ffffff',
              color: isDark ? '#f3f4f6' : '#1f2937',
              borderColor: isDark ? '#374151' : '#e5e7eb',
              fontSize: '1.75em', // Increased text size
              lineHeight: 1.2,
            }}
          >
            Hello User! 👋
          </div>
        </div>
      )}

      {/* Robot GIF Animation */}
      <img
        src="/robot.gif"
        alt="Robot"
        className="w-[240px] h-[280px] object-contain drop-shadow-xl"
        draggable={false}
      />
    </div>
  );
};

// Background component that only depends on dark mode
const LoginBackground: React.FC<{ isDark: boolean }> = ({ isDark }) => (
  <div className="absolute inset-0 w-full h-full z-0 bg-white dark:bg-gray-900">
    {isDark ? <Galaxy /> : <LightThemeBackground />}
  </div>
);

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password, role);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reliable dark mode detection using a state and effect
  const [isDark, setIsDark] = useState(() =>
    typeof window !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false
  );

  useEffect(() => {
    // Handler to update dark mode state on class change
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    // Initial set
    setIsDark(document.documentElement.classList.contains("dark"));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/*
        Background rendering moved out of Login component to prevent rerender/white flash on input change.
        Please render <LoginBackground isDark={isDark} /> at the app/root level (e.g. in App.tsx or a layout component),
        so it is not part of the Login component's render tree.
      */}
      {/* <LoginBackground isDark={isDark} /> */}
      <div className="relative h-screen w-screen flex items-center justify-center overflow-hidden bg-transparent">
        {/* Robot Animation: hidden on mobile, visible on sm+ */}
        <div className="hidden sm:block">
          <RobotAnimation />
        </div>
        <div className="relative z-10 w-full max-w-md mx-auto px-6">
          <div className="flex justify-center mb-6">
            <div className="flex items-center space-x-2">
              <Code className="h-8 w-8 text-orange-500" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">CodeThrone</span>
            </div>
          </div>
          
          <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white mb-8">
            Sign in to CodeThrone
          </h2>
          
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm py-8 px-6 shadow-2xl rounded-xl border border-gray-200 dark:border-gray-700">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-md p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                      <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Username or Email
                </label>
                <div className="mt-1">
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:bg-gray-900/80 dark:text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm backdrop-blur-sm"
                    placeholder="Enter your username or email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Login as
                </label>
                <div className="mt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('user')}
                      className={`flex items-center justify-center px-3 py-2 border rounded-md text-sm font-medium transition-all duration-200 ${
                        role === 'user'
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 shadow-md'
                          : 'border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-900/80 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/80 backdrop-blur-sm'
                      }`}
                    >
                      <User className="h-4 w-4 mr-2" />
                      User
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('admin')}
                      className={`flex items-center justify-center px-3 py-2 border rounded-md text-sm font-medium transition-all duration-200 ${
                        role === 'admin'
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 shadow-md'
                          : 'border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-900/80 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/80 backdrop-blur-sm'
                      }`}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Admin
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:bg-gray-900/80 dark:text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm backdrop-blur-sm"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-r-md transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Signing in...
                    </div>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </div>

              {/* OAuth Login Button */}
              <div>
                <button
                  type="button"
                  onClick={() => window.location.href = `${API_URL}/auth/google`}
                  className="w-full flex justify-center py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white/90 dark:bg-gray-900/90 hover:bg-gray-50 dark:hover:bg-gray-800/90 transition-all duration-200 backdrop-blur-sm transform hover:scale-105 active:scale-95"
                >
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 48 48">
                    <g>
                      <path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.23l6.85-6.85C36.13 2.13 30.41 0 24 0 14.82 0 6.71 5.06 2.69 12.44l7.98 6.2C12.13 13.03 17.62 9.5 24 9.5z"/>
                      <path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.22-.42-4.74H24v9.01h12.42c-.54 2.91-2.17 5.38-4.62 7.04l7.13 5.55C43.94 37.03 46.1 31.33 46.1 24.55z"/>
                      <path fill="#FBBC05" d="M10.67 28.64c-1.04-3.1-1.04-6.44 0-9.54l-7.98-6.2C.89 16.41 0 20.09 0 24c0 3.91.89 7.59 2.69 11.1l7.98-6.2z"/>
                      <path fill="#EA4335" d="M24 48c6.41 0 12.13-2.13 16.67-5.81l-7.13-5.55c-2.01 1.35-4.59 2.16-7.54 2.16-6.38 0-11.87-3.53-14.33-8.74l-7.98 6.2C6.71 42.94 14.82 48 24 48z"/>
                      <path fill="none" d="M0 0h48v48H0z"/>
                    </g>
                  </svg>
                  Sign in with Google
                </button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white/90 dark:bg-gray-800/90 text-gray-500 dark:text-gray-300 backdrop-blur-sm">New to CodeThrone?</span>
                </div>
              </div>

              <div className="mt-6 text-center">
                <Link
                  to="/register"
                  className="font-medium text-orange-600 hover:text-orange-500 transition-colors duration-200 hover:underline"
                >
                  Create your account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
