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
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 transition-colors duration-200">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0">
            <Link 
              to="/" 
              onClick={() => handleNavigation('/')} 
              className="flex items-center space-x-2 group transition-all duration-200 hover:scale-105"
            >
              <div className="p-1 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg group-hover:shadow-orange-500/25 transition-all duration-200">
                <Code className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent whitespace-nowrap">
                CodeThrone
              </span>
            </Link>
          </div>

          {/* Desktop Navigation - Show only when width >= 1000px */}
          <div className="hidden xl:flex items-center space-x-1 flex-1 justify-center max-w-2xl">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`relative flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    active
                      ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20'
                      : 'text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className={item.special ? 'bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-yellow-400 dark:to-amber-400 font-semibold' : ''}>
                    {item.label}
                  </span>
                  {item.special && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-purple-500 to-indigo-500 dark:from-yellow-400 dark:to-amber-400 text-white dark:text-gray-900 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                      New
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Desktop Right Section - Show only when width >= 1000px */}
          <div className="hidden xl:flex items-center space-x-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg border transition-all duration-200 hover:scale-105 ${
                isDark
                  ? 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                  : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
              }`}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-yellow-500" />
              ) : (
                <Moon className="h-4 w-4 text-gray-600" />
              )}
            </button>

            {user ? (
              <div className="flex items-center space-x-3">
                {/* Coins */}
                <Link
                  to="/redeem"
                  className="flex items-center space-x-2 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 px-3 py-2 rounded-lg border border-yellow-200 dark:border-yellow-800 hover:from-yellow-100 hover:to-amber-100 dark:hover:from-yellow-900/30 dark:hover:to-amber-900/30 transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md group"
                >
                  <Coins className="h-4 w-4 text-yellow-600 dark:text-yellow-400 group-hover:rotate-12 transition-transform duration-200" />
                  <span className="text-sm font-bold text-yellow-700 dark:text-yellow-300 whitespace-nowrap">
                    {user.coins || 0}
                  </span>
                </Link>

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                  >
                    {user.profile?.avatar && !user.profile.avatar.startsWith('default:') ? (
                      <img
                        src={user.profile.avatar}
                        alt={user.username}
                        className="w-8 h-8 rounded-lg object-cover border-2 border-gray-200 dark:border-gray-600"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{user.username}</span>
                  </button>
                  
                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl py-2 border border-gray-200 dark:border-gray-700 z-50">
                      {user.role === 'admin' && (
                        <Link
                          to="/admin"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <Shield className="h-4 w-4 mr-3" />
                          Admin Dashboard
                        </Link>
                      )}
                      
                      <Link
                        to={`/profile/${user.username}`}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <User className="h-4 w-4 mr-3" />
                        Profile
                      </Link>
                      
                      <hr className="my-2 border-gray-200 dark:border-gray-700" />
                      
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Logout
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
                  className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-orange-500/25 hover:scale-105"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button - Show when width < 1000px */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="xl:hidden p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Navigation - Show when width < 1000px */}
        {isMenuOpen && (
          <div className="xl:hidden border-t border-gray-200 dark:border-gray-700 py-4">
            <div className="space-y-1">
              {/* Navigation Items */}
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive(item.path)
                      ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20'
                      : 'text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => {
                    handleNavigation(item.path);
                    setIsMenuOpen(false);
                  }}
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
              
              {/* Theme Toggle for Mobile */}
              <button
                onClick={toggleTheme}
                className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isDark
                    ? 'text-gray-300 hover:bg-gray-800'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {isDark ? (
                  <Sun className="h-4 w-4 mr-3 text-yellow-500" />
                ) : (
                  <Moon className="h-4 w-4 mr-3 text-gray-600" />
                )}
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </button>

              {user ? (
                <>
                  {/* Coins for Mobile */}
                  <Link
                    to="/redeem"
                    className="flex items-center px-4 py-3 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Coins className="h-4 w-4 mr-3 text-yellow-600 dark:text-yellow-400" />
                    Coins ({user.coins || 0})
                  </Link>

                  {/* Profile for Mobile */}
                  {user.role === 'admin' && (
                    <Link
                      to="/admin"
                      className="flex items-center px-4 py-3 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Shield className="h-4 w-4 mr-3" />
                      Admin Dashboard
                    </Link>
                  )}
                  
                  <Link
                    to={`/profile/${user.username}`}
                    className="flex items-center px-4 py-3 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="h-4 w-4 mr-3" />
                    Profile
                  </Link>
                  
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    Logout
                  </button>
                </>
              ) : (
                <div className="space-y-1">
                  <Link
                    to="/login"
                    className="block px-4 py-3 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="block px-4 py-3 rounded-lg text-sm font-medium bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 transition-all duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
