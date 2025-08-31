import React, { useState, useEffect } from 'react';
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
  Home,
  BookOpen,
  MessageCircle,
  Trophy,
  Gamepad2,
  Briefcase
} from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1000);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsProfileOpen(false);
    setIsSidebarOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/problems', label: 'Problems', icon: BookOpen },
    { path: '/top', label: 'Discuss', icon: MessageCircle },
    { path: '/contest', label: 'Contest', icon: Trophy },
    { path: '/game', label: 'Game', icon: Gamepad2, special: true },
    { path: '/interview', label: 'Interview', icon: Briefcase, special: true },
    { path: '/chats', label: 'ChatNCode', icon: MessageCircle }
  ];

  // Emit game leave event when navigating away from game page
  const handleNavigation = (path: string) => {
    if (location.pathname.includes('/game') && !path.includes('/game')) {
      const event = new CustomEvent('gameNavigation', { detail: { leavingGame: true } });
      window.dispatchEvent(event);
    }
    setIsSidebarOpen(false);
  };

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('mobile-sidebar');
      const menuButton = document.getElementById('mobile-menu-button');
      
      if (isSidebarOpen && sidebar && menuButton && 
          !sidebar.contains(event.target as Node) && 
          !menuButton.contains(event.target as Node)) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSidebarOpen]);

  return (
    <>
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

            {/* Desktop Navigation - Show when width >= 1000px */}
            {!isMobile && (
              <>
                <div className="flex items-center space-x-1 flex-1 justify-center max-w-2xl">
                  {navItems.slice(1).map((item) => {
                    const active = isActive(item.path);
                    const IconComponent = item.icon;
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
                        <IconComponent className="h-4 w-4 mr-2" />
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

                <div className="flex items-center space-x-3">
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
              </>
            )}

            {/* Mobile Menu Button */}
            {isMobile && (
              <div className="flex items-center space-x-3">
                {/* Theme Toggle for Mobile Navbar */}
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-lg border transition-all duration-200 ${
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

                <button
                  id="mobile-menu-button"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 relative z-60"
                >
                  <Menu className="h-6 w-6" />
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Modern Slide-out Sidebar for Mobile */}
      {isMobile && (
        <>
          {/* Backdrop */}
          <div 
            className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${
              isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => setIsSidebarOpen(false)}
          />

          {/* Sidebar */}
          <div 
            id="mobile-sidebar"
            className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white dark:bg-gray-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
              isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600">
                  <Code className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  CodeThrone
                </span>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* User Section */}
            {user && (
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3 mb-4">
                  {user.profile?.avatar && !user.profile.avatar.startsWith('default:') ? (
                    <img
                      src={user.profile.avatar}
                      alt={user.username}
                      className="w-12 h-12 rounded-xl object-cover border-2 border-gray-200 dark:border-gray-600"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                      <User className="h-6 w-6 text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {user.username}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {user.role || 'Member'}
                    </p>
                  </div>
                </div>
                
                {/* Coins Display */}
                <Link
                  to="/redeem"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 hover:from-yellow-100 hover:to-amber-100 dark:hover:from-yellow-900/30 dark:hover:to-amber-900/30 transition-all duration-200 group"
                >
                  <div className="flex items-center space-x-2">
                    <Coins className="h-5 w-5 text-yellow-600 dark:text-yellow-400 group-hover:rotate-12 transition-transform duration-200" />
                    <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                      Your Coins
                    </span>
                  </div>
                  <span className="text-lg font-bold text-yellow-700 dark:text-yellow-300">
                    {user.coins || 0}
                  </span>
                </Link>
              </div>
            )}

            {/* Navigation Items */}
            <div className="flex-1 overflow-y-auto py-6">
              <nav className="px-6 space-y-2">
                {navItems.map((item) => {
                  const active = isActive(item.path);
                  const IconComponent = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => handleNavigation(item.path)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                        active
                          ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
                          : 'text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <IconComponent className={`h-5 w-5 ${active ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-orange-500'}`} />
                        <span className={item.special ? 'bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-yellow-400 dark:to-amber-400 font-semibold' : ''}>
                          {item.label}
                        </span>
                      </div>
                      {item.special && (
                        <span className="bg-gradient-to-r from-purple-500 to-indigo-500 dark:from-yellow-400 dark:to-amber-400 text-white dark:text-gray-900 text-xs font-bold px-2 py-1 rounded-full uppercase">
                          New
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Bottom Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-6">
              {user ? (
                <div className="space-y-2">
                  {user.role === 'admin' && (
                    <Link
                      to="/admin"
                      onClick={() => setIsSidebarOpen(false)}
                      className="flex items-center px-4 py-3 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
                    >
                      <Shield className="h-5 w-5 mr-3" />
                      Admin Dashboard
                    </Link>
                  )}
                  
                  <Link
                    to={`/profile/${user.username}`}
                    onClick={() => setIsSidebarOpen(false)}
                    className="flex items-center px-4 py-3 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
                  >
                    <User className="h-5 w-5 mr-3" />
                    Profile
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                  >
                    <LogOut className="h-5 w-5 mr-3" />
                    Logout
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link
                    to="/login"
                    onClick={() => setIsSidebarOpen(false)}
                    className="block w-full px-4 py-3 rounded-xl text-sm font-medium text-center text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 border border-gray-200 dark:border-gray-700"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsSidebarOpen(false)}
                    className="block w-full px-4 py-3 rounded-xl text-sm font-semibold text-center bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-lg"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Navbar;
