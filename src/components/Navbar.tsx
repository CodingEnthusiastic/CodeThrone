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
    { path: '/interview', label: 'Interview', special: true }
  ];

  // Emit game leave event when navigating away from game page
  const handleNavigation = (path: string) => {
    if (location.pathname.includes('/game') && !path.includes('/game')) {
      const event = new CustomEvent('gameNavigation', { detail: { leavingGame: true } });
      window.dispatchEvent(event);
    }
  };

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" onClick={() => handleNavigation('/')} className="flex items-center space-x-2">
              <Code className="h-8 w-8 text-orange-500" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">CodeThrone</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map(item => {
              const active = isActive(item.path);
              const baseClasses = `flex flex-col items-center px-4 py-3 rounded-md text-lg font-medium transition-colors ${
                active
                  ? 'text-orange-600 bg-orange-50'
                  : 'text-gray-700 dark:text-gray-300 hover:text-orange-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={baseClasses + (item.special ? ' relative' : '')}
                >
                  <span
                    className={
                      item.special
                        ? 'bg-clip-text text-transparent bg-gradient-to-br from-purple-700 via-purple-600 to-purple-700 dark:from-yellow-400 dark:via-yellow-300 dark:to-yellow-200'
                        : ''
                    }
                  >
                    {item.label}
                  </span>
                  {item.special && (
                    <span className="absolute -bottom-1 text-[10px] font-semibold text-purple-700 dark:text-yellow-400 uppercase">
                      New
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* User Menu and Mobile Toggle */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`flex items-center px-3 py-2 rounded-full border transition-colors duration-200
                ${isDark
                  ? 'bg-gray-800 border-gray-600 hover:bg-gray-700'
                  : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
                }`}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <Sun
                className={`h-5 w-5 mr-1 transition-opacity duration-200 ${
                  isDark ? 'text-gray-400 opacity-50' : 'text-yellow-500 opacity-100'
                }`}
              />
              <Moon
                className={`h-5 w-5 transition-opacity duration-200 ${
                  isDark ? 'text-blue-400 opacity-100' : 'text-gray-400 opacity-50'
                }`}
              />
            </button>

            {/* Coins / User Profile */}
            {user ? (
              <div className="flex items-center space-x-4">
                <Link
                  to="/redeem"
                  className="flex items-center space-x-1 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1 rounded-full border border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                >
                  <Coins className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">
                    {user.coins || 0}
                  </span>
                </Link>

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {user.profile?.avatar && !user.profile.avatar.startsWith('default:') ? (
                      <img
                        src={user.profile.avatar}
                        alt={user.username}
                        className="w-8 h-8 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {user.profile?.avatar?.startsWith('default:')
                            ? user.profile.avatar.replace('default:', '')
                            : user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {user.username}
                    </span>
                  </button>
                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 border border-gray-200 dark:border-gray-700">
                      {user.role === 'admin' && (
                        <Link
                          to="/admin"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Admin Dashboard
                        </Link>
                      )}
                      <Link
                        to={`/profile/${user.username}`}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <User className="h-4 w-4 mr-2" />
                        Profile
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="text-gray-700 dark:text-gray-300 hover:text-orange-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="bg-orange-600 text-white hover:bg-orange-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700 py-4">
            <div className="space-y-2">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'text-orange-600 bg-orange-50'
                      : 'text-gray-700 dark:text-gray-300 hover:text-orange-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span>{item.label}</span>
                  {item.special && <span className="text-xs text-yellow-400 font-semibold ml-1">NEW</span>}
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
