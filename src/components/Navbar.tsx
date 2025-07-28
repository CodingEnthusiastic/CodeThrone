import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Code, Menu, X, User, LogOut, Shield, Moon, Sun, Coins } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsProfileOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/problems', label: 'Problems' },
    { path: '/top', label: 'Discuss' },
    { path: '/contest', label: 'Contest' },
    { path: '/game', label: 'Game', special: true },
    { path: '/interview', label: 'Interview', special: true },
    { path: '/chats', label: 'ChatNCode' }
  ];

  // Emit game leave event when navigating away from game page
  const handleNavigation = (path: string) => {
    if (location.pathname.includes('/game') && !path.includes('/game')) {
      const event = new CustomEvent('gameNavigation', { detail: { leavingGame: true } });
      window.dispatchEvent(event);
    }
  };

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 transition-all duration-200 backdrop-blur-sm bg-white/95 dark:bg-gray-900/95">
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        {/* Use flex with items-stretch to align left/center/right */}
        <div className="flex items-stretch h-16">
          {/* Logo Section - Left, flush to left */}
          <div className="flex items-center min-w-0 flex-shrink-0 pl-0 mr-0">
            <Link 
              to="/" 
              onClick={() => handleNavigation('/')} 
              className="flex items-center space-x-2 group transition-all duration-200 hover:scale-105 ml-[-48px]"
            >
              <div className="p-1 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg group-hover:shadow-orange-500/25 transition-all duration-200">
                <Code className="h-7 w-7 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                CodeThrone
              </span>
            </Link>
          </div>

          {/* Navigation Items - Center, bigger text, more space, more gap from left */}
          <div className="flex-1 flex items-center justify-center ml-24">
            <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-1 border border-gray-200 dark:border-gray-700/50 backdrop-blur-sm">
              {navItems.map((item, index) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={`relative flex flex-col items-center px-6 py-3 rounded-lg text-lg font-semibold transition-all duration-200 group min-w-[100px] ${
                      active
                        ? 'text-orange-600 dark:text-orange-400 bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600'
                        : 'text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-white/60 dark:hover:bg-gray-700/60'
                    }`}
                  >
                    <span
                      className={
                        item.special
                          ? 'bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 dark:from-yellow-400 dark:via-yellow-300 dark:to-amber-400 font-semibold'
                          : ''
                      }
                    >
                      {item.label}
                    </span>
                    {item.special && (
                      <span
                        className="absolute -top-1 -right-1 bg-gradient-to-r from-purple-500 to-indigo-500 dark:from-yellow-400 dark:to-amber-400 text-white dark:text-gray-900 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide shadow-sm"
                        style={{ transform: 'scale(0.75)', transformOrigin: 'top right' }}
                      >
                        New
                      </span>
                    )}
                    {/* Replace orange dot with a bold bottom border for active tab */}
                    {active && (
                      <span className="absolute left-0 right-0 bottom-0 h-1 bg-orange-500 rounded-b-lg" style={{fontWeight: 700}} />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
          
          {/* User Section - Right, flush to right */}
          <div className="flex items-center space-x-4 min-w-0 flex-shrink-0 pl-2">
            {/* Add extra gap before theme toggle */}
            <div className="w-8 sm:w-12" />
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`relative flex items-center p-2.5 rounded-xl border transition-all duration-200 hover:scale-105 group
                ${isDark
                  ? 'bg-gray-800 border-gray-700 hover:bg-gray-700 shadow-lg'
                  : 'bg-gray-100 border-gray-300 hover:bg-gray-200 shadow-sm'
                }`}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <div className="relative w-10 h-5 flex items-center">
                <Sun
                  className={`absolute h-4 w-4 transition-all duration-300 ${
                    isDark 
                      ? 'text-gray-500 opacity-40 transform translate-x-0' 
                      : 'text-yellow-500 opacity-100 transform translate-x-5'
                  }`}
                />
                <Moon
                  className={`absolute h-4 w-4 transition-all duration-300 ${
                    isDark 
                      ? 'text-blue-400 opacity-100 transform translate-x-5' 
                      : 'text-gray-500 opacity-40 transform translate-x-0'
                  }`}
                />
              </div>
            </button>

            {/* User Authentication Section */}
            {user ? (
              <div className="flex items-center space-x-3">
                {/* Coins */}
                <Link
                  to="/redeem"
                  className="flex items-center space-x-2 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 px-4 py-2.5 rounded-xl border border-yellow-200 dark:border-yellow-800 hover:from-yellow-100 hover:to-amber-100 dark:hover:from-yellow-900/30 dark:hover:to-amber-900/30 transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md group"
                >
                  <Coins className="h-4 w-4 text-yellow-600 dark:text-yellow-400 group-hover:rotate-12 transition-transform duration-200" />
                  <span className="text-sm font-bold text-yellow-700 dark:text-yellow-300 min-w-[20px] text-center">
                    {user.coins || 0}
                  </span>
                </Link>

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center space-x-3 p-2 pr-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 group"
                  >
                    {user.profile?.avatar && !user.profile.avatar.startsWith('default:') ? (
                      <img
                        src={user.profile.avatar}
                        alt={user.username}
                        className="w-9 h-9 rounded-xl object-cover border-2 border-gray-200 dark:border-gray-600 group-hover:border-orange-300 dark:group-hover:border-orange-500 transition-all duration-200"
                      />
                    ) : (
                      <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-orange-500/25 transition-all duration-200">
                        <span className="text-white text-sm font-bold">
                          {user.profile?.avatar?.startsWith('default:')
                            ? user.profile.avatar.replace('default:', '')
                            : user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="hidden md:flex flex-col items-start">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors duration-200">
                        {user.username}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-500 capitalize">
                        {user.role || 'Member'}
                      </span>
                    </div>
                  </button>
                  
                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl py-2 border border-gray-200 dark:border-gray-700 backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 animate-in slide-in-from-top-2 duration-200">
                      {user.role === 'admin' && (
                        <Link
                          to="/admin"
                          className="flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400 transition-all duration-200"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <Shield className="h-4 w-4 mr-3" />
                          Admin Dashboard
                        </Link>
                      )}
                      <Link
                        to={`/profile/${user.username}`}
                        className="flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <User className="h-4 w-4 mr-3" />
                        View Profile
                      </Link>
                      <hr className="my-2 border-gray-200 dark:border-gray-700" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-orange-500/25 hover:scale-105"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2.5 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-all duration-200"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 dark:border-gray-700 py-4 animate-in slide-in-from-top-2 duration-200">
            <div className="space-y-1">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive(item.path)
                      ? 'text-orange-600 bg-orange-50 dark:bg-orange-900/20'
                      : 'text-gray-700 dark:text-gray-300 hover:text-orange-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className={item.special ? 'bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-yellow-400 dark:to-amber-400 font-semibold' : ''}>
                    {item.label}
                  </span>
                  {item.special && (
                    <span className="bg-gradient-to-r from-purple-500 to-indigo-500 dark:from-yellow-400 dark:to-amber-400 text-white dark:text-gray-900 text-xs font-bold px-2 py-1 rounded-full uppercase">
                      New
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;