import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Code, 
  Menu, 
  X, 
  User, 
  LogOut, 
  Shield, 
  Moon, 
  Sun, 
  Coins,
  ChevronDown
} from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/problems', label: 'Problems' },
    { path: '/top', label: 'Discuss' },
    { path: '/contest', label: 'Contest' },
    { path: '/game', label: 'Game' },
    { path: '/interview', label: 'Interview' },
    { path: '/chats', label: 'Chat' }
  ];

  // Emit game leave event when navigating away from game page
  const handleNavigation = (path: string) => {
    if (location.pathname.includes('/game') && !path.includes('/game')) {
      const event = new CustomEvent('gameNavigation', { detail: { leavingGame: true } });
      window.dispatchEvent(event);
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className={`sticky top-0 z-50 border-b transition-colors duration-200 ${
      isDark 
        ? 'bg-gray-800 border-gray-800' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link 
            to="/" 
            onClick={() => handleNavigation('/')} 
            className="flex items-center space-x-2 group"
          >
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700">
              <Code className="h-5 w-5 text-white" />
            </div>
            <span className={`text-xl font-bold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              CodeThrone
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`text-sm font-medium transition-colors duration-200 ${
                    active
                      ? isDark ? 'text-blue-400' : 'text-blue-600'
                      : isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Desktop Right Section */}
          <div className="hidden lg:flex items-center space-x-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors duration-200 ${
                isDark
                  ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>

            {user ? (
              <div className="flex items-center space-x-3">
                {/* Coins */}
                <Link
                  to="/redeem"
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition-colors duration-200 ${
                    isDark
                      ? 'bg-yellow-900/20 border-yellow-800 text-yellow-400 hover:bg-yellow-900/30'
                      : 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100'
                  }`}
                >
                  <Coins className="h-4 w-4" />
                  <span className="text-sm font-medium">{user.coins || 0}</span>
                </Link>

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition-colors duration-200 ${
                      isDark
                        ? 'border-gray-700 hover:bg-gray-800'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {user.profile?.avatar && !user.profile.avatar.startsWith('default:') ? (
                      <img
                        src={user.profile.avatar}
                        alt={user.username}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                        <User className="h-3 w-3 text-white" />
                      </div>
                    )}
                    <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {user.username}
                    </span>
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </button>
                  
                  {isProfileOpen && (
                    <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg border py-1 ${
                      isDark
                        ? 'bg-gray-800 border-gray-700'
                        : 'bg-white border-gray-200'
                    }`}>
                      {user.role === 'admin' && (
                        <Link
                          to="/admin"
                          className={`flex items-center px-4 py-2 text-sm transition-colors ${
                            isDark
                              ? 'text-gray-300 hover:bg-gray-700'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <Shield className="h-4 w-4 mr-3" />
                          Admin Dashboard
                        </Link>
                      )}
                      
                      <Link
                        to={`/profile/${user.username}`}
                        className={`flex items-center px-4 py-2 text-sm transition-colors ${
                          isDark
                            ? 'text-gray-300 hover:bg-gray-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <User className="h-4 w-4 mr-3" />
                        Profile
                      </Link>
                      
                      <hr className={`my-1 ${isDark ? 'border-gray-700' : 'border-gray-200'}`} />
                      
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
                  className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                    isDark
                      ? 'text-gray-300 hover:text-white'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-200"
                >
                  Start Learning →
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`lg:hidden p-2 rounded-lg transition-colors duration-200 ${
              isDark
                ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation Overlay */}
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            ></div>
            
            {/* Mobile Menu */}
            <div className={`fixed top-0 left-0 w-80 h-full z-50 lg:hidden transform transition-transform duration-300 ${
              isDark ? 'bg-gray-900 border-r border-gray-800' : 'bg-white border-r border-gray-200'
            } shadow-2xl`}>
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                <Link 
                  to="/" 
                  className="flex items-center space-x-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Code className="h-8 w-8 text-blue-600" />
                  <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    CodeThrone
                  </span>
                </Link>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`p-2 rounded-lg transition-colors duration-200 ${
                    isDark
                      ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Navigation Items */}
              <div className="px-6 py-4 space-y-2">
                {navItems.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => handleNavigation(item.path)}
                      className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
                        active
                          ? isDark ? 'text-blue-400 bg-blue-900/20' : 'text-blue-600 bg-blue-50'
                          : isDark ? 'text-gray-300 hover:text-white hover:bg-gray-800' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
              
              {/* User Section */}
              {user ? (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
                  <Link
                    to="/redeem"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      isDark
                        ? 'text-yellow-400 hover:bg-gray-800'
                        : 'text-yellow-700 hover:bg-gray-50'
                    }`}
                  >
                    <Coins className="h-4 w-4 mr-3" />
                    Coins ({user.coins || 0})
                  </Link>

                  {user.role === 'admin' && (
                    <Link
                      to="/admin"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
                        isDark
                          ? 'text-gray-300 hover:text-white hover:bg-gray-800'
                          : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <Shield className="h-4 w-4 mr-3" />
                      Admin
                    </Link>
                  )}
                  
                  <Link
                    to={`/profile/${user.username}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      isDark
                        ? 'text-gray-300 hover:text-white hover:bg-gray-800'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <User className="h-4 w-4 mr-3" />
                    Profile
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    Logout
                  </button>
                </div>
              ) : (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block w-full px-4 py-3 text-center text-sm font-medium border rounded-lg transition-colors duration-200 ${
                      isDark
                        ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full px-4 py-3 text-center text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                  >
                    Start Learning →
                  </Link>
                </div>
              )}

              {/* Theme Toggle */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={toggleTheme}
                  className={`flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    isDark
                      ? 'text-gray-300 hover:text-white hover:bg-gray-800'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {isDark ? (
                    <>
                      <Sun className="h-4 w-4 mr-3" />
                      Light Mode
                    </>
                  ) : (
                    <>
                      <Moon className="h-4 w-4 mr-3" />
                      Dark Mode
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
