import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDarkMode } from '../context/DarkModeContext';
import { useAuth } from '../context/AuthContext';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { user, logout } = useAuth();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const getActiveClass = (path: string) => {
    return isActive(path) ? 'sidebar-item-active' : 'sidebar-item';
  };

  // Enhanced event handlers to prevent any cursor issues
  const handleLinkInteraction = (e: React.MouseEvent | React.KeyboardEvent | React.FocusEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'focus') {
      (e.target as HTMLElement).blur();
    }
    // Force remove any cursor that might appear
    const target = e.target as HTMLElement;
    target.style.caretColor = 'transparent';
  };

  return (
    <div className="w-64 bg-white dark:bg-dark-900 shadow-2xl dark:shadow-glow h-screen fixed left-0 top-0 z-10 border-r border-gray-200 dark:border-dark-700">
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-primary-600 dark:text-primary-400">Threatly</h1>
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg bg-gray-100 dark:bg-dark-800 hover:bg-gray-200 dark:hover:bg-dark-700 transition-all duration-200 focus:outline-none"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? (
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
        </div>

        {/* User Info */}
        {user && (
          <div className="mb-6 p-3 bg-gray-50 dark:bg-dark-800 rounded-lg">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center">
                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                  {user.firstName?.[0] || user.email[0].toUpperCase()}
                </span>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
                </p>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    user.plan === 'premium' 
                      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                  }`}>
                    {user.plan}
                  </span>
                  {user.role === 'admin' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                      admin
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              className="mt-2 w-full text-left text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Sign out
            </button>
          </div>
        )}
        
        <nav className="space-y-2">
          {/* Dashboard Page */}
          <Link
            to="/dashboard"
            className={`${getActiveClass('/dashboard')} focus:outline-none select-none cursor-pointer`}
            tabIndex={-1}
            draggable={false}
            contentEditable={false}
            spellCheck={false}
            onMouseDown={handleLinkInteraction}
            onFocus={handleLinkInteraction}
            onKeyDown={handleLinkInteraction}
            onContextMenu={(e) => e.preventDefault()}
            style={{ 
              userSelect: 'none', 
              WebkitUserSelect: 'none', 
              MozUserSelect: 'none', 
              msUserSelect: 'none',
              caretColor: 'transparent',
              cursor: 'pointer'
            }}
          >
            <svg className="w-5 h-5 mr-3 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2zm0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Dashboard</span>
          </Link>

          {/* All Articles */}
          <Link
            to="/articles"
            className={`${getActiveClass('/articles')} focus:outline-none select-none cursor-pointer`}
            tabIndex={-1}
            draggable={false}
            contentEditable={false}
            spellCheck={false}
            onMouseDown={handleLinkInteraction}
            onFocus={handleLinkInteraction}
            onKeyDown={handleLinkInteraction}
            onContextMenu={(e) => e.preventDefault()}
            style={{ 
              userSelect: 'none', 
              WebkitUserSelect: 'none', 
              MozUserSelect: 'none', 
              msUserSelect: 'none',
              caretColor: 'transparent',
              cursor: 'pointer'
            }}
          >
            <svg className="w-5 h-5 mr-3 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>All Articles</span>
          </Link>

          {/* Alerts - Premium users only */}
          {user && (user.plan === 'premium' || user.role === 'admin') && (
            <Link
              to="/alerts"
              className={`${getActiveClass('/alerts')} focus:outline-none select-none cursor-pointer`}
              tabIndex={-1}
              draggable={false}
              contentEditable={false}
              spellCheck={false}
              onMouseDown={handleLinkInteraction}
              onFocus={handleLinkInteraction}
              onKeyDown={handleLinkInteraction}
              onContextMenu={(e) => e.preventDefault()}
              style={{ 
                userSelect: 'none', 
                WebkitUserSelect: 'none', 
                MozUserSelect: 'none', 
                msUserSelect: 'none',
                caretColor: 'transparent',
                cursor: 'pointer'
              }}
            >
              <svg className="w-5 h-5 mr-3 text-orange-500 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Alerts</span>
            </Link>
          )}

          {/* Keywords - Premium users only */}
          {user && (user.plan === 'premium' || user.role === 'admin') && (
            <Link
              to="/keywords"
              className={`${getActiveClass('/keywords')} focus:outline-none select-none cursor-pointer`}
              tabIndex={-1}
              draggable={false}
              contentEditable={false}
              spellCheck={false}
              onMouseDown={handleLinkInteraction}
              onFocus={handleLinkInteraction}
              onKeyDown={handleLinkInteraction}
              onContextMenu={(e) => e.preventDefault()}
              style={{ 
                userSelect: 'none', 
                WebkitUserSelect: 'none', 
                MozUserSelect: 'none', 
                msUserSelect: 'none',
                caretColor: 'transparent',
                cursor: 'pointer'
              }}
            >
              <svg className="w-5 h-5 mr-3 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span>Keywords</span>
            </Link>
          )}

          {/* Sources - Admin only */}
          {user && user.role === 'admin' && (
            <Link
              to="/sources"
              className={`${getActiveClass('/sources')} focus:outline-none select-none cursor-pointer`}
              tabIndex={-1}
              draggable={false}
              contentEditable={false}
              spellCheck={false}
              onMouseDown={handleLinkInteraction}
              onFocus={handleLinkInteraction}
              onKeyDown={handleLinkInteraction}
              onContextMenu={(e) => e.preventDefault()}
              style={{ 
                userSelect: 'none', 
                WebkitUserSelect: 'none', 
                MozUserSelect: 'none', 
                msUserSelect: 'none',
                caretColor: 'transparent',
                cursor: 'pointer'
              }}
            >
              <svg className="w-5 h-5 mr-3 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
              <span>Sources</span>
            </Link>
          )}

          {/* Statistics - Admin only */}
          {user && user.role === 'admin' && (
            <Link
              to="/statistics"
              className={`${getActiveClass('/statistics')} focus:outline-none select-none cursor-pointer`}
              tabIndex={-1}
              draggable={false}
              contentEditable={false}
              spellCheck={false}
              onMouseDown={handleLinkInteraction}
              onFocus={handleLinkInteraction}
              onKeyDown={handleLinkInteraction}
              onContextMenu={(e) => e.preventDefault()}
              style={{ 
                userSelect: 'none', 
                WebkitUserSelect: 'none', 
                MozUserSelect: 'none', 
                msUserSelect: 'none',
                caretColor: 'transparent',
                cursor: 'pointer'
              }}
            >
              <svg className="w-5 h-5 mr-3 text-purple-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2zm0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Statistics</span>
            </Link>
          )}

          {/* Spam tab - Admin only */}
          {user && user.role === 'admin' && (
            <Link
              to="/spam"
              className={`${getActiveClass('/spam')} focus:outline-none select-none cursor-pointer`}
              tabIndex={-1}
              draggable={false}
              contentEditable={false}
              spellCheck={false}
              onMouseDown={handleLinkInteraction}
              onFocus={handleLinkInteraction}
              onKeyDown={handleLinkInteraction}
              onContextMenu={(e) => e.preventDefault()}
              style={{ 
                userSelect: 'none', 
                WebkitUserSelect: 'none', 
                MozUserSelect: 'none', 
                msUserSelect: 'none',
                caretColor: 'transparent',
                cursor: 'pointer'
              }}
            >
              <svg className="w-5 h-5 mr-3 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>Spam</span>
            </Link>
          )}

          {/* Admin Section */}
          {user && user.role === 'admin' && (
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-dark-700">
              <Link
                to="/admin/users"
                className={`${getActiveClass('/admin/users')} focus:outline-none select-none cursor-pointer`}
                tabIndex={-1}
                draggable={false}
                contentEditable={false}
                spellCheck={false}
                onMouseDown={handleLinkInteraction}
                onFocus={handleLinkInteraction}
                onKeyDown={handleLinkInteraction}
                onContextMenu={(e) => e.preventDefault()}
                style={{ 
                  userSelect: 'none', 
                  WebkitUserSelect: 'none', 
                  MozUserSelect: 'none', 
                  msUserSelect: 'none',
                  caretColor: 'transparent',
                  cursor: 'pointer'
                }}
              >
                <svg className="w-5 h-5 mr-3 text-purple-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <span>User Management</span>
              </Link>
            </div>
          )}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;
