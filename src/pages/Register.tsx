import React, { useState, useEffect } from 'react';
import { Code, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { API_URL } from '../config/api';

// Animated stars + bubbles background for dark mode
const StarField: React.FC = () => {
  const stars = Array.from({ length: 150 }).map((_, i) => {
    const size = Math.random() * 3 + 1;
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const duration = 3 + Math.random() * 4;
    const delay = Math.random() * 5;
    const direction = Math.random() > 0.5 ? 1 : -1;
    
    return (
      <div
        key={i}
        className="absolute rounded-full bg-white"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          left: `${x}%`,
          top: `${y}%`,
          animation: `star-twinkle ${duration}s ease-in-out ${delay}s infinite alternate, star-move ${8 + Math.random() * 4}s linear infinite`,
          transform: `translateX(${direction * 20}px)`,
        }}
      />
    );
  });

  // Shooting stars
  const shootingStars = Array.from({ length: 3 }).map((_, i) => (
    <div
      key={`shooting-${i}`}
      className="absolute w-1 h-1 bg-white rounded-full"
      style={{
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 50}%`,
        animation: `shooting-star ${4 + Math.random() * 2}s linear ${i * 3}s infinite`,
        boxShadow: '0 0 6px 2px rgba(255, 255, 255, 0.8)',
      }}
    />
  ));

  // Animated bubbles from left and right
  const bubbles = Array.from({ length: 18 }).map((_, i) => {
    const size = 24 + Math.random() * 32;
    const side = i % 2 === 0 ? 'left' : 'right';
    const start = Math.random() * 90 + 2; // %
    const duration = 8 + Math.random() * 6;
    const delay = Math.random() * 6;
    const color = [
      'rgba(129,140,248,0.13)', // indigo-400/10
      'rgba(139,92,246,0.13)',  // purple-500/10
      'rgba(236,72,153,0.13)',  // pink-500/10
      'rgba(59,130,246,0.13)',  // blue-500/10
      'rgba(16,185,129,0.13)',  // green-500/10
    ][Math.floor(Math.random() * 5)];
    return (
      <span
        key={i}
        className="absolute rounded-full"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          [side]: '-5%',
          top: `${start}%`,
          background: color,
          opacity: 0.45 + Math.random() * 0.2,
          filter: 'blur(1.5px)',
          zIndex: 0,
          animation: `bubble-dark-move-${side} ${duration}s linear ${delay}s infinite`,
        }}
      />
    );
  });

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      <style>
        {`
          @keyframes star-twinkle {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.2); }
          }
          @keyframes star-move {
            0% { transform: translateY(0px) translateX(0px); }
            100% { transform: translateY(-10px) translateX(5px); }
          }
          @keyframes shooting-star {
            0% { transform: translateX(0) translateY(0) rotate(45deg); opacity: 1; }
            70% { opacity: 1; }
            100% { transform: translateX(300px) translateY(300px) rotate(45deg); opacity: 0; }
          }
          @keyframes nebula-drift {
            0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
            33% { transform: translate(20px, -10px) scale(1.1); opacity: 0.6; }
            66% { transform: translate(-15px, 15px) scale(0.9); opacity: 0.5; }
          }
          @keyframes bubble-dark-move-left {
            0% { transform: translateX(0) scale(1);}
            100% { transform: translateX(110vw) scale(1.15);}
          }
          @keyframes bubble-dark-move-right {
            0% { transform: translateX(0) scale(1);}
            100% { transform: translateX(-110vw) scale(1.15);}
          }
        `}
      </style>
      
      {/* Nebula background */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/30 to-indigo-900/20"
        style={{ animation: 'nebula-drift 20s ease-in-out infinite' }}
      />
      
      {/* Bubbles from both sides */}
      {bubbles}
      
      {/* Stars */}
      {stars}
      {shootingStars}
      
      {/* Galaxy spiral */}
      <div
        className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full opacity-10"
        style={{
          background: 'radial-gradient(circle, rgba(147, 51, 234, 0.3) 0%, transparent 70%)',
          animation: 'spin 30s linear infinite',
        }}
      />
    </div>
  );
};

// Rainbow sunlight background for light mode
const RainbowSunlight: React.FC = () => {
  const rays = Array.from({ length: 12 }).map((_, i) => (
    <div
      key={i}
      className="absolute w-1 bg-gradient-to-b from-yellow-200/40 to-transparent"
      style={{
        height: '50%',
        left: '50%',
        top: '20%',
        transformOrigin: 'bottom center',
        transform: `translateX(-50%) rotate(${i * 30}deg)`,
        animation: `sun-rays ${4 + i * 0.2}s ease-in-out infinite alternate`,
      }}
    />
  ));

  const floatingElements = Array.from({ length: 20 }).map((_, i) => {
    const colors = ['#ff9a9e', '#fecfef', '#fecfef', '#a8edea', '#fed6e3', '#d299c2'];
    const size = 4 + Math.random() * 8;
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const duration = 6 + Math.random() * 4;
    const delay = Math.random() * 3;
    
    return (
      <div
        key={i}
        className="absolute rounded-full opacity-60"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          left: `${x}%`,
          top: `${y}%`,
          background: colors[Math.floor(Math.random() * colors.length)],
          animation: `float ${duration}s ease-in-out ${delay}s infinite alternate`,
          filter: 'blur(1px)',
        }}
      />
    );
  });

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      <style>
        {`
          @keyframes sun-rays {
            0% { opacity: 0.2; transform: translateX(-50%) rotate(var(--rotation)) scaleY(0.8); }
            100% { opacity: 0.6; transform: translateX(-50%) rotate(var(--rotation)) scaleY(1.2); }
          }
          @keyframes float {
            0% { transform: translateY(0px) translateX(0px) rotate(0deg); }
            100% { transform: translateY(-20px) translateX(10px) rotate(180deg); }
          }
          @keyframes rainbow-shift {
            0%, 100% { filter: hue-rotate(0deg); }
            25% { filter: hue-rotate(90deg); }
            50% { filter: hue-rotate(180deg); }
            75% { filter: hue-rotate(270deg); }
          }
        `}
      </style>
      
      {/* Rainbow gradient background */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100"
        style={{ animation: 'rainbow-shift 15s ease-in-out infinite' }}
      />
      
      {/* Sun */}
      <div
        className="absolute top-16 right-16 w-24 h-24 rounded-full bg-gradient-to-br from-yellow-300 to-orange-400 opacity-80"
        style={{ animation: 'float 4s ease-in-out infinite alternate' }}
      />
      
      {/* Sun rays */}
      {rays.map((ray, i) => 
        React.cloneElement(ray, {
          key: i,
          style: {
            ...ray.props.style,
            '--rotation': `${i * 30}deg`,
          }
        })
      )}
      
      {/* Floating elements */}
      {floatingElements}
      
      {/* Subtle clouds */}
      <div
        className="absolute top-1/3 left-1/4 w-32 h-16 bg-white/20 rounded-full opacity-40"
        style={{ animation: 'float 6s ease-in-out 1s infinite alternate' }}
      />
      <div
        className="absolute top-1/2 right-1/3 w-24 h-12 bg-white/15 rounded-full opacity-30"
        style={{ animation: 'float 5s ease-in-out 2s infinite alternate' }}
      />
    </div>
  );
};

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Use system/app dark mode, not just local toggle
  const [isDark, setIsDark] = useState(() =>
    typeof window !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false
  );

  useEffect(() => {
    // Listen for changes to the document's class attribute
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    setIsDark(document.documentElement.classList.contains("dark"));
    return () => observer.disconnect();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    console.log('📝 Starting registration process...');
    console.log('📊 Form data:', { username, email, password: '[HIDDEN]' });

    if (password !== confirmPassword) {
      console.log('❌ Password mismatch');
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    console.log('🔄 Setting loading state to true');

    try {
      console.log('🌐 Making API request to register...');
      console.log('📍 API URL:', API_URL);

      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          email,
          password,
          role: 'user'
        }),
      });

      console.log('📡 Response received:', response.status, response.statusText);

      const data = await response.json();
      console.log('📋 Response data:', data);

      if (response.ok) {
        console.log('✅ Registration successful!');
        // Store token in localStorage
        if (data.token) {
          localStorage.setItem('token', data.token);
          console.log('🔐 Token stored in localStorage');
        }
        alert('Account created successfully! You can now login.');
        // Optionally redirect to login or dashboard
        // window.location.href = '/login';
      } else {
        console.log('❌ Registration failed:', data.message);
        setError(data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('❌ Network error during registration:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
      console.log('🔄 Setting loading state to false');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 dark:from-gray-900 dark:via-gray-900 dark:to-black py-12 px-4 sm:px-6 lg:px-8">
      {/* Animated Background */}
      <div className="absolute inset-0 w-full h-full z-0">
        {isDark ? <StarField /> : <RainbowSunlight />}
      </div>
      
      {/* Main Content */}
      <div className="relative z-10 max-w-md w-full">
        {/* Glassmorphism Card */}
        <div className="backdrop-blur-xl bg-white/10 dark:bg-gray-900/20 border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-2xl p-8 space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                <Code className="h-8 w-8 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Join CodeThrone
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Create your account and start coding
            </p>
          </div>

          {/* Form */}
          <div className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <span className="text-red-600 dark:text-red-400 text-sm">{error}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Username */}
              <div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-600/50 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              {/* Email */}
              <div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-600/50 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* Password */}
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full px-4 py-3 pr-12 bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-600/50 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {/* Confirm Password */}
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  className="w-full px-4 py-3 pr-12 bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-600/50 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              onClick={handleSubmit}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating account...</span>
                </div>
              ) : (
                'Create Account'
              )}
            </button>

            {/* Login Link */}
            <div className="text-center">
              <span className="text-gray-600 dark:text-gray-400">Already have an account? </span>
              <button 
                className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-semibold transition-colors duration-200"
                onClick={() => window.location.href = '/login'}
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
